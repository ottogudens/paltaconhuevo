import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  LayoutDashboard, Users, ShoppingCart, Package, DollarSign,
  LogOut, Menu, X, ChevronDown, Store, ClipboardList, TrendingUp, MessageSquare, UserCheck, Tag
} from 'lucide-react'

const adminLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/orders', label: 'Pedidos', icon: ShoppingCart },
  { to: '/customers', label: 'Clientes', icon: Users },
  { to: '/users', label: 'Usuarios', icon: UserCheck },
  { to: '/products', label: 'Productos', icon: Package },
  { to: '/offers', label: 'Ofertas', icon: Tag },
  { to: '/finance', label: 'Finanzas', icon: DollarSign },
  { to: '/whatsapp', label: 'WhatsApp Bot', icon: MessageSquare },
]

const clientLinks = [
  { to: '/shop', label: 'Tienda', icon: Store },
  { to: '/my-orders', label: 'Mis Pedidos', icon: ClipboardList },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const isAdmin = user?.role === 'admin' || user?.role === 'vendedor'
  const links = isAdmin ? adminLinks : clientLinks

  const handleLogout = () => {
    logout()
    localStorage.clear()
  }

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-palta-700/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-palta-400 to-palta-600 flex items-center justify-center text-xl shadow-lg">
            🥑
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Palta con Huevo</h1>
            <p className="text-palta-300 text-xs">Gestión de Ventas</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 text-xs font-semibold text-palta-400 uppercase tracking-wider mb-3">
          {isAdmin ? 'Administración' : 'Mi cuenta'}
        </p>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-palta-200 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info + Logout */}
      <div className="p-4 border-t border-palta-700/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-huevo-400 to-huevo-600 flex items-center justify-center text-sm font-bold text-gray-900">
            {(user?.first_name || user?.username || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.first_name || user?.username}</p>
            <p className="text-xs text-palta-300 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-palta-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-palta-700 text-white rounded-lg shadow-lg"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-gradient-to-b from-palta-800 to-palta-900
        transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col shadow-2xl
      `}>
        {navContent}
      </aside>
    </>
  )
}
