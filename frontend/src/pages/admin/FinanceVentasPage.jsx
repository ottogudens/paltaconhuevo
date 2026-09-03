import React, { useState, useEffect, useRef } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { TrendingUp, Download, Sparkles, Filter, Calendar, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react'

function ImportSalesModal({ onClose, onSave }) {
  const [file, setFile] = useState(null)
  const [importMode, setImportMode] = useState('update')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef()

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/finance/import/sales/template/', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'plantilla_ventas.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) { alert('Error al descargar plantilla') }
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('import_mode', importMode)
      const res = await api.post('/finance/import/sales/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(res.data)
      if (res.data.created > 0) onSave()
    } catch (e) {
      alert('Error al importar: ' + (e.userMessage || e.message))
    } finally { setImporting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Importar Ventas Detalladas</h2>
            <p className="text-sm text-gray-500 mt-0.5">Carga masiva de productos vendidos</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1: Download template */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-sm font-semibold text-blue-800 mb-1">Paso 1 — Descarga la plantilla</p>
            <p className="text-xs text-blue-600 mb-3">Incluye filas de ejemplo con los valores válidos.</p>
            <button onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" /> Descargar plantilla .xlsx
            </button>
          </div>

          {/* Step 2: Import mode */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Paso 2 — Modo de importación</p>
            <div className="grid grid-cols-2 gap-3">
              {[{v:'update',label:'Agregar al existente',desc:'Agrega nuevos pedidos/ítems'},
                {v:'replace',label:'Reemplazar todo',desc:'⚠️ Elimina TODOS los pedidos actuales antes de importar'}].map(opt => (
                <button key={opt.v} onClick={() => setImportMode(opt.v)}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    importMode === opt.v ? 'border-palta-500 bg-palta-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Upload file */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Paso 3 — Sube el archivo</p>
            <div
              onClick={() => fileRef.current.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-palta-400 hover:bg-palta-50 transition-all">
              <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-gray-400" />
              {file ? (
                <p className="text-sm font-medium text-palta-700">{file.name}</p>
              ) : (
                <p className="text-sm text-gray-500">Haz clic para seleccionar un archivo <strong>.xlsx o .csv</strong></p>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={e => setFile(e.target.files[0])} />
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-xl p-4 ${
              result.errors?.length ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {result.errors?.length
                  ? <AlertCircle className="w-5 h-5 text-amber-600" />
                  : <CheckCircle2 className="w-5 h-5 text-green-600" />}
                <p className="text-sm font-semibold text-gray-800">
                  {result.created} productos importados correctamente
                </p>
              </div>
              {result.errors?.length > 0 && (
                <ul className="text-xs text-amber-800 space-y-1 mt-2 max-h-32 overflow-y-auto">
                  {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cerrar</button>
          <button onClick={handleImport} disabled={!file || importing}
            className="px-4 py-2 text-sm bg-palta-600 text-white rounded-lg hover:bg-palta-700 disabled:opacity-50 flex items-center gap-2 transition-colors">
            <Upload className="w-4 h-4" /> {importing ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FinanceVentasPage() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('pagado')
  const [showImportModal, setShowImportModal] = useState(false)
  
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products/')
      const allProducts = res.data.results || res.data || []
      setProducts(allProducts.filter(p => p.can_be_sold !== false))
    } catch (e) { console.error('Error fetching products', e) }
  }

  const fetchSales = async () => {
    setLoading(true)
    try {
      const params = { payment_status: paymentStatus }
      if (filterDate) params.start_date = filterDate
      if (productId) params.product_id = productId
      const res = await api.get('/finance/sales/', { params })
      setSales(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    fetchSales()
  }, [filterDate, paymentStatus, productId])

  const formatCLP = (n) => `$${(n || 0).toLocaleString('es-CL')}`

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID Pedido,Producto,Cantidad,Subtotal,Margen,Cliente,Medio Pago,Fecha\n"
      + sales.map(s => `${s.order_id},"${s.product_name}",${s.quantity},${s.subtotal},${s.margin},"${s.customer_identifier || s.customer_name}",${s.payment_method},${s.date}`).join("\n");
      
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
             <select
               value={productId}
               onChange={(e) => setProductId(e.target.value)}
               className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-palta-500 focus:border-palta-500 block p-2 max-w-[150px]"
             >
               <option value="">Todos los Productos</option>
               {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
            <button onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 text-sm font-medium transition-colors shadow-2xs">
              <Upload className="w-4 h-4" /> Importar
            </button>
            <button onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-palta-50 border border-palta-200 text-palta-800 rounded-lg hover:bg-palta-100 text-sm font-medium transition-colors shadow-2xs">
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          </div>
        </div>

        {!loading && sales.length > 0 && (
          <div className="bg-palta-50 border border-palta-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center shadow-sm gap-4">
             <div className="flex gap-6 items-center w-full sm:w-auto text-center sm:text-left justify-around sm:justify-start">
               <div>
                  <p className="text-sm text-palta-800 font-medium">Total de Ingresos</p>
                  <p className="text-2xl font-bold text-palta-900">
                    {formatCLP(sales.reduce((acc, curr) => acc + (parseFloat(curr.subtotal) || 0), 0))}
                  </p>
               </div>
               <div className="border-l border-palta-200 pl-6">
                  <p className="text-sm text-palta-800 font-medium">Utilidad Generada</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCLP(sales.reduce((acc, curr) => acc + (parseFloat(curr.margin) || 0), 0))}
                  </p>
               </div>
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
                    <th className="text-right px-5 py-3 font-medium text-gray-600">Margen</th>
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
                      <td className="px-5 py-3 text-right font-bold text-gray-900">
                        {formatCLP(s.subtotal)}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-green-600">
                        {formatCLP(s.margin)}
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
      {showImportModal && <ImportSalesModal onClose={() => setShowImportModal(false)} onSave={fetchSales} />}
    </AdminLayout>
  )
}
