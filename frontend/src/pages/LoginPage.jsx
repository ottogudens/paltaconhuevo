import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
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
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      navigate(user.role === 'admin' ? '/dashboard' : '/shop')
    } catch (err) {
      setError(err.response?.data?.detail || 'Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-palta-50 to-huevo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🥑🥚</div>
            <h1 className="text-3xl font-bold text-palta-700">Palta con Huevo</h1>
            <p className="text-gray-600 mt-2">Gestión de ventas inteligente</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input-field" placeholder="Usuario" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" placeholder="Contraseña" required />
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Iniciando...' : 'Iniciar Sesión'}</button>
          </form>
          <p className="text-center mt-4 text-gray-600">¿No tienes cuenta? <a href="/register" className="text-palta-600 font-medium">Regístrate</a></p>
        </div>
      </div>
    </div>
  )
}
