import React, { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { MessageSquare, RefreshCw, Smartphone, LogOut, CheckCircle2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

// El frontend se conectará al agente de whatsapp (asumiendo que corre localmente en el puerto 3001, o usa variable de entorno)
const WA_API_URL = import.meta.env.VITE_WA_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001/api/wa' : 'https://whatsapp-agente-production-a1fc.up.railway.app/api/wa')

export default function WhatsAppPage() {
  const [status, setStatus] = useState({ connected: false, has_qr: false })
  const [qr, setQr] = useState(null)
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 3000) // Poll every 3 seconds
    return () => clearInterval(interval)
  }, [])

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
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-green-500" />
            Vincular WhatsApp
          </h1>
          <p className="text-gray-500 text-sm mt-1">Conecta tu número para que Paltín empiece a atender a tus clientes automáticamente.</p>
        </div>

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
                  Paltín está activo y listo para recibir pedidos de tus clientes a través de WhatsApp.
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
      </div>
    </AdminLayout>
  )
}
