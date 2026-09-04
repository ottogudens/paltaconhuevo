import React, { useState, useEffect, useRef } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { MessageSquare, RefreshCw, Smartphone, LogOut, CheckCircle2, Settings, UserCheck, Send, Bot, AlertCircle, Phone, Info, Save, Copy, Check, QrCode, Hash } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { io } from 'socket.io-client'

const WA_API_URL = import.meta.env.VITE_WA_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001/api/wa' : 'https://whatsapp-agent-production-5d48.up.railway.app/api/wa')

export default function WhatsAppPage() {
  const [status, setStatus] = useState({ connected: false, has_qr: false })
  const [loading, setLoading] = useState(true)
  const socketRef = useRef(null)

  // Tabs
  const [activeTab, setActiveTab] = useState('chats')

  // Live Chats
  const [chats, setChats] = useState([])
  const [selectedChatPhone, setSelectedChatPhone] = useState(null)
  const [currentChatData, setCurrentChatData] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  // Configuración del agente
  const [agentConfig, setAgentConfig] = useState({ name: 'Paltín', api_key: '', whatsapp_connected_phone: '', enable_sales: true, enable_loyalty: true })
  const [savingConfig, setSavingConfig] = useState(false)

  // Flujos Automatizados
  const [flows, setFlows] = useState([])
  const [showFlowModal, setShowFlowModal] = useState(false)
  const [editingFlow, setEditingFlow] = useState(null)

  // QR / Vinculación
  const [qr, setQr] = useState(null)
  const [pairingMethod, setPairingMethod] = useState('qr')
  const [pairingCode, setPairingCode] = useState(null)
  const [phoneToPair, setPhoneToPair] = useState('')
  const [requestingCode, setRequestingCode] = useState(false)
  const [codeError, setCodeError] = useState(null)
  const [codeCopied, setCodeCopied] = useState(false)


  // Cargar estado de WA
  const fetchStatus = async () => {
    try {
      const res = await fetch(`${WA_API_URL}/status`)
      const data = await res.json()
      setStatus(data)

      // Obtener QR si está disponible
      if (data.has_qr && !data.connected) {
        try {
          const baseUrl = WA_API_URL.replace('/api/wa', '')
          const qrRes = await fetch(`${baseUrl}/api/wa/qr`)
          const qrData = await qrRes.json()
          if (qrData.qr) setQr(qrData.qr)
        } catch (e) {
          console.error('Error fetching QR:', e)
        }
      }

      if (data.connected) {
        setQr(null)
        setPairingCode(null)
      }
    } catch (e) {
      console.error('Error fetching WA status:', e)
    } finally {
      setLoading(false)
    }
  }

  // Cargar lista de chats
  const fetchChats = async () => {
    try {
      const res = await fetch(`${WA_API_URL}/chats`)
      const data = await res.json()
      setChats(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Error fetching chats:', e)
    }
  }

  // Cargar mensajes del chat seleccionado
  const fetchChatMessages = async (phone) => {
    if (!phone) return
    try {
      const res = await fetch(`${WA_API_URL}/chats/${phone}/messages`)
      const data = await res.json()
      setCurrentChatData(data)
    } catch (e) {
      console.error('Error fetching chat messages:', e)
    }
  }

  // Cargar configuración del agente
  const fetchAgentConfig = async () => {
    try {
      const res = await api.get('/marketing/agent-config/')
      setAgentConfig(prev => ({ ...prev, ...res.data }))
    } catch (e) {
      console.error('Error fetching agent config:', e)
    }
  }

  // Cargar flujos automatizados
  const fetchFlows = async () => {
    try {
      const res = await api.get('/marketing/flows/')
      setFlows(res.data.results || res.data)
    } catch (e) {
      console.error('Error fetching flows:', e)
    }
  }

  // Guardar configuración del agente
  const handleSaveConfig = async (e) => {
    e.preventDefault()
    setSavingConfig(true)
    try {
      await api.patch('/marketing/agent-config/', agentConfig)
      alert('✅ Configuración guardada correctamente.')
    } catch (e) {
      alert('Error al guardar configuración: ' + (e.userMessage || e.message))
    } finally {
      setSavingConfig(false)
    }
  }

  // Desconectar WhatsApp
  const handleLogout = async () => {
    if (!confirm('¿Estás seguro de que deseas desvincular la cuenta de WhatsApp?')) return
    try {
      const baseUrl = WA_API_URL.replace('/api/wa', '')
      await fetch(`${baseUrl}/api/wa/logout`, { method: 'POST' })
      setStatus({ connected: false, has_qr: false })
      setQr(null)
      setPairingCode(null)
      fetchStatus()
    } catch (e) {
      alert('Error al desvincular: ' + e.message)
    }
  }

  // Solicitar código de vinculación por número
  const handleRequestPairingCode = async (e) => {
    e.preventDefault()
    setRequestingCode(true)
    setCodeError(null)
    try {
      const baseUrl = WA_API_URL.replace('/api/wa', '')
      const res = await fetch(`${baseUrl}/api/wa/pairing-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneToPair })
      })
      const data = await res.json()
      if (!res.ok) {
        setCodeError(data.error || 'Error al solicitar el código.')
      } else {
        setPairingCode(data.code)
      }
    } catch (e) {
      setCodeError('No se pudo conectar con el agente de WhatsApp.')
    } finally {
      setRequestingCode(false)
    }
  }

  // Copiar código al portapapeles
  const handleCopyCode = async () => {
    if (!pairingCode) return
    try {
      await navigator.clipboard.writeText(pairingCode)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    } catch (e) {
      console.error('Error copiando código:', e)
    }
  }


  useEffect(() => {
    fetchStatus()
    fetchChats()
    fetchAgentConfig()
    fetchFlows()

    // Setup WebSocket
    const socketUrl = WA_API_URL.replace('/api/wa', '')
    socketRef.current = io(socketUrl)

    socketRef.current.on('connect', () => {
      console.log('✅ Conectado al WebSocket del agente WA')
    })

    socketRef.current.on('status_updated', () => {
      fetchStatus()
    })

    socketRef.current.on('chats_updated', () => {
      fetchChats()
    })

    return () => {
      if (socketRef.current) socketRef.current.disconnect()
    }
  }, [])

  useEffect(() => {
    if (selectedChatPhone) {
      fetchChatMessages(selectedChatPhone)
      
      const handleChatMessage = (data) => {
        if (data.phone === selectedChatPhone) {
          fetchChatMessages(selectedChatPhone)
        }
      }

      socketRef.current?.on('chat_message', handleChatMessage)
      socketRef.current?.on('chat_updated', handleChatMessage)

      return () => {
        socketRef.current?.off('chat_message', handleChatMessage)
        socketRef.current?.off('chat_updated', handleChatMessage)
      }
    }
  }, [selectedChatPhone])


  const handleSendReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim() || !selectedChatPhone) return
    setSendingReply(true)
    try {
      await fetch(`${WA_API_URL}/chats/${selectedChatPhone}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText })
      })
      setReplyText('')
      fetchChatMessages(selectedChatPhone)
      fetchChats()
    } catch (e) {
      alert('Error al enviar respuesta')
    } finally { setSendingReply(false) }
  }

  const handleToggleHumanMode = async (phone, currentHumanMode) => {
    try {
      await fetch(`${WA_API_URL}/chats/${phone}/toggle-human`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHumanMode: !currentHumanMode })
      })
      fetchChatMessages(phone)
      fetchChats()
    } catch (e) { console.error(e) }
  }




  return (
    <AdminLayout>
      <div className="space-y-6">
        
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-7 h-7 text-green-500" />
              WhatsApp Bot & Soporte
            </h1>
            <p className="text-gray-500 text-sm mt-1">Administra el agente de IA, configura prompts y atiende mensajes derivados en tiempo real.</p>
          </div>
          
          <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <button
              onClick={() => setActiveTab('chats')}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'chats' ? 'bg-palta-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <MessageSquare className="w-4 h-4" /> Chats en Vivo
              {chats.some(c => c.pendingHuman) && (
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('flows')}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'flows' ? 'bg-palta-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Bot className="w-4 h-4" /> Flujos y Tareas
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'config' ? 'bg-palta-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Settings className="w-4 h-4" /> Configuración Agente IA
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'qr' ? 'bg-palta-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Smartphone className="w-4 h-4" /> Vinculación
            </button>
          </div>
        </div>

        {/* TAB 1: CHATS EN VIVO Y DERIVACIÓN A HUMANO */}
        {activeTab === 'chats' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-3 min-h-[550px] overflow-hidden">
            
            {/* Lista de Chats */}
            <div className="border-r border-gray-100 flex flex-col">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-800 text-sm">Conversaciones ({chats.length})</h3>
                <button onClick={fetchChats} className="p-1 text-gray-400 hover:text-palta-600"><RefreshCw className="w-4 h-4" /></button>
              </div>
              <div className="divide-y divide-gray-100 overflow-y-auto max-h-[500px] flex-1">
                {chats.length === 0 ? (
                  <p className="p-6 text-center text-sm text-gray-400">No hay chats activos</p>
                ) : (
                  chats.map(chat => (
                    <div
                      key={chat.phone}
                      onClick={() => setSelectedChatPhone(chat.phone)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-start justify-between ${selectedChatPhone === chat.phone ? 'bg-palta-50 border-l-4 border-palta-600' : ''}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900">{chat.name}</span>
                          {chat.pendingHuman && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold animate-pulse">
                              Derivado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{chat.phone}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${chat.isHumanMode ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                          {chat.isHumanMode ? 'Humano' : 'IA (Paltín)'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Ventana de Chat */}
            <div className="col-span-2 flex flex-col bg-gray-50/50">
              {selectedChatPhone && currentChatData ? (
                <>
                  {/* Header Chat */}
                  <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between shadow-2xs">
                    <div>
                      <h3 className="font-bold text-gray-900">{currentChatData.name}</h3>
                      <p className="text-xs text-gray-400">{currentChatData.phone}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleHumanMode(currentChatData.phone, currentChatData.isHumanMode)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${currentChatData.isHumanMode ? 'bg-palta-100 text-palta-700 hover:bg-palta-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-2xs'}`}
                      >
                        {currentChatData.isHumanMode ? <Bot className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        {currentChatData.isHumanMode ? 'Devolver a IA (Paltín)' : 'Tomar Control Humano'}
                      </button>
                    </div>
                  </div>

                  {/* Mensajes */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[420px]">
                    {currentChatData.messages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${m.sender === 'customer' ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.sender === 'customer' ? 'bg-white text-gray-800 shadow-2xs border border-gray-100 rounded-tl-none' : m.sender === 'operator' ? 'bg-blue-600 text-white shadow-2xs rounded-tr-none' : 'bg-palta-600 text-white shadow-2xs rounded-tr-none'}`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                          <span className={`text-[10px] block mt-1 text-right ${m.sender === 'customer' ? 'text-gray-400' : 'text-white/70'}`}>
                            {m.sender === 'customer' ? 'Cliente' : m.sender === 'operator' ? 'Operador' : 'Paltín IA'} • {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input Respuesta */}
                  <form onSubmit={handleSendReply} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Escribe un mensaje (asumes el control manual)..."
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-palta-500"
                    />
                    <button
                      type="submit"
                      disabled={sendingReply}
                      className="px-4 py-2 bg-palta-600 hover:bg-palta-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-1.5 shadow"
                    >
                      <Send className="w-4 h-4" /> Enviar
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                  <MessageSquare className="w-12 h-12 stroke-1 mb-2 text-gray-300" />
                  <p className="text-sm">Selecciona una conversación a la izquierda para ver los mensajes o responder.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CONFIGURACIÓN DEL AGENTE */}
        {activeTab === 'config' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <Bot className="w-5 h-5 text-palta-600" /> Personalidad y Reglas de la IA
            </h2>

            <form onSubmit={handleSaveConfig} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Asistente</label>
                <input
                  type="text"
                  value={agentConfig.name}
                  onChange={e => setAgentConfig({ ...agentConfig, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor de Inteligencia Artificial (LLM)</label>
                <select
                  value="claude"
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500 bg-gray-100 font-medium text-gray-800 cursor-not-allowed"
                >
                  <option value="claude">Claude 3.5 Sonnet (Anthropic) - Recomendado</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Actualmente el agente opera exclusivamente con Claude 3.5 Sonnet.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clave de API (API Key)</label>
                <input
                  type="password"
                  value={agentConfig.api_key || ''}
                  onChange={e => setAgentConfig({ ...agentConfig, api_key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500 font-mono"
                  placeholder="sk-ant-... o sk-... (Deja en blanco si usas las credenciales por defecto)"
                />
                <p className="text-xs text-gray-400 mt-1">Si ingresas una clave aquí, el sistema utilizará tu propia cuenta del proveedor seleccionado.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de WhatsApp Vinculado (Predeterminado)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={agentConfig.whatsapp_connected_phone || ''}
                    onChange={e => setAgentConfig({ ...agentConfig, whatsapp_connected_phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500"
                    placeholder="+56912345678 (Número oficial de tu tienda)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Ventas Automáticas</h3>
                    <p className="text-xs text-gray-500 mt-1">Permite a la IA agregar productos y confirmar carritos.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={agentConfig.enable_sales ?? true} onChange={e => setAgentConfig({...agentConfig, enable_sales: e.target.checked})} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-palta-600"></div>
                  </label>
                </div>
                
                <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Fidelización (Paltapuntos)</h3>
                    <p className="text-xs text-gray-500 mt-1">Permite consultar y notificar puntos al cliente.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={agentConfig.enable_loyalty ?? true} onChange={e => setAgentConfig({...agentConfig, enable_loyalty: e.target.checked})} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-palta-600"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-6 py-2.5 bg-palta-600 hover:bg-palta-700 text-white font-bold rounded-lg transition-colors text-sm shadow flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {savingConfig ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: FLUJOS AUTOMATIZADOS */}
        {activeTab === 'flows' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center justify-between">
              <span className="flex items-center gap-2"><Bot className="w-5 h-5 text-palta-600" /> Flujos Estructurados</span>
              <button 
                onClick={() => { setEditingFlow(null); setShowFlowModal(true); }}
                className="px-4 py-2 bg-palta-600 hover:bg-palta-700 text-white font-bold rounded-lg text-sm shadow flex items-center gap-2"
              >
                + Nuevo Flujo
              </button>
            </h2>
            <div className="text-sm text-gray-500 mb-4">
              Crea flujos automáticos interceptando palabras clave específicas. Si el usuario escribe la palabra clave, el bot responderá inmediatamente con el texto fijo, sin consumir llamadas a la IA.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {flows.length === 0 ? (
                <p className="text-sm text-gray-400 p-4 border border-gray-100 rounded-xl bg-gray-50 col-span-2 text-center">No hay flujos configurados aún.</p>
              ) : flows.map(f => (
                <div key={f.id} className="p-4 border border-gray-200 rounded-xl flex flex-col gap-2 relative group hover:border-palta-300">
                  <div className="flex justify-between items-start">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-bold font-mono truncate max-w-[70%]">
                      Palabra: {f.trigger_keyword}
                    </span>
                    <div className="flex gap-2">
                       <span className={`w-3 h-3 rounded-full ${f.is_active ? 'bg-green-500' : 'bg-red-500'}`} title={f.is_active ? 'Activo' : 'Inactivo'} />
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{f.response_text}</p>
                  <button 
                    onClick={() => { setEditingFlow(f); setShowFlowModal(true); }}
                    className="mt-2 w-full py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors"
                  >
                    Editar
                  </button>
                </div>
              ))}
            </div>
            
            {showFlowModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl relative flex flex-col gap-4">
                  <h3 className="font-bold text-lg text-gray-800">{editingFlow ? 'Editar Flujo' : 'Nuevo Flujo'}</h3>
                  <form onSubmit={async (e) => {
                      e.preventDefault();
                      const payload = {
                        trigger_keyword: e.target.trigger_keyword.value,
                        response_text: e.target.response_text.value,
                        is_active: e.target.is_active.checked
                      };
                      try {
                        if (editingFlow) {
                          await api.put(`/marketing/flows/${editingFlow.id}/`, payload);
                        } else {
                          await api.post('/marketing/flows/', payload);
                        }
                        setShowFlowModal(false);
                        fetchFlows();
                      } catch (err) {
                        alert('Error guardando flujo');
                      }
                  }}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Palabra Clave (Trigger)</label>
                        <input name="trigger_keyword" defaultValue={editingFlow?.trigger_keyword} required className="w-full border border-gray-300 focus:ring-2 focus:ring-palta-500 rounded-lg p-2.5 text-sm" placeholder="Ej: horario, ubicacion, hola" />
                        <p className="text-xs text-gray-400 mt-1">Si el cliente incluye esta palabra en su mensaje, se activará el flujo.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Respuesta Fija</label>
                        <textarea name="response_text" defaultValue={editingFlow?.response_text} required rows={3} className="w-full border border-gray-300 focus:ring-2 focus:ring-palta-500 rounded-lg p-2.5 text-sm" placeholder="Mensaje que enviará el bot automáticamente"/>
                      </div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                        <input type="checkbox" name="is_active" defaultChecked={editingFlow ? editingFlow.is_active : true} className="rounded text-palta-600 focus:ring-palta-500 w-4 h-4"/>
                        Flujo Activo
                      </label>
                      <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                         <button type="button" onClick={() => setShowFlowModal(false)} className="px-5 py-2.5 bg-gray-100 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-200 transition-colors">Cancelar</button>
                         <button type="submit" className="px-5 py-2.5 bg-palta-600 text-white rounded-lg text-sm font-bold hover:bg-palta-700 transition-colors shadow">Guardar</button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VINCULACIÓN WHATSAPP (QR O NÚMERO TELEFÓNICO) */}
        {activeTab === 'qr' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            
            {!status.connected && (
              <div className="flex border-b border-gray-100 bg-gray-50/50 p-2 gap-2 justify-center">
                <button
                  onClick={() => setPairingMethod('qr')}
                  className={`px-5 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all flex items-center gap-2 ${pairingMethod === 'qr' ? 'bg-white text-palta-700 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <QrCode className="w-4 h-4 text-palta-600" /> Escanear Código QR
                </button>
                <button
                  onClick={() => setPairingMethod('phone')}
                  className={`px-5 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all flex items-center gap-2 ${pairingMethod === 'phone' ? 'bg-white text-palta-700 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Phone className="w-4 h-4 text-palta-600" /> Número de Teléfono (Código)
                </button>
              </div>
            )}

            <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
              
              {loading && !qr && !status.connected ? (
                <div className="flex flex-col items-center">
                  <RefreshCw className="w-8 h-8 text-palta-500 animate-spin mb-4" />
                  <p className="text-gray-500">Conectando con el agente...</p>
                </div>
              ) : status.connected ? (
                <div className="flex flex-col items-center text-center max-w-md">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">¡WhatsApp Conectado!</h2>
                  <p className="text-gray-600 mb-8">La cuenta se encuentra vinculada correctamente.</p>
                  <button onClick={handleLogout}
                    className="px-6 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 font-medium rounded-lg transition-colors flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> Desvincular Cuenta
                  </button>
                </div>
              ) : pairingMethod === 'phone' ? (
                <div className="max-w-md w-full space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-palta-100 text-palta-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Hash className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Vincular por Número Telefónico</h2>
                    <p className="text-sm text-gray-500">
                      Ingresa tu número de WhatsApp para recibir un código de 8 dígitos e ingresarlo en tu teléfono.
                    </p>
                  </div>

                  {!pairingCode ? (
                    <form onSubmit={handleRequestPairingCode} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Número de Teléfono (con código de país)
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={phoneToPair}
                            onChange={e => setPhoneToPair(e.target.value)}
                            placeholder="Ej: +56912345678"
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-palta-500 font-mono"
                            required
                          />
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">
                          Ejemplo para Chile: +56912345678 o 56912345678
                        </p>
                      </div>

                      {codeError && (
                        <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-center gap-2 border border-red-100">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{codeError}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={requestingCode}
                        className="w-full py-3 bg-palta-600 hover:bg-palta-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {requestingCode ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> Solicitando Código...
                          </>
                        ) : (
                          'Obtener Código de Vinculación'
                        )}
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-6 text-center">
                      <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl">
                        <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-2">
                          Tu Código de Vinculación
                        </p>
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-3xl md:text-4xl font-extrabold tracking-widest text-emerald-950 font-mono bg-white px-5 py-3 rounded-xl border border-emerald-200 shadow-inner">
                            {pairingCode}
                          </span>
                          <button
                            onClick={handleCopyCode}
                            className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow transition-colors flex items-center justify-center"
                            title="Copiar código"
                          >
                            {codeCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                          </button>
                        </div>
                        {codeCopied && (
                          <p className="text-xs text-emerald-700 font-medium mt-2">¡Código copiado al portapapeles!</p>
                        )}
                      </div>

                      <div className="bg-gray-50 p-4 rounded-xl text-left border border-gray-200 text-xs text-gray-700 space-y-2">
                        <p className="font-bold text-gray-900">Pasos en tu teléfono:</p>
                        <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                          <li>Abre <strong>WhatsApp</strong> en tu teléfono.</li>
                          <li>Ve a <strong>Menú (⋮)</strong> o <strong>Configuración</strong>.</li>
                          <li>Toca <strong>Dispositivos vinculados</strong> y luego <strong>Vincular un dispositivo</strong>.</li>
                          <li>En la pantalla del escáner, toca <strong>"Vincular con el número de teléfono"</strong> (al pie).</li>
                          <li>Ingresa el código <strong className="font-mono bg-yellow-100 px-1 py-0.5 rounded">{pairingCode}</strong>.</li>
                        </ol>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setPairingCode(null)}
                          className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-colors"
                        >
                          Solicitar con otro número
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : qr ? (
                <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 w-full max-w-2xl">
                  <div className="flex-1 text-center md:text-left space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm font-medium mb-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                      Esperando escaneo
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Escanea el código QR</h2>
                    <ol className="text-gray-600 space-y-3 text-sm text-left list-decimal list-inside">
                      <li>Abre WhatsApp en tu teléfono</li>
                      <li>Toca <strong>Menú</strong> o <strong>Configuración</strong></li>
                      <li>Selecciona <strong>Dispositivos vinculados</strong></li>
                      <li>Toca <strong>Vincular un dispositivo</strong></li>
                      <li>Apunta la cámara de tu teléfono a esta pantalla</li>
                    </ol>
                  </div>
                  <div className="bg-white p-4 rounded-xl border-2 border-gray-100 shadow-sm relative group">
                    <QRCodeSVG value={qr} size={256} level="H" includeMargin={true} />
                    <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={fetchStatus} className="bg-white p-2 rounded-full shadow-md text-gray-600 hover:text-palta-600">
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center max-w-md">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <Smartphone className="w-8 h-8 text-gray-400" />
                  </div>
                  <h2 className="text-xl font-medium text-gray-900 mb-2">Generando código QR...</h2>
                  <p className="text-gray-500 text-sm mb-4">
                    El agente está preparando el código para que lo escanees. Si no aparece en unos segundos, haz clic en el botón de abajo.
                  </p>
                  <RefreshCw className="w-6 h-6 text-palta-500 animate-spin mb-6" />

                  <button
                    onClick={fetchStatus}
                    className="px-5 py-2.5 bg-palta-600 hover:bg-palta-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> Forzar generación de nuevo QR
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
