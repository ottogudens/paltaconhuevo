import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { MessageSquare, RefreshCw, Smartphone, LogOut, CheckCircle2, Settings, UserCheck, Send, Bot, AlertCircle, Phone, Info, Save } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

const WA_API_URL = import.meta.env.VITE_WA_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001/api/wa' : 'https://whatsapp-agente-production-a1fc.up.railway.app/api/wa')

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState('chats') // 'chats', 'config', 'qr'
  const [status, setStatus] = useState({ connected: false, has_qr: false })
  const [qr, setQr] = useState(null)
  const [loading, setLoading] = useState(true)

  // Config del Agente
  const [agentConfig, setAgentConfig] = useState({ name: 'Paltín', system_prompt: '', additional_info: '', human_notification_phone: '' })
  const [savingConfig, setSavingConfig] = useState(false)

  // Live Chats
  const [chats, setChats] = useState([])
  const [selectedChatPhone, setSelectedChatPhone] = useState(null)
  const [currentChatData, setCurrentChatData] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  // Cargar estado de WA
  const fetchStatus = async () => {
    try {
      const res = await fetch(`${WA_API_URL}/status`)
      const data = await res.json()
      setStatus(data)

      if (data.has_qr && !data.connected) {
        const qrRes = await fetch(`${WA_API_URL}/qr`)
        const qrData = await qrRes.json()
        setQr(qrData.qr)
      } else {
        setQr(null)
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
      setChats(data)
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

  // Cargar Configuración del Agente desde Django
  const fetchAgentConfig = async () => {
    try {
      const res = await api.get('/marketing/agent-config/')
      setAgentConfig(res.data)
    } catch (e) {
      console.error('Error fetching agent config:', e)
    }
  }

  useEffect(() => {
    fetchStatus()
    fetchAgentConfig()
    fetchChats()

    const interval = setInterval(() => {
      fetchStatus()
      fetchChats()
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedChatPhone) {
      fetchChatMessages(selectedChatPhone)
      const interval = setInterval(() => fetchChatMessages(selectedChatPhone), 2500)
      return () => clearInterval(interval)
    }
  }, [selectedChatPhone])

  const handleSaveConfig = async (e) => {
    e.preventDefault()
    setSavingConfig(true)
    try {
      await api.post('/marketing/agent-config/', agentConfig)
      alert('Configuración del agente guardada correctamente')
    } catch (e) {
      alert('Error al guardar configuración')
    } finally { setSavingConfig(false) }
  }

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

  const handleLogout = async () => {
    if (!confirm('¿Seguro que deseas desvincular la cuenta actual de WhatsApp?')) return
    setLoading(true)
    try {
      await fetch(`${WA_API_URL}/logout`, { method: 'POST' })
      await fetchStatus()
    } catch (e) {
      alert('Error al desvincular WhatsApp')
    }
    setLoading(false)
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
          
          <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
            <button
              onClick={() => setActiveTab('chats')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'chats' ? 'bg-palta-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <MessageSquare className="w-4 h-4" /> Chats en Vivo
              {chats.some(c => c.pendingHuman) && (
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'config' ? 'bg-palta-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Settings className="w-4 h-4" /> Configuración Agente IA
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'qr' ? 'bg-palta-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Smartphone className="w-4 h-4" /> Vincular QR
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
              <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                {chats.length > 0 ? (
                  chats.map(chat => (
                    <div
                      key={chat.phone}
                      onClick={() => setSelectedChatPhone(chat.phone)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedChatPhone === chat.phone ? 'bg-palta-50/60 border-l-4 border-palta-600' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-900 text-sm truncate">{chat.name}</span>
                        {chat.pendingHuman ? (
                          <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold animate-pulse flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Requiere Humano
                          </span>
                        ) : chat.isHumanMode ? (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                            Modo Humano
                          </span>
                        ) : (
                          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Bot className="w-3 h-3" /> IA Activa
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{chat.phone}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No hay conversaciones activas aún.
                  </div>
                )}
              </div>
            </div>

            {/* Ventana de Chat */}
            <div className="md:col-span-2 flex flex-col bg-gray-50/50">
              {selectedChatPhone && currentChatData ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between shadow-xs">
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">{currentChatData.name}</h3>
                      <p className="text-xs text-gray-500">{currentChatData.phone}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleHumanMode(currentChatData.phone, currentChatData.isHumanMode)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                          currentChatData.isHumanMode
                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {currentChatData.isHumanMode ? <UserCheck className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        {currentChatData.isHumanMode ? 'Modo Humano (Intervenir)' : 'Activar Modo Humano'}
                      </button>
                    </div>
                  </div>

                  {/* Mensajes del Chat */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3">
                    {(currentChatData.messages || []).map((m, idx) => {
                      const isCustomer = m.sender === 'customer'
                      const isOperator = m.sender === 'operator'
                      return (
                        <div key={idx} className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}>
                          <div className={`max-w-[75%] p-3 rounded-2xl text-sm shadow-xs ${
                            isCustomer
                              ? 'bg-white text-gray-800 rounded-tl-xs border border-gray-100'
                              : isOperator
                              ? 'bg-palta-600 text-white rounded-tr-xs'
                              : 'bg-green-100 text-green-900 rounded-tr-xs border border-green-200'
                          }`}>
                            <p className="text-xs font-semibold mb-1 opacity-75">
                              {isCustomer ? 'Cliente' : isOperator ? 'Operador Humano' : 'Paltín (IA)'}
                            </p>
                            <p className="whitespace-pre-wrap">{m.text}</p>
                            <span className="text-[10px] opacity-60 mt-1 block text-right">
                              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Formulario para Responder */}
                  <form onSubmit={handleSendReply} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                    <input
                      type="text"
                      placeholder="Escribe un mensaje para responder al cliente como operador..."
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-palta-500"
                    />
                    <button
                      type="submit"
                      disabled={sendingReply || !replyText.trim()}
                      className="px-4 py-2.5 bg-palta-600 text-white font-medium rounded-xl hover:bg-palta-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      <Send className="w-4 h-4" /> Responder
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
                  <MessageSquare className="w-12 h-12 mb-3 text-gray-300" />
                  <p className="font-medium text-gray-600">Selecciona un chat de la izquierda</p>
                  <p className="text-xs text-gray-400 mt-1">Podrás ver la conversación en tiempo real y responder manualmente cuando sea derivado a un humano.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: CONFIGURACIÓN DEL PROMPT E INFORMACIÓN DEL AGENTE */}
        {activeTab === 'config' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Bot className="w-6 h-6 text-palta-600" />
                Configuración del Agente IA (Paltín)
              </h2>
              <p className="text-sm text-gray-500 mt-1">Personaliza las instrucciones del sistema, prompt principal e información de contacto para derivación humana.</p>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Asistente</label>
                  <input
                    type="text"
                    value={agentConfig.name || 'Paltín'}
                    onChange={e => setAgentConfig({ ...agentConfig, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    required
                  />
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
                      placeholder="+56912345678 (Se usará al redirigir nuevos clientes desde el registro)"
                    />
                  </div>
                </div>
              </div>

              {/* Selección de Modelo / Proveedor de IA */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-palta-600" /> Motor de Inteligencia Artificial
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${agentConfig.ai_provider === 'claude' ? 'bg-palta-50 border-palta-500 ring-2 ring-palta-500/20' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="ai_provider" value="claude" checked={agentConfig.ai_provider === 'claude'} onChange={e => setAgentConfig({...agentConfig, ai_provider: e.target.value})} className="text-palta-600" />
                    <div>
                      <p className="font-bold text-xs text-gray-900">Claude (Anthropic)</p>
                      <p className="text-[10px] text-gray-500">Sonnet 3.5 / Haiku</p>
                    </div>
                  </label>

                  <label className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${agentConfig.ai_provider === 'chatgpt' ? 'bg-palta-50 border-palta-500 ring-2 ring-palta-500/20' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="ai_provider" value="chatgpt" checked={agentConfig.ai_provider === 'chatgpt'} onChange={e => setAgentConfig({...agentConfig, ai_provider: e.target.value})} className="text-palta-600" />
                    <div>
                      <p className="font-bold text-xs text-gray-900">ChatGPT (OpenAI)</p>
                      <p className="text-[10px] text-gray-500">GPT-4o / GPT-4o-mini</p>
                    </div>
                  </label>

                  <label className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${agentConfig.ai_provider === 'gemini' ? 'bg-palta-50 border-palta-500 ring-2 ring-palta-500/20' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="ai_provider" value="gemini" checked={agentConfig.ai_provider === 'gemini'} onChange={e => setAgentConfig({...agentConfig, ai_provider: e.target.value})} className="text-palta-600" />
                    <div>
                      <p className="font-bold text-xs text-gray-900">Gemini (Google)</p>
                      <p className="text-[10px] text-gray-500">Gemini 1.5 Pro / Flash</p>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">API Key Personalizada ({agentConfig.ai_provider ? agentConfig.ai_provider.toUpperCase() : 'IA'})</label>
                  <input
                    type="password"
                    value={agentConfig.api_key || ''}
                    onChange={e => setAgentConfig({ ...agentConfig, api_key: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                    placeholder="sk-ant-... / sk-... / AIzaSy..."
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Si la dejas en blanco, se utilizará la clave de API configurada en el servidor por defecto.</p>
                </div>
              </div>

              {/* Mini Tutorial para Obtener API Keys */}
              <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-100 text-xs space-y-3">
                <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-600" /> Guía para Obtener las Claves de API (API Keys)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-blue-800">
                  <div className="bg-white p-3 rounded-lg shadow-2xs border border-blue-100">
                    <p className="font-bold text-blue-950 mb-1">🟧 Claude (Anthropic):</p>
                    <ol className="list-decimal list-inside space-y-1 text-[11px]">
                      <li>Ingresa a <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer" className="underline font-semibold">console.anthropic.com</a></li>
                      <li>Inicia sesión o crea una cuenta.</li>
                      <li>Ve a <strong>API Keys</strong> y haz clic en <strong>Create Key</strong>.</li>
                    </ol>
                  </div>

                  <div className="bg-white p-3 rounded-lg shadow-2xs border border-blue-100">
                    <p className="font-bold text-blue-950 mb-1">🟩 ChatGPT (OpenAI):</p>
                    <ol className="list-decimal list-inside space-y-1 text-[11px]">
                      <li>Ingresa a <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="underline font-semibold">platform.openai.com</a></li>
                      <li>Inicia sesión en tu cuenta.</li>
                      <li>Haz clic en <strong>Create new secret key</strong>.</li>
                    </ol>
                  </div>

                  <div className="bg-white p-3 rounded-lg shadow-2xs border border-blue-100">
                    <p className="font-bold text-blue-950 mb-1">🟦 Gemini (Google AI):</p>
                    <ol className="list-decimal list-inside space-y-1 text-[11px]">
                      <li>Ingresa a <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline font-semibold">aistudio.google.com</a></li>
                      <li>Inicia sesión con tu cuenta de Google.</li>
                      <li>Haz clic en <strong>Get API key</strong> y luego en <strong>Create API key</strong>.</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt / Instrucciones de Comportamiento</label>
                <textarea
                  rows={5}
                  value={agentConfig.system_prompt}
                  onChange={e => setAgentConfig({ ...agentConfig, system_prompt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500 font-mono"
                  placeholder="Instrucciones con las que responderá el bot de IA..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Información Adicional del Negocio</label>
                <textarea
                  rows={3}
                  value={agentConfig.additional_info}
                  onChange={e => setAgentConfig({ ...agentConfig, additional_info: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500"
                  placeholder="Horarios de atención, políticas de despacho, promociones especiales..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono para Notificaciones de Operador Humano</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={agentConfig.human_notification_phone || ''}
                    onChange={e => setAgentConfig({ ...agentConfig, human_notification_phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500"
                    placeholder="+56912345678 (Número al que el bot enviará la alerta cuando un cliente pida hablar con un humano)"
                  />
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

        {/* TAB 3: VINCULAR CÓDIGO QR */}
        {activeTab === 'qr' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
              
              {loading && !qr && !status.connected ? (
                <div className="flex flex-col items-center">
                  <RefreshCw className="w-8 h-8 text-palta-500 animate-spin mb-4" />
                  <p className="text-gray-500">Conectando con el agente...</p>
                  <p className="text-xs text-gray-400 mt-2">Asegúrate de que el agente de WhatsApp esté corriendo.</p>
                </div>
              ) : status.connected ? (
                <div className="flex flex-col items-center text-center max-w-md">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">¡WhatsApp Conectado!</h2>
                  <p className="text-gray-600 mb-8">
                    Paltín está activo y la sesión se mantiene guardada persistentemente incluso ante reinicios.
                  </p>
                  <button onClick={handleLogout}
                    className="px-6 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 font-medium rounded-lg transition-colors flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> Desvincular Cuenta
                  </button>
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
                  <p className="text-gray-500 text-sm">
                    El agente está preparando el código para que lo escanees. Esto puede tomar unos segundos.
                  </p>
                  <RefreshCw className="w-6 h-6 text-palta-500 animate-spin mt-6" />
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
