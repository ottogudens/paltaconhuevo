import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { DollarSign, TrendingUp, Package, Percent } from 'lucide-react'

export default function FinanceStatsPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [paymentStatus, setPaymentStatus] = useState('pagado')
  const [pieChartMetric, setPieChartMetric] = useState('total_quantity')
  const [sortConfig, setSortConfig] = useState({ key: 'total_profit', direction: 'desc' })

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/finance/stats/?period=${period}&payment_status=${paymentStatus}`)
      setStats(res.data)
    } catch (error) {
      console.error('Error fetching finance stats', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [period, paymentStatus])

  const formatCLP = (n) => `$${Math.round(n || 0).toLocaleString('es-CL')}`
  const formatPct = (n) => `${(n || 0).toFixed(1)}%`

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'desc' } // default sort desc
    })
  }

  const sortedProducts = [...(stats?.product_stats || [])].sort((a, b) => {
    const valA = a[sortConfig.key]
    const valB = b[sortConfig.key]

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  // Colors for charts
  const PIE_COLORS = ['#3cb853', '#f5b041', '#3498db', '#e74c3c', '#9b59b6', '#1abc9c', '#34495e']

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Estadísticas Financieras</h1>
            <p className="text-gray-500 text-sm mt-1">Análisis de rentabilidad y volumen de ventas</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Estado:</span>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-palta-500 focus:border-palta-500 block p-2"
            >
               <option value="pagado">Solo Pagados</option>
               <option value="all">Todos</option>
            </select>
            <span className="text-sm text-gray-500 ml-2">Período:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-palta-500 focus:border-palta-500 block p-2"
            >
              <option value="day">Hoy</option>
              <option value="week">Esta semana</option>
              <option value="month">Este mes</option>
              <option value="year">Este año</option>
              <option value="all">Historico</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-palta-600" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg shrink-0"><DollarSign className="w-6 h-6" /></div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Ingresos (Ventas)</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCLP(stats?.summary?.total_revenue)}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
                <div className="p-3 bg-palta-100 text-palta-600 rounded-lg shrink-0"><TrendingUp className="w-6 h-6" /></div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Utilidad Total (Ganancia)</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCLP(stats?.summary?.total_profit)}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
                <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg shrink-0"><Package className="w-6 h-6" /></div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Volumen Vendido</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.summary?.total_quantity} unid.</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-lg shrink-0"><Percent className="w-6 h-6" /></div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Margen Promedio</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPct(stats?.summary?.avg_margin_pct)}</p>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart - Top 10 Profit */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Top 10 Productos más rentables</h2>
                {stats?.product_stats?.length > 0 ? (
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.product_stats.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="product__name" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(val) => `$${val/1000}k`} />
                        <Tooltip formatter={(val) => formatCLP(val)} labelStyle={{ color: 'black' }} />
                        <Legend />
                        <Bar dataKey="total_profit" name="Utilidad" fill="#3cb853" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="total_revenue" name="Ingresos" fill="#3498db" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center text-gray-400">Sin datos</div>
                )}
              </div>

              {/* Pie Chart - Volume/Sales */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 relative">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="font-semibold text-gray-900">Volumen de ventas (Top 7)</h2>
                  <select 
                    value={pieChartMetric} 
                    onChange={e => setPieChartMetric(e.target.value)}
                    className="text-xs border-gray-200 rounded p-1 text-gray-600 bg-gray-50"
                  >
                    <option value="total_quantity">Por Cantidad</option>
                    <option value="total_revenue">Por Ingresos ($)</option>
                    <option value="total_profit">Por Utilidad ($)</option>
                  </select>
                </div>
                {stats?.product_stats?.length > 0 ? (
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={stats.product_stats.sort((a,b) => b[pieChartMetric] - a[pieChartMetric]).slice(0, 7)} 
                          dataKey={pieChartMetric} 
                          nameKey="product__name" 
                          cx="50%" cy="50%" 
                          outerRadius={110} 
                          label
                        >
                          {stats.product_stats.slice(0, 7).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val) => pieChartMetric === 'total_quantity' ? `${val} unid.` : formatCLP(val)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center text-gray-400">Sin datos</div>
                )}
              </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Análisis detallado por producto</h2>
              </div>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-5 py-3 font-medium cursor-pointer hover:bg-gray-100" onClick={() => handleSort('product__name')}>
                        Producto {sortConfig.key === 'product__name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-5 py-3 font-medium cursor-pointer hover:bg-gray-100 text-right" onClick={() => handleSort('total_quantity')}>
                        Volumen (unid.) {sortConfig.key === 'total_quantity' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-5 py-3 font-medium cursor-pointer hover:bg-gray-100 text-right" onClick={() => handleSort('total_revenue')}>
                        Ingresos {sortConfig.key === 'total_revenue' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-5 py-3 font-medium cursor-pointer hover:bg-gray-100 text-right" onClick={() => handleSort('total_profit')}>
                        Utilidad {sortConfig.key === 'total_profit' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-5 py-3 font-medium text-right">Margen (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sortedProducts.map((p, idx) => {
                      const pct = p.total_revenue > 0 ? (p.total_profit / p.total_revenue) * 100 : 0;
                      return (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3 font-medium text-gray-900">{p.product__name}</td>
                          <td className="px-5 py-3 text-right text-gray-700">{p.total_quantity}</td>
                          <td className="px-5 py-3 text-right text-gray-700">{formatCLP(p.total_revenue)}</td>
                          <td className="px-5 py-3 text-right font-bold text-palta-600">{formatCLP(p.total_profit)}</td>
                          <td className="px-5 py-3 text-right">
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${pct >= 30 ? 'bg-green-100 text-green-700' : pct >= 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                              {formatPct(pct)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                    {sortedProducts.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-5 py-8 text-center text-gray-400">No hay datos en este período</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="block sm:hidden divide-y divide-gray-100">
                {sortedProducts.map((p, idx) => {
                  const pct = p.total_revenue > 0 ? (p.total_profit / p.total_revenue) * 100 : 0;
                  return (
                    <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-gray-900 leading-tight">
                          {p.product__name}
                        </p>
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${pct >= 30 ? 'bg-green-100 text-green-700' : pct >= 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {formatPct(pct)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-gray-600 mt-2">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-400">Volumen</span>
                          <span>{p.total_quantity} unid.</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-xs text-gray-400">Ingresos</span>
                          <span>{formatCLP(p.total_revenue)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-50">
                        <span className="text-xs text-gray-500 font-medium tracking-wide">UTILIDAD</span>
                        <span className="font-black text-palta-600 text-lg">
                          {formatCLP(p.total_profit)}
                        </span>
                      </div>
                    </div>
                  )
                })}
                {sortedProducts.length === 0 && (
                  <div className="p-8 text-center text-gray-400">No hay datos en este período</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
