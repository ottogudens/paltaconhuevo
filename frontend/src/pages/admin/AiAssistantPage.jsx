import React, { useState } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { Sparkles, Bot, Settings, Rocket, Tag, Send, AlertTriangle, MessageSquare } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

export default function AiAssistantPage() {
  const [provider, setProvider] = useState('claude')
  const [promptType, setPromptType] = useState('optimizar_ventas')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)

  const handleGenerate = async () => {
    if (!context.trim()) {
      setError('Por favor, ingresa algo de contexto para que la IA pueda ayudarte.')
      return
    }
    setError(null)
    setLoading(true)
    setResponse(null)
    
    try {
      const res = await api.post('/marketing/ai-advisory/', {
        provider,
        type: promptType,
        context: context.trim()
      })
      setResponse(res.data.response)
    } catch (e) {
      console.error(e)
      setError('Error al conectar con la IA. ' + (e.response?.data?.error || e.message))
    } finally {
      setLoading(false)
    }
  }

  const promptOptions = [
    { id: 'optimizar_ventas', label: 'Optimización de Ventas', icon: Rocket, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { id: 'crear_campana', label: 'Crear Campaña', icon: Sparkles, color: 'text-fuchsia-600', bg: 'bg-fuchsia-100' },
    { id: 'crear_oferta', label: 'Crear Oferta/Combo', icon: Tag, color: 'text-amber-600', bg: 'bg-amber-100' },
    { id: 'asesoria_general', label: 'Asesoría General', icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-100' }
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="w-8 h-8 text-indigo-600" />
            Asesoría IA
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Optimiza tus ventas y crea contenido espectacular con Inteligencia Artificial.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-400" />
                Configuración
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor IA</label>
                  <select 
                    value={provider} 
                    onChange={e => setProvider(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="claude">Claude (Anthropic)</option>
                    <option value="openai">ChatGPT (OpenAI)</option>
                    <option value="gemini">Gemini (Google)</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">El proveedor por defecto y configurado actualmente es Claude.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">¿Qué necesitas hacer?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {promptOptions.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setPromptType(opt.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          promptType === opt.id 
                            ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                        }`}
                      >
                        <opt.icon className={`w-5 h-5 mb-2 ${promptType === opt.id ? 'text-indigo-600' : 'text-gray-500'}`} />
                        <span className={`block text-xs font-medium ${promptType === opt.id ? 'text-indigo-900' : 'text-gray-700'}`}>
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col h-full">
              <h2 className="font-semibold text-gray-900 mb-4">Contexto y Resultado</h2>
              
              <div className="flex-1 flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Describe tu solicitud</label>
                  <textarea
                    value={context}
                    onChange={e => setContext(e.target.value)}
                    placeholder="Ej. Trata de armar una promoción usando paltas pequeñas que tenemos en exceso de stock. Queremos vender rápidamente 10 Kilos."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm min-h-[120px] focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                  ></textarea>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-xl flex gap-3 text-sm border border-red-100">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
                  >
                    {loading ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Generar Respuesta
                      </>
                    )}
                  </button>
                </div>

                {response && (
                  <div className="mt-4 pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Respuesta de IA</h3>
                    <div className="prose prose-sm prose-indigo max-w-none prose-p:leading-relaxed prose-a:text-indigo-600 p-6 bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 shadow-inner">
                      <ReactMarkdown>{response}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </AdminLayout>
  )
}
