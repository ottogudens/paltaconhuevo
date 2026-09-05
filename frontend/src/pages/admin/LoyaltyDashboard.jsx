import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { Star, Users, Gift, Tag } from 'lucide-react'

import CustomersLoyaltyTab from '../../components/loyalty/CustomersLoyaltyTab'
import RewardsTab from '../../components/loyalty/RewardsTab'
import OffersTab from '../../components/loyalty/OffersTab'
import RecipesLoyaltyTab from '../../components/loyalty/RecipesLoyaltyTab'
import { ChefHat } from 'lucide-react'

export default function LoyaltyDashboard() {
  const [activeTab, setActiveTab] = useState('clientes')
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    if (tab && ['clientes', 'premios', 'ofertas', 'recetas'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [location])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    navigate(`/loyalty?tab=${tab}`, { replace: true })
  }

  const tabs = [
    { id: 'clientes', label: 'Clientes y Puntos', icon: Users },
    { id: 'premios', label: 'Gestión de Premios', icon: Gift },
    { id: 'ofertas', label: 'Ofertas Masivas', icon: Tag },
    { id: 'recetas', label: 'Blog de Recetas (IA)', icon: ChefHat },
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        
        {/* Header and Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex flex-wrap gap-2">
          {tabs.map(t => {
            const Icon = t.icon
            const isActive = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive 
                    ? 'bg-palta-600 text-white shadow-md' 
                    : 'bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeTab === 'clientes' && <CustomersLoyaltyTab />}
          {activeTab === 'premios' && <RewardsTab />}
          {activeTab === 'ofertas' && <OffersTab />}
          {activeTab === 'recetas' && <RecipesLoyaltyTab />}
        </div>

      </div>
    </AdminLayout>
  )
}
