import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import {
  TrendingUp, Users, ShoppingCart, DollarSign,
  AlertTriangle, Clock, Truck, CheckCircle2
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#3cb853', '#ffc127', '#ef4444', '#6366f1']

function StatCard({ icon: Icon, label, value, color = 'palta', trend = null }) {
  const colorMap = {
    palta: 'from-palta-500 to-palta-700',
    huevo: 'from-huevo-400 to-huevo-600',
    red: 'from-red-400 to-red-600',
    blue: 'from-blue-400 to-blue-600',
  }
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend !== null && (
            <p className={`text-xs mt-1 font-medium ${trend >= 0 ? 'text-palta-600' : 'text-red-500'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs ayer
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorMap[color]} shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dashRes, ordersRes, stockRes] = await Promise.all([
          api.get('/orders/dashboard/'),
          api.get('/orders/?page_size=5'),
          api.get('/products/low-stock/'),
        ])
        setDashboard(dashRes.data)
        setRecentOrders(ordersRes.data.results || ordersRes.data || [])
        setLowStock(stockRes.data || [])
      } catch (e) {
        console.error('Dashboard fetch error:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-palta-600" />
        </div>
      </AdminLayout>
    )
  }

  const statusData = [
    { name: 'Pendientes', value: dashboard?.orders_pending || 0 },
    { name: 'En camino', value: dashboard?.orders_in_transit || 0 },
    { name: 'Hoy', value: dashboard?.orders_today || 0 },
  ].filter(d => d.value > 0)

  const formatCLP = (n) => `$${(n || 0).toLocaleString('es-CL')}`

  const formatProducts = (items) => {
    if (!items || items.length === 0) return 'Sin productos'
    return items.map(i => `${i.quantity}x ${i.product_name}`).join(', ')
  }

  const statusBadge = (status) => {
    const map = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      preparando: 'bg-blue-100 text-blue-800',
      en_camino: 'bg-purple-100 text-purple-800',
      entregado: 'bg-green-100 text-green-800',
      cancelado: 'bg-red-100 text-red-800',
    }
    const labelMap = {
      pendiente: 'Pendiente',
      preparando: 'Preparando',
      en_camino: 'En camino',
      entregado: 'Entregado',
      cancelado: 'Cancelado',
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-800'}`}>
        {labelMap[status] || status}
      </span>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Resumen general de tu negocio</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={DollarSign} label="Ventas Hoy" value={formatCLP(dashboard?.sales_today)} color="huevo" />
          <StatCard icon={ShoppingCart} label="Pedidos Hoy" value={dashboard?.orders_today || 0} color="palta" />
          <StatCard icon={Users} label="Total Clientes" value={dashboard?.total_customers || 0} color="blue" />
          <StatCard icon={TrendingUp} label="Cuentas por Cobrar" value={formatCLP(dashboard?.accounts_receivable)} color="red" />
        </div>

        {/* Second row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={DollarSign} label="Ventas del Mes" value={formatCLP(dashboard?.sales_month)} color="palta" />
          <StatCard icon={Clock} label="Pedidos Pendientes" value={dashboard?.orders_pending || 0} color="huevo" />
          <StatCard icon={AlertTriangle} label="Stock Bajo" value={dashboard?.low_stock_count || 0} color="red" />
        </div>

        {/* Charts + Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Pedidos pendientes de entrega</h2>
              <a href="/orders" className="text-sm text-palta-600 hover:text-palta-700 font-medium">Ver todos →</a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">#</th>
                    <th className="text-left px-5 py-3 font-medium">Cliente</th>
                    <th className="text-left px-5 py-3 font-medium">Productos</th>
                    <th className="text-left px-5 py-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dashboard?.pending_delivery_orders?.length > 0 ? dashboard.pending_delivery_orders.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-gray-500">#{o.id}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">{o.customer_name || 'N/A'}</td>
                      <td className="px-5 py-3 text-gray-700">{formatProducts(o.items)}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">{formatCLP(o.total)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No hay pedidos pendientes</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low Stock Alert */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">⚠️ Stock Bajo</h2>
              <a href="/products" className="text-sm text-palta-600 hover:text-palta-700 font-medium">Ver productos →</a>
            </div>
            <div className="p-4 space-y-3">
              {lowStock.length > 0 ? lowStock.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.product_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{p.stock} {p.unit}</p>
                    <p className="text-xs text-gray-500">min: {p.min_stock}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-10 h-10 text-palta-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Todo el stock está en orden</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
