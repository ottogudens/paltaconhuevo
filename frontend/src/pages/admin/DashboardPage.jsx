import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import { TrendingUp, Users, ShoppingCart, DollarSign } from 'lucide-react'

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/orders/dashboard/')
        setDashboard(res.data)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-palta-700 mb-8">📊 Dashboard</h1>
      {loading ? (
        <div>Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card"><DollarSign className="w-8 h-8 text-huevo-600 mb-2" /><p className="text-gray-600">Ventas Hoy</p><p className="text-2xl font-bold">${dashboard.sales_today}</p></div>
          <div className="card"><ShoppingCart className="w-8 h-8 text-palta-600 mb-2" /><p className="text-gray-600">Pedidos Hoy</p><p className="text-2xl font-bold">{dashboard.orders_today}</p></div>
          <div className="card"><Users className="w-8 h-8 text-palta-600 mb-2" /><p className="text-gray-600">Clientes</p><p className="text-2xl font-bold">{dashboard.total_customers}</p></div>
          <div className="card"><TrendingUp className="w-8 h-8 text-palta-600 mb-2" /><p className="text-gray-600">Pendientes</p><p className="text-2xl font-bold">${dashboard.accounts_receivable}</p></div>
        </div>
      )}
    </div>
  )
}
