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
  Position 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { MessageSquare, Image as ImageIcon, Link2, Hand, Bot, Phone, Trash2 } from 'lucide-react';

// === Custom Nodes ===

// 1. Text Node
const TextNode = ({ data }) => (
  <div className="bg-white rounded-xl shadow-md border-2 border-blue-500 w-64 text-sm group hover:shadow-lg transition-all">
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />
    <div className="flex items-center justify-between p-3 bg-blue-50 border-b border-blue-100 rounded-t-xl font-bold text-blue-800">
      <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-blue-600" /> Mensaje de Texto</div>
      {data.onDelete && <button onClick={() => data.onDelete(data.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>}
    </div>
    <div className="p-3">
      <textarea 
        className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 focus:ring-2 focus:ring-blue-500 resize-none nodrag" 
        value={data.label || ''} 
        rows={3}
        onChange={(e) => data.onChange(data.id, e.target.value)}
        placeholder="Escribe el mensaje aquí..."
      />
    </div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
  </div>
);

// 2. Image Node
const ImageNode = ({ data }) => (
  <div className="bg-white rounded-xl shadow-md border-2 border-purple-500 w-64 text-sm group hover:shadow-lg transition-all">
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-500" />
    <div className="flex items-center justify-between p-3 bg-purple-50 border-b border-purple-100 rounded-t-xl font-bold text-purple-800">
      <div className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-purple-600" /> Archivo Multimedia</div>
      {data.onDelete && <button onClick={() => data.onDelete(data.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>}
    </div>
    <div className="p-3 space-y-2">
      <input 
        className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 focus:ring-2 focus:ring-purple-500 nodrag" 
        value={data.url || ''} 
        onChange={(e) => data.onUrlChange(data.id, e.target.value)}
        placeholder="https://ejemplo.com/imagen.png"
      />
      <input 
        className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 focus:ring-2 focus:ring-purple-500 nodrag" 
        value={data.caption || ''} 
        onChange={(e) => data.onCaptionChange(data.id, e.target.value)}
        placeholder="Pie de foto (opcional)"
      />
    </div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-purple-500" />
  </div>
);

// 3. Condition Node (Wait for response)
const ConditionNode = ({ data }) => (
  <div className="bg-white rounded-xl shadow-md border-2 border-yellow-500 w-64 text-sm group hover:shadow-lg transition-all">
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-yellow-500" />
    <div className="flex items-center justify-between p-3 bg-yellow-50 border-b border-yellow-100 rounded-t-xl font-bold text-yellow-800">
      <div className="flex items-center gap-2"><Hand className="w-4 h-4 text-yellow-600" /> Pausa / Condición</div>
      {data.onDelete && <button onClick={() => data.onDelete(data.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>}
    </div>
    <div className="p-3">
      <p className="text-xs text-gray-500 mb-2">Se detendrá aquí hasta que el usuario envíe las palabras exactas.</p>
      <input 
        className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 focus:ring-2 focus:ring-yellow-500 nodrag" 
        value={data.expected || ''} 
        onChange={(e) => data.onExpectedChange(data.id, e.target.value)}
        placeholder="Input esperado (ej: 'si', '1')"
      />
    </div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-yellow-500" />
  </div>
);

// 4. Action Node (Handoff / API)
const ActionNode = ({ data }) => (
  <div className="bg-white rounded-xl shadow-md border-2 border-red-500 w-64 text-sm group hover:shadow-lg transition-all">
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-red-500" />
    <div className="flex items-center justify-between p-3 bg-red-50 border-b border-red-100 rounded-t-xl font-bold text-red-800">
      <div className="flex items-center gap-2"><Bot className="w-4 h-4 text-red-600" /> Acción Especial</div>
      {data.onDelete && <button onClick={() => data.onDelete(data.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>}
    </div>
    <div className="p-3">
      <select 
        className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 focus:ring-2 focus:ring-red-500 nodrag"
        value={data.actionType || 'human'}
        onChange={(e) => data.onActionChange(data.id, e.target.value)}
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
          onChange={(e) => data.onWebhookChange(data.id, e.target.value)}
          placeholder="URL del Webhook (ej. n8n)"
        />
      )}
    </div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-red-500" />
  </div>
);


// === Main Component ===

const initialNodes = [
  { id: 'start', type: 'input', position: { x: 250, y: 50 }, data: { label: 'Disparador (Trigger)' }, style: { border: '2px solid #22c55e', backgroundColor: '#ecfdf5', fontWeight: 'bold' } }
];
const initialEdges = [];

let idCtr = 1;
const getId = () => `node_${idCtr++}`;

export default function FlowCanvas({ initialNodesData, initialEdgesData, onSave, onCancel }) {
  const safeNodes = (initialNodesData && initialNodesData.length > 0) ? initialNodesData : initialNodes;
  const safeEdges = (initialEdgesData && initialEdgesData.length > 0) ? initialEdgesData : initialEdges;
  
  const [nodes, setNodes, onNodesChange] = useNodesState(safeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(safeEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { strokeWidth: 2 } }, eds)),
    [setEdges],
  );

  const onNodeDelete = useCallback((id) => {
    setNodes((nds) => nds.filter(node => node.id !== id));
    setEdges((eds) => eds.filter(edge => edge.source !== id && edge.target !== id));
  }, [setNodes, setEdges]);

  // Update handlers
  const onTextChange = (id, val) => {
    setNodes((nds) => nds.map(node => node.id === id ? { ...node, data: { ...node.data, label: val } } : node));
  };
  const onImagePropChange = (id, field, val) => {
    setNodes((nds) => nds.map(node => node.id === id ? { ...node, data: { ...node.data, [field]: val } } : node));
  };

  const nodeTypes = useMemo(() => ({
    text: (props) => <TextNode {...props} data={{ ...props.data, onChange: onTextChange, onDelete: onNodeDelete }} />,
    image: (props) => <ImageNode {...props} data={{ 
      ...props.data, 
      onUrlChange: (id, v) => onImagePropChange(id, 'url', v), 
      onCaptionChange: (id, v) => onImagePropChange(id, 'caption', v),
      onDelete: onNodeDelete
    }} />,
    condition: (props) => <ConditionNode {...props} data={{ ...props.data, onExpectedChange: (id, v) => onImagePropChange(id, 'expected', v), onDelete: onNodeDelete }} />,
    action: (props) => <ActionNode {...props} data={{ 
      ...props.data, 
      onActionChange: (id, v) => onImagePropChange(id, 'actionType', v),
      onWebhookChange: (id, v) => onImagePropChange(id, 'webhookUrl', v),
      onDelete: onNodeDelete
    }} />
  }), [setNodes, onNodeDelete]);

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
