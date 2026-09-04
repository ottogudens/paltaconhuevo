import React, { useState, useCallback, useMemo } from 'react';
import { 
  ReactFlow, 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  Handle, 
  Position,
  useReactFlow,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { MessageSquare, Image as ImageIcon, Link2, Hand, Bot, Phone, Trash2 } from 'lucide-react';

// === Custom Nodes ===
const NodeHeader = ({ title, icon: Icon, color, id }) => {
  const { setNodes, setEdges } = useReactFlow();
  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };
  return (
    <div className={`flex items-center justify-between p-3 border-b rounded-t-xl font-bold bg-${color}-50 border-${color}-100 text-${color}-800`}>
      <div className="flex items-center gap-2"><Icon className={`w-4 h-4 text-${color}-600`} /> {title}</div>
      <button onClick={onDelete} className="text-gray-400 hover:text-red-500 nodrag"><Trash2 className="w-4 h-4"/></button>
    </div>
  );
};

// 1. Text Node
const TextNode = ({ id, data }) => {
  const { updateNodeData } = useReactFlow();
  return (
    <div className="bg-white rounded-xl shadow-md border-2 border-blue-500 w-64 text-sm group hover:shadow-lg transition-all">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />
      <NodeHeader title="Mensaje de Texto" icon={MessageSquare} color="blue" id={id} />
      <div className="p-3">
        <textarea 
          className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 focus:ring-2 focus:ring-blue-500 resize-none nodrag" 
          value={data.label || ''} 
          rows={3}
          onChange={(e) => updateNodeData(id, { label: e.target.value })}
          placeholder="Escribe el mensaje aquí..."
        />
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
    </div>
  );
};

// 2. Image Node
const ImageNode = ({ id, data }) => {
  const { updateNodeData } = useReactFlow();
  return (
    <div className="bg-white rounded-xl shadow-md border-2 border-purple-500 w-64 text-sm group hover:shadow-lg transition-all">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-500" />
      <NodeHeader title="Archivo Multimedia" icon={ImageIcon} color="purple" id={id} />
      <div className="p-3 space-y-2">
        <input 
          className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 focus:ring-2 focus:ring-purple-500 nodrag" 
          value={data.url || ''} 
          onChange={(e) => updateNodeData(id, { url: e.target.value })}
          placeholder="https://ejemplo.com/imagen.png"
        />
        <input 
          className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 focus:ring-2 focus:ring-purple-500 nodrag" 
          value={data.caption || ''} 
          onChange={(e) => updateNodeData(id, { caption: e.target.value })}
          placeholder="Pie de foto (opcional)"
        />
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-purple-500" />
    </div>
  );
};

// 3. Condition Node
const ConditionNode = ({ id, data }) => {
  const { updateNodeData } = useReactFlow();
  return (
    <div className="bg-white rounded-xl shadow-md border-2 border-yellow-500 w-64 text-sm group hover:shadow-lg transition-all">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-yellow-500" />
      <NodeHeader title="Pausa / Condición" icon={Hand} color="yellow" id={id} />
      <div className="p-3">
        <p className="text-xs text-gray-500 mb-2">Se detendrá aquí hasta que el usuario envíe las palabras exactas.</p>
        <input 
          className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 focus:ring-2 focus:ring-yellow-500 nodrag" 
          value={data.expected || ''} 
          onChange={(e) => updateNodeData(id, { expected: e.target.value })}
          placeholder="Input esperado (ej: 'si', '1')"
        />
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-yellow-500" />
    </div>
  );
};

