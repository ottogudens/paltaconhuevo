import React from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold"><span className="text-palta-600">🥑</span> <span className="text-huevo-600">🥚</span></Link>
        <div className="flex gap-4 items-center">
          <span className="text-gray-700">{user?.first_name}</span>
          <button onClick={() => { logout(); localStorage.clear() }} className="btn-outline text-sm">Cerrar sesión</button>
        </div>
      </div>
    </nav>
  )
}
