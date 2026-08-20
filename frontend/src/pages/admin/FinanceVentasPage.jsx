import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { TrendingUp, Download, Sparkles, Filter, Calendar } from 'lucide-react'

export default function FinanceVentasPage() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('pagado')

  const fetchSales = async () => {
    setLoading(true)
    try {
      const params = { payment_status: paymentStatus }
      if (filterDate) params.start_date = filterDate
      const res = await api.get('/finance/sales/', { params })
      setSales(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSales()
  }, [filterDate, paymentStatus])

  const formatCLP = (n) => `$${(n || 0).toLocaleString('es-CL')}`

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID Pedido,Producto,Cantidad,Subtotal,Cliente,Medio Pago,Fecha\n"
      + sales.map(s => `${s.order_id},"${s.product_name}",${s.quantity},${s.subtotal},"${s.customer_name}",${s.payment_method},${s.date}`).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ventas_detalladas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ventas Detalladas</h1>
            <p className="text-gray-500 text-sm mt-1">Análisis por ítem de cada pedido completado y pagado</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <select
               value={paymentStatus}
               onChange={(e) => setPaymentStatus(e.target.value)}
               className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-palta-500 focus:border-palta-500 block p-2"
             >
               <option value="pagado">Solo Pagados</option>
               <option value="all">Todos los Pedidos</option>
             </select>
             <div className="flex bg-white items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                 <Calendar className="w-4 h-4 text-gray-500" />
                 <input 
                    type="date" 
                    value={filterDate} 
                    onChange={e => setFilterDate(e.target.value)}
                    className="outline-none border-none bg-transparent"
                 />
                 {filterDate && <button onClick={() => setFilterDate('')} className="text-xs text-gray-400 hover:text-red-500 ml-2">X</button>}
             </div>
            <button onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-palta-50 border border-palta-200 text-palta-800 rounded-lg hover:bg-palta-100 text-sm font-medium transition-colors shadow-2xs">
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          </div>
        </div>

        {!loading && sales.length > 0 && (
          <div className="bg-palta-50 border border-palta-200 rounded-xl p-4 flex justify-between items-center shadow-sm">
             <div>
                <p className="text-sm text-palta-800 font-medium">Total de Ingresos Listados</p>
                <p className="text-2xl font-bold text-palta-900">
                  {formatCLP(sales.reduce((acc, curr) => acc + (parseFloat(curr.subtotal) || 0), 0))}
                </p>
             </div>
             <div className="text-right">
                <p className="text-sm text-palta-800 font-medium">Volumen de Productos</p>
                <p className="text-xl font-bold text-palta-900">
                  {sales.reduce((acc, curr) => acc + (parseInt(curr.quantity) || 0), 0)} unid.
                </p>
             </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-palta-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Fecha</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Pedido</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Cliente</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Producto</th>
                    <th className="text-center px-5 py-3 font-medium text-gray-600">Cantidad</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-600">Medio de Pago</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-600">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sales.length > 0 ? sales.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-500 font-medium">{s.date}</td>
                      <td className="px-5 py-3 text-gray-900 font-bold">#{s.order_id}</td>
                      <td className="px-5 py-3 text-gray-700 capitalize">{s.customer_name}</td>
                      <td className="px-5 py-3 text-gray-900 font-medium">{s.product_name}</td>
                      <td className="px-5 py-3 text-center text-gray-700 font-semibold">{s.quantity}</td>
                      <td className="px-5 py-3 text-right">
                          <span className="inline-flex bg-palta-50 text-palta-800 text-xs px-2 py-1 rounded-md capitalize">
                              {s.payment_method.replace('_', ' ')}
                          </span>
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-green-600">
                        {formatCLP(s.subtotal)}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                      <TrendingUp className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      No hay ventas registradas
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
