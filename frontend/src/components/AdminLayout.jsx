import React, { useState } from 'react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { Menu } from 'lucide-react'

export default function AdminLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  
  return (
    <div className="flex h-[100dvh] bg-gray-50 overflow-hidden flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden bg-palta-800 text-white p-3.5 flex justify-between items-center z-30 shrink-0 shadow-sm border-b border-palta-700/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-palta-400 to-palta-600 flex items-center justify-center text-sm shadow-md">🥑</div>
          <span className="font-bold text-base leading-none tracking-tight">Palta con Huevo</span>
        </div>
        <button 
          onClick={() => setMobileOpen(true)} 
          className="p-2 -mr-1 text-palta-100 hover:text-white hover:bg-palta-700 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Abrir menú"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
        <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {children}
        </div>
      </main>

      {/* Bottom Navigation for Mobile Devices */}
      <BottomNav onOpenMenu={() => setMobileOpen(true)} />
    </div>
  )
}

