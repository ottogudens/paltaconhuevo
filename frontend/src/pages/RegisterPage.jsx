import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { MessageSquare, User, Mail, Phone, Lock, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function RegisterPage() {
  const [method, setMethod] = useState('choice') // 'choice', 'manual'
  const [formData, setFormData] = useState({
    email: '', password: '', first_name: '', phone: ''
  })
  const [waNumber, setWaNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchWaNumber = async () => {
      try {
        const res = await api.get('/marketing/agent-config/')
        if (res.data?.whatsapp_connected_phone) {
          let clean = res.data.whatsapp_connected_phone.replace(/\+/g, '').replace(/\s/g, '')
          setWaNumber(clean)
        }
      } catch (e) { console.error(e) }
    }
    fetchWaNumber()
  }, [])

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/register/', formData)
      alert('¡Registro exitoso! Ya puedes iniciar sesión con tu correo o teléfono.')
      navigate('/login')
    } catch (err) {
      alert('Error en el registro. Revisa los datos ingresados.')
    } finally {
      setLoading(false)
    }
  }

  const handleWhatsAppRegister = () => {
    const targetNumber = waNumber || '56912345678'
    const text = encodeURIComponent('¡Hola! Quisiera registrarme como cliente en Palta con Huevo 🥑🥚')
    window.open(`https://wa.me/${targetNumber}?text=${text}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-palta-50 via-white to-huevo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-br from-palta-400 to-palta-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg text-2xl">
            🥑
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Crear Cuenta Cliente</h1>
          <p className="text-sm text-gray-500">¿Cómo prefieres completar tu registro?</p>
        </div>

        {method === 'choice' && (
          <div className="space-y-4 pt-2">
            {/* Opción 1: WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsAppRegister}
              className="w-full p-4 rounded-xl border-2 border-green-500 bg-green-50/50 hover:bg-green-50 text-left transition-all duration-200 flex items-center gap-4 group shadow-sm hover:shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-green-500 text-white flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 flex items-center gap-1.5 text-base">
                  Registrarse por WhatsApp
                  <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-medium">IA Recomendado</span>
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">Conversa con Paltín, nuestro asistente de IA, quien anotará tus datos automáticamente.</p>
              </div>
              <ArrowRight className="w-5 h-5 text-green-600 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Opción 2: Formulario Manual */}
            <button
              type="button"
              onClick={() => setMethod('manual')}
              className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-palta-400 bg-white hover:bg-palta-50/30 text-left transition-all duration-200 flex items-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-xl bg-palta-100 text-palta-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-base">Ingreso de datos manual</h3>
                <p className="text-xs text-gray-500 mt-0.5">Completa el formulario tradicional en la plataforma con tu correo y contraseña.</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="pt-4 text-center">
              <p className="text-xs text-gray-500">
                ¿Ya tienes una cuenta?{' '}
                <Link to="/login" className="text-palta-700 font-bold hover:underline">
                  Iniciar sesión
                </Link>
              </p>
            </div>
          </div>
        )}

        {method === 'manual' && (
          <form onSubmit={handleRegister} className="space-y-4 pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Formulario Manual</span>
              <button
                type="button"
                onClick={() => setMethod('choice')}
                className="text-xs text-palta-600 hover:underline font-medium"
              >
                ← Volver a opciones
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre Completo</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Juan Pérez"
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="+56912345678"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="juan@ejemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-palta-600 hover:bg-palta-700 text-white font-bold rounded-lg transition-colors text-sm shadow-md disabled:opacity-50 mt-2"
            >
              {loading ? 'Registrando...' : 'Completar Registro'}
            </button>

            <div className="pt-2 text-center">
              <p className="text-xs text-gray-500">
                ¿Ya tienes una cuenta?{' '}
                <Link to="/login" className="text-palta-700 font-bold hover:underline">
                  Iniciar sesión
                </Link>
              </p>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}

