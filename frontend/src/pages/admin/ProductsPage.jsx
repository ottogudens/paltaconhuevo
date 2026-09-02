import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import PriceCalculatorModal from '../../components/PriceCalculatorModal'
import ImportModal from '../../components/ImportModal'
import { Package, Search, Plus, Edit3, Trash2, X, Check, AlertTriangle, Calculator, Download, Upload } from 'lucide-react'

const EMPTY_PRODUCT = { name: '', product_type: 'palta', unit: 'unidad', purchase_price: 0, sale_price: '', stock: 0, min_stock: 5, description: '', is_bundle: false, can_be_sold: true, purchase_multiplier: 1, components: [] }

const formatCLP = (n) => `$${(n || 0).toLocaleString('es-CL')}`

function ProductModal({ product, allProducts, onClose, onSave }) {
  const [form, setForm] = useState(product ? { ...EMPTY_PRODUCT, ...product } : EMPTY_PRODUCT)
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(product?.image || null)
  const [saving, setSaving] = useState(false)
  const isEdit = !!product?.id

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', form.name)
      formData.append('product_type', form.product_type)
      formData.append('unit', form.unit)
      formData.append('purchase_price', form.purchase_price || 0)
      formData.append('sale_price', form.sale_price || 0)
      formData.append('stock', form.is_bundle ? 0 : form.stock || 0)
      formData.append('min_stock', form.is_bundle ? 0 : form.min_stock || 0)
      formData.append('description', form.description || '')
      // FormData no soporta booleanos; DRF acepta 'true'/'false' como strings
      formData.append('is_bundle', form.is_bundle ? 'true' : 'false')
      formData.append('can_be_sold', form.can_be_sold ? 'true' : 'false')
      formData.append('purchase_multiplier', form.purchase_multiplier || 1)
      formData.append('is_active', 'true')
      if (form.is_bundle) {
        formData.append('components', JSON.stringify(form.components || []))
      }
      if (imageFile) {
        formData.append('image', imageFile)
      }

      if (isEdit) {
        await api.patch(`/products/${product.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        await api.post('/products/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }
      onSave()
      onClose()
    } catch (e) {
      console.error('Error al guardar producto:', e)
      const msg = e.userMessage || (e.response?.data ? JSON.stringify(e.response.data) : e.message) || 'Error desconocido'
      alert(`Error al guardar producto:\n${msg}`)
    } finally { setSaving(false) }
  }


  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Editar' : 'Nuevo'} Producto</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Imagen del Producto</label>
            <div className="flex items-center gap-4">
              {previewUrl ? (
                <img src={previewUrl} alt="Vista previa" className="w-16 h-16 object-cover rounded-lg border" />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400">
                  <Package className="w-8 h-8" />
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleImageChange} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-palta-50 file:text-palta-700 hover:file:bg-palta-100 cursor-pointer" />
            </div>
          </div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio Venta ($)</label>
            <input type="number" value={form.sale_price} onChange={e => setForm({...form, sale_price: e.target.value})} required min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="Precio cliente" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_bundle" checked={form.is_bundle} onChange={e => setForm({...form, is_bundle: e.target.checked})} className="w-4 h-4 text-palta-600 focus:ring-palta-500 border-gray-300 rounded" />
              <label htmlFor="is_bundle" className="text-sm font-medium text-gray-700">Combo / Mix compuesto</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="can_be_sold" checked={form.can_be_sold !== false} onChange={e => setForm({...form, can_be_sold: e.target.checked})} className="w-4 h-4 text-palta-600 focus:ring-palta-500 border-gray-300 rounded" />
              <label htmlFor="can_be_sold" className="text-sm font-medium text-gray-700">Disponible para Venta al Cliente</label>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Multiplicador de Compra al Proveedor</label>
            <div className="flex text-sm text-gray-500 mb-1">Si compras "1" de este producto, cuántas unidades se añadirán al stock interno (Ej. Caja = 180).</div>
            <input type="number" value={form.purchase_multiplier} onChange={e => setForm({...form, purchase_multiplier: e.target.value})} required min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="1" />
          </div>
          
          {!form.is_bundle ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio Compra ($)</label>
                <input type="number" value={form.purchase_price} onChange={e => setForm({...form, purchase_price: e.target.value})} min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="Costo de compra" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                <input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} min="0" step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
                <input type="number" value={form.min_stock} onChange={e => setForm({...form, min_stock: e.target.value})} min="0" step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" />
              </div>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 mb-2">
              <strong>Info:</strong> El Stock y Precio de Compra de los combos se calculan automáticamente en base a los componentes seleccionados a continuación.
            </div>
          )}

          {form.is_bundle && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
               <div className="mb-3 flex items-center justify-between">
                 <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Package className="w-4 h-4" /> Componentes del Combo</h3>
                 <span className="text-sm font-bold text-palta-600 bg-palta-50 px-2 py-1 rounded">Costo Calculado: {formatCLP((form.components || []).reduce((acc, comp) => { const child = allProducts.find(p => p.id === parseInt(comp.product)); return acc + (parseFloat(child?.purchase_price || 0) * parseFloat(comp.quantity || 1)); }, 0))}</span>
               </div>
               <div className="space-y-3">
                 {(form.components || []).map((comp, idx) => (
                   <div key={idx} className="flex gap-2 items-center">
                     <select required value={comp.product} onChange={e => {
                        const newC = [...form.components];
                        newC[idx].product = e.target.value;
                        setForm({...form, components: newC});
                     }} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500">
                       <option value="">Seleccione producto...</option>
                       {allProducts.filter(p => !p.is_bundle).map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                       ))}
                     </select>
                     <input type="number" required min="0.01" step="0.01" value={comp.quantity} onChange={e => {
                        const newC = [...form.components];
                        newC[idx].quantity = e.target.value;
                        setForm({...form, components: newC});
                     }} className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="Cant." />
                     <button type="button" onClick={() => {
                        const newC = form.components.filter((_, i) => i !== idx);
                        setForm({...form, components: newC});
                     }} className="p-2 text-red-500 hover:bg-red-100 rounded-lg">
                       <X className="w-4 h-4" />
                     </button>
                   </div>
                 ))}
                 <button type="button" onClick={() => {
                    setForm({...form, components: [...(form.components || []), {product: '', quantity: 1}]})
                 }} className="text-sm font-medium text-palta-600 hover:text-palta-800 flex items-center gap-1">
                   <Plus className="w-4 h-4" /> Añadir componente
                 </button>
               </div>
            </div>
          )}
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
  const [showCalculator, setShowCalculator] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
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

  const handleQuickUpdate = async (id, field, value) => {
    try {
      await api.patch(`/products/${id}/`, { [field]: value })
      fetchProducts()
    } catch (e) {
      alert('Error al actualizar')
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/products/import/template/', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'plantilla_productos.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      alert('Error al descargar plantilla')
    }
  }

  const filtered = products.filter(p => {
    if (!search) return true
    return p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.product_type.toLowerCase().includes(search.toLowerCase())
  })
  const typeEmoji = { palta: '🥑', huevo: '🥚', otro: '📦' }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
            <p className="text-gray-500 text-sm mt-1">{filtered.length} productos activos</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium" title="Descargar Plantilla">
              <Download className="w-4 h-4" /> Plantilla
            </button>
            <button onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
              <Upload className="w-4 h-4" /> Importar
            </button>
            <button onClick={() => setShowCalculator(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-palta-50 text-palta-700 border border-palta-200 rounded-lg hover:bg-palta-100 text-sm font-medium">
              <Calculator className="w-4 h-4" /> Calculadora
            </button>
            <button onClick={() => { setEditProduct(null); setShowModal(true) }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-palta-600 text-white rounded-lg hover:bg-palta-700 text-sm font-medium">
              <Plus className="w-4 h-4" /> Nuevo Producto
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-palta-500 focus:border-transparent" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-palta-600" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(p => {
              const isLow = !p.is_bundle && parseFloat(p.stock) <= parseFloat(p.min_stock)
              return (
                <div key={p.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${isLow ? 'border-red-200' : 'border-gray-100'}`}>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-12 h-12 object-cover rounded-lg border" />
                        ) : (
                          <span className="text-3xl">{typeEmoji[p.product_type] || '📦'}</span>
                        )}
                        <div>
                          <input 
                            type="text" 
                            defaultValue={p.name}
                            onBlur={e => {
                              if (e.target.value !== p.name && e.target.value.trim() !== '') {
                                handleQuickUpdate(p.id, 'name', e.target.value.trim())
                              } else {
                                e.target.value = p.name
                              }
                            }}
                            className="font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-palta-500 focus:outline-none w-full max-w-[150px] p-0 focus:ring-0"
                          />
                          <p className="text-xs text-gray-500 capitalize mt-1">{p.product_type} · {p.unit}</p>
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
                    <div className="flex items-end justify-between mt-4">
                      <div>
                        <div className="flex items-center">
                          <span className="text-palta-700 font-bold text-xl">$</span>
                          <input 
                            type="number"
                            defaultValue={p.sale_price}
                            onBlur={e => {
                              if (e.target.value != p.sale_price && e.target.value !== '') {
                                handleQuickUpdate(p.id, 'sale_price', e.target.value)
                              } else {
                                e.target.value = p.sale_price
                              }
                            }}
                            className="w-24 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-palta-500 focus:outline-none focus:ring-0 text-xl font-bold text-palta-700 p-0 ml-1"
                          />
                        </div>
                        <div className="flex gap-2 mt-1">
                          <p className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-medium">Costo: {formatCLP(p.purchase_price)}</p>
                          <p className="text-[10px] text-palta-600 bg-palta-50 px-1.5 py-0.5 rounded font-bold">Margen: {formatCLP(p.sale_price - (p.purchase_price || 0))}</p>
                        </div>
                      </div>
                      <div className={`text-right px-3 py-1.5 rounded-lg ${isLow ? 'bg-red-50' : 'bg-gray-50'} flex flex-col items-end`}>
                        <div className="flex items-center gap-1">
                          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                          {p.is_bundle ? (
                             <span className="font-bold text-sm text-palta-600 px-2 py-1 rounded bg-palta-50 border border-palta-200" title="Calculado por subproductos">COMBO</span>
                          ) : (
                            <input 
                              type="number" 
                              step="0.01"
                              defaultValue={p.stock}
                              onBlur={e => {
                                if (e.target.value != p.stock && e.target.value !== '') {
                                  handleQuickUpdate(p.id, 'stock', e.target.value)
                                } else {
                                  e.target.value = p.stock
                                }
                              }}
                              className={`w-16 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-palta-500 focus:outline-none focus:ring-0 text-sm font-bold text-right p-0 ${isLow ? 'text-red-600' : 'text-gray-700'}`}
                            />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">stock</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No se encontraron productos</p>
          </div>
        )}
      </div>

      {showModal && (
        <ProductModal product={editProduct} allProducts={products} onClose={() => setShowModal(false)} onSave={fetchProducts} />
      )}
      {showCalculator && (
        <PriceCalculatorModal onClose={() => setShowCalculator(false)} />
      )}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={fetchProducts}
        title="Importar Productos"
        endpoint="/products/import/"
      />
    </AdminLayout>
  )
}
