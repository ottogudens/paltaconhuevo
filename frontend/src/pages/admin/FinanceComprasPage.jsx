import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { TrendingDown, Package, Plus, X, Check, ArrowDownCircle, Store } from 'lucide-react'

const CATEGORY_OPTIONS = [
  { value: 'gasto_operacional', label: 'Gasto operacional' },
  { value: 'combustible', label: 'Combustible' },
  { value: 'cajas', label: 'Cajas / Embalaje' },
  { value: 'despacho', label: 'Despacho' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'otro', label: 'Otro' },
]

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

function PurchaseModal({ onClose, onSave, products }) {
  const [form, setForm] = useState({
    supplier_name: '', product: '', quantity: '', unit_cost: '', purchase_date: new Date().toISOString().split('T')[0], notes: ''
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/products/purchases/', {
          ...form,
          quantity: parseFloat(form.quantity),
          unit_cost: parseFloat(form.unit_cost),
          total_cost: parseFloat(form.quantity) * parseFloat(form.unit_cost)
      })
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
              <Check className="w-4 h-4" /> {saving ? 'Guardando...' : 'Registrar Compra'}
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
      
      const purchases = (pchRes.data.results || pchRes.data || []).map(p => ({
          ...p,
          is_purchase: true,
          date_str: p.purchase_date,
          amount: p.total_cost,
          category: 'compra',
          description: `Compra a ${p.supplier_name}: ${p.quantity} unid. de ${p.product_id} (Reemplazar con nombre)` // Falta populate
      }))

      // Combinar y ordenar
      const combined = [...transactions, ...purchases].sort((a,b) => new Date(b.date_str) - new Date(a.date_str))
      setItems(combined)
      setProducts(prodRes.data.results || prodRes.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

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
                          {t.is_purchase ? `Proveedor: ${t.supplier_name}` : t.description}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-red-600">
                        -{formatCLP(t.amount)}
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
      {showPurchaseModal && <PurchaseModal onClose={() => setShowPurchaseModal(false)} onSave={fetchData} products={products} />}
    </AdminLayout>
  )
}