// 4. Action Node
const ActionNode = ({ id, data }) => {
  const { updateNodeData } = useReactFlow();
  return (
    <div className="bg-white rounded-xl shadow-md border-2 border-red-500 w-64 text-sm group hover:shadow-lg transition-all">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-red-500" />
      <NodeHeader title="Acción Especial" icon={Bot} color="red" id={id} />
      <div className="p-3">
        <select 
          className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 focus:ring-2 focus:ring-red-500 nodrag"
          value={data.actionType || 'human'}
          onChange={(e) => updateNodeData(id, { actionType: e.target.value })}
        >
           <option value="human">Derivar a Humano</option>
           <option value="ai">Derivar a Agente IA (Paltín)</option>
           <option value="webhook">Ejecutar Webhook (API)</option>
           <option value="internal_order">Crear Pedido Nuevo (App)</option>
           <option value="internal_points">Envío de Puntos (Loyalty)</option>
        </select>
        {data.actionType === 'webhook' && (
          <input 
            className="w-full mt-2 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 focus:ring-2 focus:ring-red-500 nodrag" 
            value={data.webhookUrl || ''} 
            onChange={(e) => updateNodeData(id, { webhookUrl: e.target.value })}
            placeholder="URL del Webhook (ej. n8n)"
          />
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-red-500" />
    </div>
  );
};


// Mover nodeTypes AFUERA del componente para evitar re-montajes.
const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  condition: ConditionNode,
  action: ActionNode
};

// === Main Component ===

const initialNodes = [
  { id: 'start', type: 'input', position: { x: 250, y: 50 }, data: { label: 'Disparador (Trigger)' }, style: { border: '2px solid #22c55e', backgroundColor: '#ecfdf5', fontWeight: 'bold' } }
];
const initialEdges = [];

let idCtr = 1;
const getId = () => `node_${idCtr++}`;

function FlowCanvasCore({ initialNodesData, initialEdgesData, onSave, onCancel }) {
  const safeNodes = (initialNodesData && initialNodesData.length > 0) ? initialNodesData : initialNodes;
  const safeEdges = (initialEdgesData && initialEdgesData.length > 0) ? initialEdgesData : initialEdges;
  
  const [nodes, setNodes, onNodesChange] = useNodesState(safeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(safeEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { strokeWidth: 2 } }, eds)),
    [setEdges],
  );

  const addSpecificNode = (typeStr, labelText) => {
    const newNode = {
      id: getId(),
      type: typeStr,
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: { label: labelText, url: '', caption: '', expected: '', actionType: 'human', webhookUrl: '' },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  return (
    <div className="flex flex-col h-[85vh] bg-gray-50 relative rounded-xl border border-gray-200 shadow-inner overflow-hidden">
      {/* Top Bar / Actions */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button onClick={() => addSpecificNode('text', 'Hola!')} className="px-3 py-2 bg-white border border-gray-200 rounded shadow hover:bg-gray-50 flex items-center gap-1 text-sm font-semibold">
           <MessageSquare className="w-4 h-4 text-blue-500" /> Añadir Texto
        </button>
        <button onClick={() => addSpecificNode('image', '')} className="px-3 py-2 bg-white border border-gray-200 rounded shadow hover:bg-gray-50 flex items-center gap-1 text-sm font-semibold">
           <ImageIcon className="w-4 h-4 text-purple-500" /> Añadir Imagen
        </button>
        <button onClick={() => addSpecificNode('condition', '')} className="px-3 py-2 bg-white border border-gray-200 rounded shadow hover:bg-gray-50 flex items-center gap-1 text-sm font-semibold">
           <Hand className="w-4 h-4 text-yellow-500" /> Añadir Condición
        </button>
        <button onClick={() => addSpecificNode('action', '')} className="px-3 py-2 bg-white border border-gray-200 rounded shadow hover:bg-gray-50 flex items-center gap-1 text-sm font-semibold">
           <Bot className="w-4 h-4 text-red-500" /> Añadir Acción (Salida)
        </button>
      </div>

      <div className="absolute top-4 right-4 z-10 flex gap-2">
         <button onClick={onCancel} className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded shadow hover:bg-gray-100 font-bold text-sm">
            Cancelar
         </button>
         <button 
           onClick={() => onSave(nodes, edges)} 
           className="px-4 py-2 bg-palta-600 text-white rounded shadow hover:bg-palta-700 font-bold text-sm"
         >
            Guardar Flujo
         </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="w-full h-full"
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}

export default function FlowCanvas(props) {
  return (
    <ReactFlowProvider>
      <FlowCanvasCore {...props} />
    </ReactFlowProvider>
  );
}
