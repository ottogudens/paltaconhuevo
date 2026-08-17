import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { ShoppingCart, Search, Filter, Download, Plus, Eye, Edit3, X, Check, Trash2 } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'preparando', label: 'Preparando' },
  { value: 'en_camino', label: 'En camino' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
]

const statusBadge = (status) => {
  const map = {
    pendiente: 'bg-yellow-100 text-yellow-800',
    preparando: 'bg-blue-100 text-blue-800',
    en_camino: 'bg-purple-100 text-purple-800',
    entregado: 'bg-green-100 text-green-800',
    cancelado: 'bg-red-100 text-red-800',
  }
  const labelMap = {
    pendiente: 'Pendiente', preparando: 'Preparando', en_camino: 'En camino',
    entregado: 'Entregado', cancelado: 'Cancelado',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100'}`}>
      {labelMap[status] || status}
    </span>
  )
}

const payBadge = (status) => {
  const map = {
    pendiente: 'bg-orange-100 text-orange-800',
    pagado: 'bg-green-100 text-green-800',
    vencido: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100'}`}>
      {status === 'pendiente' ? 'Por pagar' : status === 'pagado' ? 'Pagado' : 'Vencido'}
    </span>
  )
}

function OrderDetail({ order, onClose, onUpdate }) {
  const [status, setStatus] = useState(order.status)
  const [paymentStatus, setPaymentStatus] = useState(order.payment_status)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.patch(`/orders/${order.id}/`, { status, payment_status: paymentStatus })
      onUpdate()
      onClose()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const formatCLP = (n) => `$${(n || 0).toLocaleString('es-CL')}`

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Pedido #{order.id}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-6">
          {/* Customer info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cliente</p>
              <p className="font-medium">{order.customer_name || 'N/A'}</p>
              <p className="text-sm text-gray-500">{order.customer_phone || ''}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Entrega</p>
              <p className="font-medium capitalize">{order.delivery_type === 'despacho' ? 'Despacho' : 'Retiro'}</p>
              {order.delivery_address && <p className="text-sm text-gray-500">{order.delivery_address}</p>}
            </div>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Productos</p>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Producto</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Cant.</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Precio</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Subtotal</th>
                </tr></thead>
                <tbody>
                  {(order.items || []).map((item, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2">{item.product_name || `Producto #${item.product}`}</td>
                      <td className="px-4 py-2 text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-right">{formatCLP(item.unit_price)}</td>
                      <td className="px-4 py-2 text-right font-medium">{formatCLP(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-right">
              <span className="text-lg font-bold text-gray-900">Total: {formatCLP(order.total)}</span>
            </div>
          </div>

          {/* Status controls */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Estado del pedido</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500 focus:border-transparent">
                {STATUS_OPTIONS.filter(s => s.value).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Estado de pago</label>
              <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500 focus:border-transparent">
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
                <option value="vencido">Vencido</option>
              </select>
            </div>
          </div>

          {order.notes && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Notas</p>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{order.notes}</p>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm bg-palta-600 text-white rounded-lg hover:bg-palta-700 disabled:opacity-50 flex items-center gap-2">
            <Check className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateOrderModal({ onClose, onSave }) {
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [newCustomer, setNewCustomer] = useState({ first_name: '', last_name: '', phone: '', address: '', commune: '', email: '' })
  
  const [deliveryType, setDeliveryType] = useState('retiro')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryCommune, setDeliveryCommune] = useState('')
  const [deliveryCost, setDeliveryCost] = useState(0)
  
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [paymentCondition, setPaymentCondition] = useState('inmediato')
  const [notes, setNotes] = useState('')

  const [orderItems, setOrderItems] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          api.get('/auth/customers/'),
          api.get('/products/')
        ])
        setCustomers(cRes.data.results || cRes.data || [])
        setProducts(pRes.data.results || pRes.data || [])
      } catch (e) { console.error(e) }
    }
    loadData()
  }, [])

  const handleAddItem = (productId) => {
    if (!productId) return
    const prod = products.find(p => p.id === parseInt(productId))
    if (!prod) return
    if (orderItems.some(i => i.product_id === prod.id)) return
    setOrderItems([...orderItems, { product_id: prod.id, name: prod.name, unit: prod.unit, unit_price: prod.sale_price, quantity: 1 }])
  }

  const handleUpdateItem = (index, field, value) => {
    const copy = [...orderItems]
    copy[index][field] = value
    setOrderItems(copy)
  }

  const handleRemoveItem = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  const subtotal = orderItems.reduce((sum, item) => sum + (parseFloat(item.unit_price || 0) * parseFloat(item.quantity || 0)), 0)
  const total = subtotal + (deliveryType === 'despacho' ? parseFloat(deliveryCost || 0) : 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (orderItems.length === 0) {
      alert('Debe agregar al menos un producto al pedido')
      return
    }

    setSaving(true)
    try {
      let finalCustomerId = customerId
      if (isNewCustomer) {
        if (!newCustomer.first_name || !newCustomer.phone) {
          alert('Nombre y Teléfono son requeridos para el nuevo cliente')
          setSaving(false)
          return
        }
        const createdC = await api.post('/auth/customers/', newCustomer)
        finalCustomerId = createdC.data.id
      }

      if (!finalCustomerId) {
        alert('Debe seleccionar o registrar un cliente')
        setSaving(false)
        return
      }

      const payload = {
        customer_id: finalCustomerId,
        delivery_type: deliveryType,
        delivery_address: deliveryType === 'despacho' ? deliveryAddress : '',
        delivery_commune: deliveryType === 'despacho' ? deliveryCommune : '',
        delivery_cost: deliveryType === 'despacho' ? deliveryCost : 0,
        payment_method: paymentMethod,
        payment_condition: paymentCondition,
        notes,
        items: orderItems.map(i => ({
          product_id: i.product_id,
          quantity: parseFloat(i.quantity),
          unit_price: parseFloat(i.unit_price)
        }))
      }

      await api.post('/orders/', payload)
      onSave()
      onClose()
    } catch (e) {
      console.error(e)
      alert('Error al crear el pedido')
    } finally { setSaving(false) }
  }

  const formatCLP = (n) => `$${(n || 0).toLocaleString('es-CL')}`

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Crear Nuevo Pedido</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Cliente */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</label>
              <button type="button" onClick={() => setIsNewCustomer(!isNewCustomer)} className="text-xs text-palta-600 font-medium hover:underline">
                {isNewCustomer ? 'Seleccionar existente' : '+ Registrar nuevo cliente'}
              </button>
            </div>
            {isNewCustomer ? (
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
                <div>
                  <input type="text" placeholder="Nombre *" value={newCustomer.first_name} onChange={e => setNewCustomer({...newCustomer, first_name: e.target.value})} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <input type="text" placeholder="Teléfono *" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <input type="email" placeholder="Correo (opcional)" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <input type="text" placeholder="Dirección (opcional)" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
            ) : (
              <select value={customerId} onChange={e => setCustomerId(e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500">
                <option value="">Seleccionar cliente...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} ({c.phone || c.email || 'Sin contacto'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Entrega y Pago */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tipo de Entrega</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDeliveryType('retiro')}
                  className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${deliveryType === 'retiro' ? 'bg-palta-50 border-palta-500 text-palta-800' : 'border-gray-200 text-gray-600'}`}>
                  Retiro
                </button>
                <button type="button" onClick={() => setDeliveryType('despacho')}
                  className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${deliveryType === 'despacho' ? 'bg-palta-50 border-palta-500 text-palta-800' : 'border-gray-200 text-gray-600'}`}>
                  Delivery
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Método de Pago</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="mercadopago">MercadoPago</option>
              </select>
            </div>
          </div>

          {deliveryType === 'despacho' && (
            <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="col-span-2">
                <input type="text" placeholder="Dirección de envío" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <input type="number" placeholder="Costo envío ($)" value={deliveryCost} onChange={e => setDeliveryCost(e.target.value)} min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>
          )}

          {/* Productos */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Agregar Productos</label>
            <select onChange={e => { handleAddItem(e.target.value); e.target.value = '' }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3">
              <option value="">+ Seleccionar producto para agregar...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} - {formatCLP(p.sale_price)} ({p.unit})
                </option>
              ))}
            </select>

            {orderItems.length > 0 && (
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-xs text-gray-500">
                    <th className="text-left px-3 py-2">Producto</th>
                    <th className="text-right px-3 py-2 w-24">Cant.</th>
                    <th className="text-right px-3 py-2 w-28">Precio</th>
                    <th className="text-right px-3 py-2">Subtotal</th>
                    <th className="w-10"></th>
                  </tr></thead>
                  <tbody>
                    {orderItems.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-2 font-medium">{item.name}</td>
                        <td className="px-3 py-2 text-right">
                          <input type="number" value={item.quantity} onChange={e => handleUpdateItem(index, 'quantity', e.target.value)} min="0.01" step="0.01"
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-right" />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input type="number" value={item.unit_price} onChange={e => handleUpdateItem(index, 'unit_price', e.target.value)} min="0"
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-right" />
                        </td>
                        <td className="px-3 py-2 text-right font-bold">{formatCLP((item.quantity || 0) * (item.unit_price || 0))}</td>
                        <td className="px-3 py-2 text-center">
                          <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700">
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-3 text-right">
              <span className="text-lg font-bold text-gray-900">Total Pedido: {formatCLP(total)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-palta-600 text-white rounded-lg hover:bg-palta-700 disabled:opacity-50 flex items-center gap-2">
              <Check className="w-4 h-4" /> {saving ? 'Guardando...' : 'Crear Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      const res = await api.get('/orders/', { params })
      setOrders(res.data.results || res.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleDelete = async (e, orderId) => {
    e.stopPropagation()
    if (window.confirm('¿Está seguro de que desea eliminar este pedido? Esta acción restaurará el stock y no se puede deshacer.')) {
      try {
        await api.delete(`/orders/${orderId}/`)
        fetchOrders()
      } catch (err) {
        alert('Error al eliminar el pedido')
      }
    }
  }

  useEffect(() => { fetchOrders() }, [statusFilter])

  const filtered = orders.filter(o => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      String(o.id).includes(s) ||
      (o.customer_name || '').toLowerCase().includes(s)
    )
  })

  const formatCLP = (n) => `$${(n || 0).toLocaleString('es-CL')}`

  const handleExport = async () => {
    try {
      const res = await api.get('/orders/export/', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'pedidos_palta_con_huevo.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      alert('Error al exportar pedidos')
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
            <p className="text-gray-500 text-sm mt-1">{filtered.length} pedidos encontrados</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-palta-600 text-white rounded-lg hover:bg-palta-700 text-sm font-medium">
              <Plus className="w-4 h-4" /> Nuevo Pedido
            </button>
            <button onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
              <Download className="w-4 h-4" /> Exportar Excel
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Buscar por # o cliente..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-palta-500 focus:border-transparent" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map(s => (
              <button key={s.value} onClick={() => setStatusFilter(s.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === s.value
                    ? 'bg-palta-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}>
                {s.label}
              </button>
            ))}
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
                    <th className="text-left px-5 py-3 font-medium text-gray-600">#</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Cliente</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Total</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Estado</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Pago</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Fecha</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-600">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length > 0 ? filtered.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedOrder(o)}>
                      <td className="px-5 py-3 font-mono text-gray-500">#{o.id}</td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{o.customer_name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{o.customer_phone || ''}</p>
                      </td>
                      <td className="px-5 py-3 font-medium">{formatCLP(o.total)}</td>
                      <td className="px-5 py-3">{statusBadge(o.status)}</td>
                      <td className="px-5 py-3">{payBadge(o.payment_status)}</td>
                      <td className="px-5 py-3 text-gray-500">{new Date(o.created_at).toLocaleDateString('es-CL')}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); }} className="p-1.5 hover:bg-palta-50 rounded-lg text-palta-600" title="Ver / Editar">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => handleDelete(e, o.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600" title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                      <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      No hay pedidos
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedOrder && (
        <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdate={fetchOrders} />
      )}
      {showCreateModal && (
        <CreateOrderModal onClose={() => setShowCreateModal(false)} onSave={fetchOrders} />
      )}
    </AdminLayout>
  )
}
