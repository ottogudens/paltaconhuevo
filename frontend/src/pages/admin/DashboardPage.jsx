import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import {
  TrendingUp, Users, ShoppingCart, DollarSign,
  AlertTriangle, Clock, Truck, CheckCircle2
} from 'lucide-react'
import { Link } from 'react-router-dom'
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
  const [salesPeriod, setSalesPeriod] = useState('month')

  const fetchDashboard = async () => {
    try {
      const dashRes = await api.get(`/orders/dashboard/?sales_period=${salesPeriod}`)
      setDashboard(dashRes.data)
    } catch (e) {
      console.error('Dashboard fetch error:', e)
    }
  }

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const dashRes = await api.get(`/orders/dashboard/?sales_period=${salesPeriod}`)
        setDashboard(dashRes.data)
        setLowStock(stockRes.data || [])
      } catch (e) {
        console.error('Dashboard fetch error:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [salesPeriod])

  const handleOrderStatusChange = async (orderId, newStatus) => {
    try {
      await api.patch(`/orders/${orderId}/`, { status: newStatus })
      fetchDashboard()
    } catch (e) {
      alert('Error al actualizar estado')
    }
  }

  const STATUS_OPTIONS = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'preparando', label: 'Preparando' },
    { value: 'en_camino', label: 'En camino' },
    { value: 'parcialmente_entregado', label: 'Parcial. Entregado' },
    { value: 'entregado', label: 'Entregado' },
    { value: 'cancelado', label: 'Cancelado' },
  ]

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
        
        <div className="flex justify-end gap-2 mb-4">
             <span className="text-sm text-gray-500 self-center">Ver ventas por:</span>
             <select 
               value={salesPeriod} 
               onChange={e => setSalesPeriod(e.target.value)}
               className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-palta-500 focus:border-palta-500 block p-2"
             >
                <option value="day">Hoy</option>
                <option value="week">Esta Semana</option>
                <option value="month">Este Mes</option>
             </select>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={CheckCircle2} label="Ventas Pagadas (Mes)" value={formatCLP(dashboard?.sales_paid)} color="palta" />
          <StatCard icon={TrendingUp} label="Por Pagar (Entregado)" value={formatCLP(dashboard?.sales_unpaid)} color="red" />
          <StatCard icon={Clock} label="Pedidos Pendientes" value={dashboard?.orders_pending + ' (' + formatCLP(dashboard?.orders_pending_value) + ')'} color="huevo" />
          <StatCard icon={DollarSign} label="Ventas Período" value={formatCLP(dashboard?.sales_period_value)} color="blue" />
        </div>

        {/* Second row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={Users} label="Total Clientes" value={dashboard?.total_customers || 0} color="blue" />
          <StatCard icon={ShoppingCart} label="Pedidos Hoy" value={dashboard?.orders_today || 0} color="palta" />
          <StatCard icon={AlertTriangle} label="Stock Bajo" value={dashboard?.low_stock_count || 0} color="red" />
        </div>

        {/* Charts + Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Products Pie Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col items-center">
            <h2 className="font-semibold text-gray-900 self-start mb-2">Ventas por Producto</h2>
            {dashboard?.top_products?.length > 0 ? (
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dashboard.top_products} dataKey="total_sales" nameKey="product__name" cx="50%" cy="50%" outerRadius={80} fill="#62a344" label>
                      {dashboard.top_products.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#62a344', '#f5b041', '#3498db', '#e74c3c', '#9b59b6', '#1abc9c', '#34495e'][index % 7]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCLP(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-gray-400 mt-10">No hay datos suficientes</p>
            )}
          </div>

          {/* Top Products List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Top 5 Productos</h2>
            <div className="space-y-3">
              {dashboard?.top_products?.map((p, i) => (
                <div key={i} className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.product__name}</p>
                    <p className="text-xs text-gray-500">{p.total_quantity} unidades</p>
                  </div>
                  <p className="text-sm font-bold text-palta-600">{formatCLP(p.total_sales)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top Customers List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Top 5 Clientes</h2>
            <div className="space-y-3">
              {dashboard?.top_customers?.map((c, i) => (
                <div key={i} className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.customer__first_name} {c.customer__last_name}</p>
                    <p className="text-xs text-gray-500">@{c.customer__username} • {c.total_orders} pedidos</p>
                  </div>
                  <p className="text-sm font-bold text-palta-600">{formatCLP(c.total_spent)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Pedidos pendientes de entrega</h2>
              <Link to="/orders" className="text-sm text-palta-600 hover:text-palta-700 font-medium">Ver todos →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">#</th>
                    <th className="text-left px-5 py-3 font-medium">Cliente</th>
                    <th className="text-left px-5 py-3 font-medium">Productos</th>
                    <th className="text-left px-5 py-3 font-medium">Estado</th>
                    <th className="text-left px-5 py-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dashboard?.pending_delivery_orders?.length > 0 ? dashboard.pending_delivery_orders.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-gray-500">#{o.id}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">{o.customer_name || 'N/A'}</td>
                      <td className="px-5 py-3 text-gray-700">{formatProducts(o.items)}</td>
                      <td className="px-5 py-3">
                        <select value={o.status} onChange={e => handleOrderStatusChange(o.id, e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-palta-500">
                          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900">{formatCLP(o.total)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">No hay pedidos pendientes</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low Stock Alert */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">⚠️ Stock Bajo</h2>
              <Link to="/products" className="text-sm text-palta-600 hover:text-palta-700 font-medium">Ver productos →</Link>
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
