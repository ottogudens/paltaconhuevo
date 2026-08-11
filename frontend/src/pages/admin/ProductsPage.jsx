import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { Package, Search, Plus, Edit3, Trash2, X, Check, AlertTriangle } from 'lucide-react'

const EMPTY_PRODUCT = { name: '', product_type: 'palta', unit: 'unidad', sale_price: '', stock: 0, min_stock: 5, description: '' }

function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState(product || EMPTY_PRODUCT)
  const [saving, setSaving] = useState(false)
  const isEdit = !!product?.id

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEdit) {
        await api.patch(`/products/${product.id}/`, form)
      } else {
        await api.post('/products/', form)
      }
      onSave()
      onClose()
    } catch (e) {
      console.error(e)
      alert('Error al guardar producto')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Editar' : 'Nuevo'} Producto</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="Ej: Palta Hass" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select value={form.product_type} onChange={e => setForm({...form, product_type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500">
                <option value="palta">Palta</option>
                <option value="huevo">Huevo</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
              <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500">
                <option value="unidad">Unidad</option>
                <option value="kilo">Kilo</option>
                <option value="docena">Docena</option>
                <option value="caja">Caja</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio venta ($)</label>
              <input type="number" value={form.sale_price} onChange={e => setForm({...form, sale_price: e.target.value})} required min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
              <input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} min="0" step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
              <input type="number" value={form.min_stock} onChange={e => setForm({...form, min_stock: e.target.value})} min="0" step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="Opcional" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-palta-600 text-white rounded-lg hover:bg-palta-700 disabled:opacity-50 flex items-center gap-2">
              <Check className="w-4 h-4" /> {saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear Producto')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState(null)

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await api.get('/products/')
      setProducts(res.data.results || res.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchProducts() }, [])

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return
    try {
      await api.delete(`/products/${id}/`)
      fetchProducts()
    } catch (e) { alert('Error al eliminar') }
  }

  const filtered = products.filter(p => {
    if (!search) return true
    return p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.product_type.toLowerCase().includes(search.toLowerCase())
  })

  const formatCLP = (n) => `$${(n || 0).toLocaleString('es-CL')}`
  const typeEmoji = { palta: '🥑', huevo: '🥚', otro: '📦' }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
            <p className="text-gray-500 text-sm mt-1">{filtered.length} productos activos</p>
          </div>
          <button onClick={() => { setEditProduct(null); setShowModal(true) }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-palta-600 text-white rounded-lg hover:bg-palta-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Nuevo Producto
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-palta-500 focus:border-transparent" />
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-palta-600" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(p => {
              const isLow = parseFloat(p.stock) <= parseFloat(p.min_stock)
              return (
                <div key={p.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${isLow ? 'border-red-200' : 'border-gray-100'}`}>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{typeEmoji[p.product_type] || '📦'}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{p.name}</h3>
                          <p className="text-xs text-gray-500 capitalize">{p.product_type} · {p.unit}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditProduct(p); setShowModal(true) }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-palta-600">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(p.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold text-palta-700">{formatCLP(p.sale_price)}</p>
                        <p className="text-xs text-gray-500">por {p.unit}</p>
                      </div>
                      <div className={`text-right px-3 py-1.5 rounded-lg ${isLow ? 'bg-red-50' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-1">
                          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                          <p className={`text-sm font-bold ${isLow ? 'text-red-600' : 'text-gray-700'}`}>{p.stock}</p>
                        </div>
                        <p className="text-xs text-gray-500">stock</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-16 text-center">
            <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-gray-400">No hay productos</p>
          </div>
        )}
      </div>

      {showModal && (
        <ProductModal product={editProduct} onClose={() => setShowModal(false)} onSave={fetchProducts} />
      )}
    </AdminLayout>
  )
}
