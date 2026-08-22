import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { Settings, Building2, Landmark, Database, Save, Loader2, Info, Download, Upload, Bot, QrCode, Smartphone, Hash, CheckCircle2, AlertCircle, Copy, Check, LogOut } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

const WA_API_URL = import.meta.env.VITE_WA_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001/api/wa' : 'https://whatsapp-agente-production-a1fc.up.railway.app/api/wa')

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general') // 'general', 'whatsapp', 'database'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Company Settings
  const [company, setCompany] = useState({
    company_name: '', rut: '', address: '', phone: '', email: '',
    bank_name: '', account_type: '', account_number: '', account_rut: '', account_email: '', account_name: ''
  })

  // Bot Settings & Session
  const [agentConfig, setAgentConfig] = useState({ name: 'Paltín', system_prompt: '', additional_info: '', human_notification_phone: '', ai_provider: 'claude', api_key: '', whatsapp_connected_phone: '' })
  const [waStatus, setWaStatus] = useState({ connected: false, has_qr: false })
  const [qr, setQr] = useState(null)
  
  // Pairing
  const [pairingMethod, setPairingMethod] = useState('qr') // 'qr' | 'phone'
  const [phoneToPair, setPhoneToPair] = useState('')
  const [pairingCode, setPairingCode] = useState(null)
  const [requestingCode, setRequestingCode] = useState(false)
  const [codeError, setCodeError] = useState(null)
  const [codeCopied, setCodeCopied] = useState(false)

  // DB Backup
  const [backupFile, setBackupFile] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [compRes, agentRes, waRes] = await Promise.all([
        api.get('/finance/company/').catch(() => ({ data: {} })),
        api.get('/marketing/agent-config/').catch(() => ({ data: {} })),
        fetch(`${WA_API_URL}/status`).then(r => r.json()).catch(() => ({ connected: false, has_qr: false }))
      ])
      
      if (compRes.data) setCompany(prev => ({ ...prev, ...compRes.data }))
      if (agentRes.data) {
        setAgentConfig(prev => ({ ...prev, ...agentRes.data }))
        if (agentRes.data.whatsapp_connected_phone && !phoneToPair) {
          setPhoneToPair(agentRes.data.whatsapp_connected_phone)
        }
      }
      setWaStatus(waRes)
      
      if (waRes.has_qr && !waRes.connected) {
        const qrRes = await fetch(`${WA_API_URL}/qr`)
        const qrData = await qrRes.json()
        setQr(qrData.qr)
      } else {
        setQr(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCompany = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/finance/company/', company)
      alert('Configuración general guardada')
    } catch (e) {
      alert('Error al guardar la configuración')
    } finally { setSaving(false) }
  }

  const handleSaveBotSettings = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/marketing/agent-config/', agentConfig)
      alert('Configuración del agente guardada correctamente')
    } catch (e) {
      alert('Error al guardar configuración del agente')
    } finally { setSaving(false) }
  }

  const handleRequestPairingCode = async (e) => {
    if (e) e.preventDefault()
    if (!phoneToPair.trim()) {
      setCodeError('Por favor ingresa un número de teléfono.')
      return
    }
    setRequestingCode(true)
    setCodeError(null)
    try {
      const res = await fetch(`${WA_API_URL}/pairing-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneToPair })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al generar el código')
      setPairingCode(data.code)
    } catch (err) {
      setCodeError(err.message)
    } finally {
      setRequestingCode(false)
    }
  }

  const handleCopyCode = () => {
    if (!pairingCode) return
    navigator.clipboard.writeText(pairingCode.replace(/\s+/g, ''))
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  const handleLogout = async () => {
    if (!confirm('¿Seguro que deseas desvincular la cuenta actual de WhatsApp?')) return
    setLoading(true)
    try {
      await fetch(`${WA_API_URL}/logout`, { method: 'POST' })
      setPairingCode(null)
      await fetchData()
    } catch (e) {
      alert('Error al desvincular WhatsApp')
      setLoading(false)
    }
  }

  const handleBackupDownload = async () => {
    try {
      const res = await api.get('/finance/backup/', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'database_backup.json')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      alert('Error al generar copia de seguridad')
    }
  }

  const handleBackupUpload = async (e) => {
    e.preventDefault()
    if (!backupFile) return
    if (!confirm('PRECAUCIÓN: Esto reemplazará los datos actuales por los del respaldo. ¿Deseas continuar?')) return
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('file', backupFile)
      await api.post('/finance/backup/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      alert('Restauración completada con éxito. Por favor recarga la página.')
      window.location.reload()
    } catch (e) {
      alert('Error al restaurar base de datos')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-palta-600" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
          <p className="text-gray-500 text-sm mt-1">Administra los detalles de la empresa, bot de WhatsApp y copias de seguridad.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-palta-600 text-palta-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Datos de la Empresa
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'whatsapp' ? 'border-palta-600 text-palta-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            WhatsApp & IA
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'database' ? 'border-palta-600 text-palta-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Base de Datos
          </button>
        </div>

        {/* General Settings */}
        {activeTab === 'general' && (
          <form onSubmit={handleSaveCompany} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden text-sm">
            <div className="p-6 space-y-6">
              
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-palta-600" /> Información Comercial
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-1">Nombre de la Empresa</label>
                    <input type="text" value={company.company_name} onChange={e => setCompany({...company, company_name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-palta-500" />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">RUT Empresa</label>
                    <input type="text" value={company.rut} onChange={e => setCompany({...company, rut: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-palta-500" />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">Dirección / Sucursal</label>
                    <input type="text" value={company.address} onChange={e => setCompany({...company, address: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-palta-500" />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">Teléfono Público</label>
                    <input type="text" value={company.phone} onChange={e => setCompany({...company, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-palta-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-gray-700 mb-1">Correo Público</label>
                    <input type="email" value={company.email} onChange={e => setCompany({...company, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-palta-500" />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <Landmark className="w-5 h-5 text-palta-600" /> Datos Bancarios para Transferencias
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-1">Banco</label>
                    <input type="text" value={company.bank_name} onChange={e => setCompany({...company, bank_name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-palta-500" />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">Tipo de Cuenta</label>
                    <input type="text" value={company.account_type} onChange={e => setCompany({...company, account_type: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-palta-500" />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">Número de Cuenta</label>
                    <input type="text" value={company.account_number} onChange={e => setCompany({...company, account_number: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-palta-500" />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">Nombre del Titular</label>
                    <input type="text" value={company.account_name} onChange={e => setCompany({...company, account_name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-palta-500" />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">RUT del Titular</label>
                    <input type="text" value={company.account_rut} onChange={e => setCompany({...company, account_rut: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-palta-500" />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">Correo Comprobante</label>
                    <input type="email" value={company.account_email} onChange={e => setCompany({...company, account_email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-palta-500" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button type="submit" disabled={saving} className="px-5 py-2 bg-palta-600 text-white rounded-lg hover:bg-palta-700 font-medium flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
              </button>
            </div>
          </form>
        )}

        {/* WhatsApp & IA Settings */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6">
            
            {/* Vinculacion Dispositivo */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-palta-600" />
                    Vincular Dispositivo (WhatsApp API)
                  </h2>
                </div>
                {waStatus.connected && (
                  <button onClick={handleLogout} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-red-100 transition-colors">
                    <LogOut className="w-4 h-4" /> Desvincular
                  </button>
                )}
              </div>

              <div className="p-6">
                {waStatus.connected ? (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-green-50 shadow-inner">
                      <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">WhatsApp Conectado Exitosamente</h3>
                  </div>
                ) : (
                  <div>
                    <div className="flex bg-gray-100 p-1 rounded-lg mb-6 w-max mx-auto">
                      <button onClick={() => setPairingMethod('qr')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${pairingMethod === 'qr' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900'}`}>
                        Vincular con QR
                      </button>
                      <button onClick={() => setPairingMethod('phone')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${pairingMethod === 'phone' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900'}`}>
                        Vincular con Código
                      </button>
                    </div>

                    {pairingMethod === 'qr' ? (
                      <div className="flex flex-col items-center">
                        {qr ? (
                          <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 mb-6">
                            <QRCodeSVG value={qr} size={240} className="rounded-lg" />
                          </div>
                        ) : (
                          <div className="w-64 h-64 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 mb-6">
                            <Loader2 className="w-10 h-10 mb-2 animate-spin text-palta-500 opacity-50" />
                            <p className="text-sm">Generando QR...</p>
                          </div>
                        )}
                        <p className="text-sm text-gray-500 text-center">Escanea el código QR desde <br/>"Dispositivos Vinculados" en tu app de WhatsApp.</p>
                      </div>
                    ) : (
                      <div className="max-w-sm mx-auto">
                        {!pairingCode ? (
                          <form onSubmit={handleRequestPairingCode} className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Número de WhatsApp oficial</label>
                              <div className="flex relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><Hash className="w-4 h-4" /></span>
                                <input 
                                  type="text" 
                                  value={phoneToPair}
                                  onChange={e => setPhoneToPair(e.target.value)}
                                  placeholder="Ej: 56912345678"
                                  className="w-full pl-9 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500"
                                />
                              </div>
                            </div>
                            {codeError && (
                              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2">
                                <AlertCircle className="w-4 h-4" /> <span>{codeError}</span>
                              </div>
                            )}
                            <button type="submit" disabled={requestingCode || !phoneToPair.trim()} className="w-full py-3 bg-gray-900 text-white font-medium rounded-lg flex justify-center hover:bg-gray-800 disabled:opacity-50">
                              {requestingCode ? 'Generando...' : 'Generar Código de 8 letras'}
                            </button>
                          </form>
                        ) : (
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-600 mb-4">Ingresa este código en tu WhatsApp:</p>
                            <div className="text-4xl tracking-[0.25em] font-mono font-bold text-gray-900 bg-gray-100 py-6 px-4 rounded-2xl mb-4 cursor-pointer" onClick={handleCopyCode}>
                              {pairingCode}
                            </div>
                            <span className="text-sm text-palta-600 block h-6">{codeCopied ? '¡Copiado!' : 'Clickea para copiar'}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Agente Config */}
            <form onSubmit={handleSaveBotSettings} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden text-sm">
              <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-palta-600" /> Configuración del Agente IA
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-700 mb-1">Nombre del Agente</label>
                    <input type="text" value={agentConfig.name} onChange={e => setAgentConfig({ ...agentConfig, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-palta-500" />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">Proveedor IA</label>
                    <select value={agentConfig.ai_provider} onChange={e => setAgentConfig({ ...agentConfig, ai_provider: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-palta-500">
                      <option value="claude">Claude (Anthropic)</option>
                      <option value="chatgpt">ChatGPT (OpenAI)</option>
                      <option value="gemini">Gemini (Google)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-gray-700 mb-1">API Key</label>
                    <input type="password" value={agentConfig.api_key} onChange={e => setAgentConfig({ ...agentConfig, api_key: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-palta-500" placeholder="(Opcional si se utiliza desde env vars)" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-gray-700 mb-1">Prompt de Instrucciones</label>
                    <textarea rows={5} value={agentConfig.system_prompt} onChange={e => setAgentConfig({ ...agentConfig, system_prompt: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-palta-500 font-mono text-xs" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-gray-700 mb-1">Contexto Adicional (Horarios, despachos, promos)</label>
                    <textarea rows={3} value={agentConfig.additional_info} onChange={e => setAgentConfig({ ...agentConfig, additional_info: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-palta-500 font-mono text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">Teléfono Notificaciones (Personal)</label>
                    <input type="text" value={agentConfig.human_notification_phone} onChange={e => setAgentConfig({ ...agentConfig, human_notification_phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-palta-500" placeholder="Ej: 56987654321" />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">Teléfono Conectado (Empresa)</label>
                    <input type="text" value={agentConfig.whatsapp_connected_phone} onChange={e => setAgentConfig({ ...agentConfig, whatsapp_connected_phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-palta-500" placeholder="Ej: 56912345678" />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button type="submit" disabled={saving} className="px-5 py-2 bg-palta-600 text-white rounded-lg hover:bg-palta-700 font-medium flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Backup Settings */}
        {activeTab === 'database' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden text-sm max-w-3xl">
            <div className="p-6 space-y-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-palta-600" /> Respaldo y Restauración de Base de Datos
              </h2>
              
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
                <Info className="w-6 h-6 text-blue-600 shrink-0" />
                <p className="text-blue-800">
                  Es altamente recomendable realizar descargas del estado actual de tu base de datos periódicamente. Podrás utilizar este mismo archivo para restaurar la información en caso de emergencia.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="border border-gray-200 rounded-xl p-5 flex flex-col items-start min-h-[220px]">
                  <h3 className="font-bold text-gray-900 mb-2">Respaldar (Exportar)</h3>
                  <p className="text-gray-500 text-xs mb-6 flex-1">Genera un archivo JSON con toda la información (Productos, Clientes, Pedidos y Stats). No se incluyen los registros de sesiones del sistema.</p>
                  <button onClick={handleBackupDownload} className="w-full py-2.5 bg-palta-600 text-white rounded-lg hover:bg-palta-700 font-medium flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" /> Descargar Backup (.json)
                  </button>
                </div>

                <form onSubmit={handleBackupUpload} className="border border-red-200 bg-red-50/30 rounded-xl p-5 flex flex-col items-start min-h-[220px]">
                  <h3 className="font-bold text-red-900 mb-2">Restaurar (Importar)</h3>
                  <p className="text-red-700 text-xs mb-4 flex-1">Sube el archivo JSON. Esta acción sobreescribirá la información actual de forma permanente y borrará registros nuevos.</p>
                  
                  <input type="file" accept=".json" onChange={e => setBackupFile(e.target.files[0])} required className="w-full text-xs text-gray-500 mb-4 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white file:text-gray-700 hover:file:bg-gray-50 cursor-pointer border border-red-100 rounded-xl p-1 bg-white" />
                  
                  <button type="submit" disabled={saving || !backupFile} className="w-full py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                    <Upload className="w-4 h-4" /> Restaurar Base de Datos
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
