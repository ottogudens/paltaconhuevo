import React, { useState, useEffect, useRef } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { TrendingDown, Package, Plus, X, Check, ArrowDownCircle, Store, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react'

const CATEGORY_OPTIONS = [
  { value: 'gasto_operacional', label: 'Gasto operacional' },
  { value: 'combustible', label: 'Combustible' },
  { value: 'cajas', label: 'Cajas / Embalaje' },
  { value: 'despacho', label: 'Despacho' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'otro', label: 'Otro' },
]

function ImportFinanceModal({ onClose, onSave }) {
  const [file, setFile] = useState(null)
  const [importMode, setImportMode] = useState('update')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef()

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/finance/import/template/', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'plantilla_finanzas.xlsx'
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
      const res = await api.post('/finance/import/', fd, {
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
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Importar Transacciones</h2>
            <p className="text-sm text-gray-500 mt-0.5">Carga masiva de ingresos y egresos desde Excel</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1: Download template */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-sm font-semibold text-blue-800 mb-1">Paso 1 — Descarga la plantilla</p>
            <p className="text-xs text-blue-600 mb-3">Incluye filas de ejemplo con los valores válidos para cada columna.</p>
            <button onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" /> Descargar plantilla .xlsx
            </button>
          </div>

          {/* Step 2: Import mode */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Paso 2 — Modo de importación</p>
            <div className="grid grid-cols-2 gap-3">
              {[{v:'update',label:'Agregar al existente',desc:'No elimina nada, solo agrega filas nuevas'},
                {v:'replace',label:'Reemplazar todo',desc:'Elimina egresos actuales antes de importar'}].map(opt => (
                <button key={opt.v} onClick={() => setImportMode(opt.v)}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    importMode === opt.v ? 'border-palta-500 bg-palta-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
            {importMode === 'replace' && (
              <p className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠️ Las transacciones de tipo <strong>venta</strong> (generadas por pedidos) NO se eliminarán.
              </p>
            )}
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
                <p className="text-sm text-gray-500">Haz clic para seleccionar un archivo <strong>.xlsx</strong></p>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
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
                  {result.created} transacciones importadas correctamente
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

        {/* Footer */}
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

function ExpenseModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    transaction_type: 'egreso', category: 'gasto_operacional', amount: '', description: '', date: new Date().toISOString().split('T')[0]
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/finance/', form)
      onSave()
      onClose()
    } catch (e) { alert('Error al guardar') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Nuevo Gasto</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500">
                {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
            <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="Ej: Pago de luz" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
              <Check className="w-4 h-4" /> {saving ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PurchaseModal({ purchase, onClose, onSave, products }) {
  const isEdit = !!purchase?.id;
  const [form, setForm] = useState(purchase ? {
    supplier_name: purchase.supplier_name,
    product: purchase.product || purchase.product_id || '',
    quantity: purchase.quantity,
    unit_cost: purchase.unit_cost,
    purchase_date: purchase.purchase_date || purchase.date_str,
    notes: purchase.notes || ''
  } : {
    supplier_name: '', product: '', quantity: '', unit_cost: '', purchase_date: new Date().toISOString().split('T')[0], notes: ''
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
          ...form,
          quantity: parseFloat(form.quantity),
          unit_cost: parseFloat(form.unit_cost),
          total_cost: parseFloat(form.quantity) * parseFloat(form.unit_cost)
      }
      if (isEdit) {
        await api.patch(`/products/purchases/${purchase.id}/`, payload)
      } else {
        await api.post('/products/purchases/', payload)
      }
      onSave()
      onClose()
    } catch (e) { alert('Error al guardar') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Nueva Compra a Proveedor</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <input type="text" value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="Nombre Proveedor" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input type="date" value={form.purchase_date} onChange={e => setForm({...form, purchase_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
            <select value={form.product} onChange={e => setForm({...form, product: e.target.value})} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500">
              <option value="">Selecciona un producto</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad comprada</label>
                <input type="number" step="0.01" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} required min="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="0" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio Unitario ($)</label>
                <input type="number" value={form.unit_cost} onChange={e => setForm({...form, unit_cost: e.target.value})} required min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="0" />
            </div>
          </div>
          <div className="pt-2">
              <p className="text-xs text-gray-500">Al registrar la compra se añadirá el stock automáticamente.</p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={saving || !form.product}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              <Check className="w-4 h-4" /> {saving ? 'Guardando...' : (isEdit ? 'Actualizar Compra' : 'Registrar Compra')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function FinanceComprasPage() {
  const [items, setItems] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editPurchase, setEditPurchase] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [txRes, pchRes, prodRes] = await Promise.all([
        api.get('/finance/', { params: { type: 'egreso', page_size: 100 } }),
        api.get('/products/purchases/'),
        api.get('/products/')
      ])
      
      const transactions = (txRes.data.results || txRes.data || []).map(t => ({
          ...t, is_purchase: false, date_str: t.date
      }))
      
      const prodList = prodRes.data.results || prodRes.data || []
      const purchases = (pchRes.data.results || pchRes.data || []).map(p => {
          const prodMatch = prodList.find(pr => pr.id === (p.product || p.product_id))
          return {
            ...p,
            is_purchase: true,
            date_str: p.purchase_date,
            amount: p.total_cost,
            category: 'compra',
            product_display_name: prodMatch?.name || p.product_name || `Producto #${p.product || p.product_id}`,
          }
      })

      // Combinar y ordenar
      const combined = [...transactions, ...purchases].sort((a,b) => new Date(b.date_str) - new Date(a.date_str))
      setItems(combined)
      setProducts(prodList)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const handleDeletePurchase = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta compra? El stock se descontará automáticamente.')) return
    try {
      await api.delete(`/products/purchases/${id}/`)
      fetchData()
    } catch (e) { alert('Error al eliminar') }
  }

  const formatCLP = (n) => `$${(n || 0).toLocaleString('es-CL')}`

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Compras y Egresos</h1>
            <p className="text-gray-500 text-sm mt-1">Gestión del dinero que sale: pago a proveedores y operación</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 text-sm font-medium transition-colors">
              <Upload className="w-4 h-4" /> Importar
            </button>
            <button onClick={() => setShowExpenseModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 text-sm font-medium transition-colors">
              <TrendingDown className="w-4 h-4" /> Nuevo Gasto Operacional
            </button>
            <button onClick={() => setShowPurchaseModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
              <Package className="w-4 h-4" /> Nueva Compra a Proveedor
            </button>
          </div>
        </div>

        {/* Table */}
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
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Tipo</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Categoría</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Descripción / Origen</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-600">Monto</th>
                    <th className="text-center px-5 py-3 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.length > 0 ? items.map((t, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-500">{t.date_str}</td>
                      <td className="px-5 py-3">
                        {t.is_purchase ? (
                            <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-xs font-medium">
                              <Store className="w-3 h-3" /> Compra
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full text-xs font-medium">
                              <ArrowDownCircle className="w-3 h-3" /> Gasto
                            </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-600 capitalize">{t.category?.replace('_', ' ')}</td>
                      <td className="px-5 py-3 text-gray-900 font-medium">
                          {t.is_purchase ? (
                            <div>
                              <span>{t.product_display_name}</span>
                              <span className="text-xs text-gray-500 ml-2">({t.quantity} unid. — {t.supplier_name})</span>
                            </div>
                          ) : t.description}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-red-600">
                        -{formatCLP(t.amount)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {t.is_purchase && (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => { setEditPurchase(t); setShowPurchaseModal(true) }} className="text-gray-400 hover:text-blue-600" title="Editar">
                              ✏️
                            </button>
                            <button onClick={() => handleDeletePurchase(t.id)} className="text-gray-400 hover:text-red-600" title="Eliminar">
                              🗑️
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                      <TrendingDown className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      No hay compras ni egresos registrados
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showExpenseModal && <ExpenseModal onClose={() => setShowExpenseModal(false)} onSave={fetchData} />}
      {showPurchaseModal && <PurchaseModal purchase={editPurchase} onClose={() => { setShowPurchaseModal(false); setEditPurchase(null) }} onSave={fetchData} products={products} />}
      {showImportModal && <ImportFinanceModal onClose={() => setShowImportModal(false)} onSave={fetchData} />}
    </AdminLayout>
  )
}
