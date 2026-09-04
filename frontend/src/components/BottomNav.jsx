import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Store,
  ClipboardList,
  Menu
} from 'lucide-react'

export default function BottomNav({ onOpenMenu }) {
  const { user } = useAuthStore()
  const location = useLocation()
  const isAdmin = user?.role === 'admin' || user?.role === 'vendedor'

  const navItems = isAdmin
    ? [
        { to: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
        { to: '/orders', label: 'Pedidos', icon: ShoppingCart },
        { to: '/customers', label: 'Clientes', icon: Users },
      ]
    : [
        { to: '/shop', label: 'Tienda', icon: Store },
        { to: '/my-orders', label: 'Mis Pedidos', icon: ClipboardList },
      ]

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-30 pb-safe">
      <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.to
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-palta-600 font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-palta-50 text-palta-600 scale-110' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="mt-0.5 text-[11px] leading-tight truncate">{item.label}</span>
            </NavLink>
          )
        })}

        {/* Action button to trigger full menu overlay */}
        <button
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <div className="p-1 rounded-xl">
            <Menu className="w-5 h-5" />
          </div>
          <span className="mt-0.5 text-[11px] leading-tight">Menú</span>
        </button>
      </div>
    </nav>
  )
}
