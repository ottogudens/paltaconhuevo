import React, { useState } from 'react'
import Sidebar from './Sidebar'
import { Menu } from 'lucide-react'

export default function AdminLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  
  return (
    <div className="flex h-[100dvh] bg-gray-50 overflow-hidden flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden bg-palta-800 text-white p-4 flex justify-between items-center z-30 shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-palta-400 to-palta-600 flex items-center justify-center text-sm shadow-lg">🥑</div>
          <span className="font-bold leading-none">Palta con Huevo</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-2 -mr-2 hover:bg-palta-700 rounded-lg transition-colors">
          <Menu className="w-6 h-6" />
        </button>
      </header>

      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
