import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', first_name: '', phone: ''
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/register/', formData)
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-palta-50 to-huevo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-palta-700 mb-6">Crear Cuenta</h1>
        <form onSubmit={handleRegister} className="space-y-4">
          <input type="email" placeholder="Email" className="input-field" onChange={(e) => setFormData({...formData, email: e.target.value})} required />
          <input type="text" placeholder="Nombre" className="input-field" onChange={(e) => setFormData({...formData, first_name: e.target.value})} required />
          <input type="text" placeholder="Teléfono" className="input-field" onChange={(e) => setFormData({...formData, phone: e.target.value})} />
          <input type="text" placeholder="Usuario" className="input-field" onChange={(e) => setFormData({...formData, username: e.target.value})} required />
          <input type="password" placeholder="Contraseña" className="input-field" onChange={(e) => setFormData({...formData, password: e.target.value})} required />
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Registrando...' : 'Registrarse'}</button>
        </form>
      </div>
    </div>
  )
}
