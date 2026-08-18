import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import { Users, Search, Star, ShoppingCart, Ticket, ChevronRight, X } from 'lucide-react'

export default function CustomersLoyaltyTab() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [historyData, setHistoryData] = useState(null)
  const [loadingHistory, setLoadingHistory] = useState(false)

  const fetchCustomers = async (p = 1) => {
    try {
      const res = await api.get('/auth/customers/', { params: { page: p, search } })
      if (p === 1) {
        setCustomers(res.data.results || res.data || [])
      } else {
        setCustomers(prev => [...prev, ...(res.data.results || [])])
      }
      setHasMore(res.data.next !== null)
      setPage(p)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const delay = setTimeout(() => {
      setLoading(true)
      fetchCustomers(1)
    }, 500)
    return () => clearTimeout(delay)
  }, [search])

  const openCustomerHistory = async (customer) => {
    setSelectedCustomer(customer)
    setLoadingHistory(true)
    setHistoryData(null)
    try {
      const res = await api.get(`/auth/customers/${customer.id}/history/`)
      setHistoryData(res.data)
    } catch (e) {
      alert('Error al cargar historial')
    } finally {
      setLoadingHistory(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Star className="w-6 h-6 text-palta-600" />
            Fidelización de Clientes
          </h1>
          <p className="text-gray-500 text-sm mt-1">Busca clientes y revisa sus puntos, nivel y compras.</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="Buscar cliente por nombre o email..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-palta-500 focus:border-transparent" 
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading && page === 1 ? (
          <div className="py-16 text-center text-gray-400">Cargando clientes...</div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center text-gray-400">No se encontraron clientes.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 font-medium text-gray-600">Cliente</th>
                  <th className="px-5 py-3 font-medium text-gray-600">Contacto</th>
                  <th className="px-5 py-3 text-right font-medium text-gray-600">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map(c => (
                  <tr key={c.id} className="hover:bg-palta-50/30 transition-colors cursor-pointer" onClick={() => openCustomerHistory(c)}>
                    <td className="px-5 py-4 font-medium text-gray-900">{c.first_name} {c.last_name || ''}</td>
                    <td className="px-5 py-4 text-gray-500">{c.email}<br/><span className="text-xs text-gray-400">{c.whatsapp_number}</span></td>
                    <td className="px-5 py-4 text-right">
                      <button className="text-palta-600 hover:text-palta-800 font-medium inline-flex items-center gap-1">
                        Ver Ficha <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {hasMore && !loading && (
          <div className="p-4 border-t border-gray-100 text-center">
            <button onClick={() => fetchCustomers(page + 1)} className="text-palta-600 font-medium text-sm hover:underline">
              Cargar más
            </button>
          </div>
        )}
      </div>

      {/* History Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-palta-400 to-palta-600 flex items-center justify-center text-xl font-bold text-white shadow-sm">
                  {(selectedCustomer.first_name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedCustomer.first_name} {selectedCustomer.last_name}</h2>
                  <p className="text-sm text-gray-500">{selectedCustomer.email} • {selectedCustomer.whatsapp_number || 'Sin Teléfono'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-8 bg-gray-50/30">
              {loadingHistory ? (
                <div className="py-20 text-center text-gray-400 animate-pulse">Cargando historial completo...</div>
              ) : historyData ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Puntos Actuales</p>
                      <p className="text-3xl font-black text-palta-600">{historyData.loyalty.points}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nivel</p>
                      <p className="text-2xl font-black text-huevo-500 capitalize">{historyData.loyalty.level}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Puntos Históricos</p>
                      <p className="text-2xl font-bold text-gray-800">{historyData.loyalty.total_earned}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Compras</p>
                      <p className="text-2xl font-bold text-gray-800">${historyData.loyalty.total_purchases.toLocaleString('es-CL')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Pedidos */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-gray-400" />
                        <h3 className="font-bold text-gray-900">Últimos Pedidos</h3>
                      </div>
                      <div className="p-0">
                        {historyData.orders.length === 0 ? (
                          <p className="p-4 text-sm text-gray-500 text-center">Sin pedidos registrados.</p>
                        ) : (
                          <ul className="divide-y divide-gray-50">
                            {historyData.orders.slice(0, 5).map(o => (
                              <li key={o.id} className="p-4 flex justify-between items-center text-sm">
                                <div>
                                  <p className="font-medium text-gray-900">Pedido #{o.id}</p>
                                  <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-gray-900">${parseFloat(o.total_price).toLocaleString('es-CL')}</p>
                                  <p className="text-xs capitalize text-palta-600">{o.status}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Historial de Puntos */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500" />
                        <h3 className="font-bold text-gray-900">Actividad de Puntos</h3>
                      </div>
                      <div className="p-0">
                        {historyData.points_history.length === 0 ? (
                          <p className="p-4 text-sm text-gray-500 text-center">Sin movimientos.</p>
                        ) : (
                          <ul className="divide-y divide-gray-50 h-[280px] overflow-y-auto">
                            {historyData.points_history.map((t, idx) => (
                              <li key={idx} className="p-4 flex justify-between items-center text-sm">
                                <div>
                                  <p className="font-medium text-gray-900">{t.description}</p>
                                  <p className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString()}</p>
                                </div>
                                <span className={`font-bold ${t.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {t.points > 0 ? '+' : ''}{t.points}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
