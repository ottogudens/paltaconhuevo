import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetIdentifier, setResetIdentifier] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const navigate = useNavigate()
  const { login } = useAuthStore()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login/', { username, password })
      const { token, user } = res.data
      login(user, token)
      navigate(user.role === 'admin' ? '/dashboard' : '/shop')
    } catch (err) {
      setError(err.response?.data?.detail || 'Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setResetLoading(true)
    try {
      const res = await api.post('/auth/reset-password/', { identifier: resetIdentifier, new_password: resetPassword })
      alert(res.data.message)
      setShowReset(false)
      setResetIdentifier('')
      setResetPassword('')
    } catch (err) {
      alert(err.response?.data?.error || 'Error al restablecer contraseña')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-palta-50 to-huevo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🥑🥚</div>
            <h1 className="text-3xl font-bold text-palta-700">Palta con Huevo</h1>
            <p className="text-gray-600 text-sm mt-1">Gestión de ventas inteligente</p>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg text-center font-medium border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Correo o Teléfono</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="correo@ejemplo.com o 912345678" required />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Contraseña</label>
                <button type="button" onClick={() => setShowReset(true)} className="text-xs text-palta-600 font-medium hover:underline">¿Olvidaste tu clave?</button>
              </div>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-palta-600 hover:bg-palta-700 text-white font-bold rounded-lg text-sm transition-colors shadow disabled:opacity-50 mt-2">{loading ? 'Iniciando...' : 'Iniciar Sesión'}</button>
          </form>
          <p className="text-center mt-6 text-sm text-gray-600">¿No tienes cuenta? <a href="/register" className="text-palta-700 font-bold hover:underline">Regístrate</a></p>
        </div>
      </div>

      {showReset && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowReset(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Recuperar Contraseña</h2>
              <button onClick={() => setShowReset(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Correo o Teléfono registrado</label>
                <input type="text" placeholder="correo@ejemplo.com o +56912345678" value={resetIdentifier} onChange={e => setResetIdentifier(e.target.value)} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                <input type="password" placeholder="Mínimo 4 caracteres" value={resetPassword} onChange={e => setResetPassword(e.target.value)} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowReset(false)} className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={resetLoading} className="px-4 py-2 text-xs bg-palta-600 text-white font-bold rounded-lg hover:bg-palta-700 disabled:opacity-50">
                  {resetLoading ? 'Guardando...' : 'Cambiar Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
