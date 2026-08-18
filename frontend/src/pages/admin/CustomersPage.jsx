import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import ImportModal from '../../components/ImportModal'
import { Users, Search, Download, Upload, Eye, X, Mail, Phone, MapPin, Calendar, Plus, Trash2, Pencil } from 'lucide-react'

function CustomerDetail({ customer, onClose, onEdit }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Detalle de Cliente</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-palta-400 to-palta-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
              {(customer.first_name || customer.username || '?')[0].toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {customer.first_name} {customer.last_name}
              </h3>
              <p className="text-sm text-gray-500">@{customer.username}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 mt-4">
            {customer.email && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700">{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700">{customer.phone}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700">{customer.address}{customer.commune ? `, ${customer.commune}` : ''}</span>
              </div>
            )}
            {customer.whatsapp_number && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">WhatsApp: {customer.whatsapp_number}</span>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-700">Registrado: {customer.created_at ? new Date(customer.created_at).toLocaleDateString('es-CL') : '-'}</span>
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cerrar</button>
          <button onClick={() => { onClose(); onEdit(customer); }} className="px-4 py-2 text-sm bg-palta-600 text-white rounded-lg hover:bg-palta-700 flex items-center gap-1.5">
            <Pencil className="w-4 h-4" /> Editar Cliente
          </button>
        </div>
      </div>
    </div>
  )
}

function CustomerModal({ customer, onClose, onSave }) {
  const isEditing = !!customer
  const [form, setForm] = useState({
    first_name: customer?.first_name || '',
    last_name: customer?.last_name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
    commune: customer?.commune || '',
    whatsapp_number: customer?.whatsapp_number || ''
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.first_name || !form.phone) {
      alert('El Nombre y Teléfono son obligatorios')
      return
    }
    setSaving(true)
    try {
      if (isEditing) {
        await api.patch(`/auth/customers/${customer.id}/`, form)
      } else {
        await api.post('/auth/customers/', form)
      }
      onSave()
      onClose()
    } catch (e) {
      console.error(e)
      alert(isEditing ? 'Error al actualizar el cliente' : 'Error al crear el cliente')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
          <button onClick={onClose} className="p-3 -mr-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
              <input type="text" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="Ej: Juan" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
              <input type="text" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="Ej: Pérez" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono <span className="text-red-500">*</span></label>
            <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="+56912345678" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="correo@ejemplo.com" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="Av. Principal 123" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comuna <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input type="text" value={form.commune} onChange={e => setForm({...form, commune: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="Santiago" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input type="tel" value={form.whatsapp_number} onChange={e => setForm({...form, whatsapp_number: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="+56912345678" />
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-palta-600 text-white rounded-lg hover:bg-palta-700 disabled:opacity-50 flex items-center gap-2">
              {isEditing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Cliente')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [customerToEdit, setCustomerToEdit] = useState(null)
  const [importing, setImporting] = useState(false)

  const [ordering, setOrdering] = useState('first_name')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const fetchCustomers = async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true)
    try {
      const res = await api.get('/auth/customers/', { params: { page: pageNum, search, ordering } })
      const newCustomers = res.data.results || res.data || []
      
      if (pageNum === 1) {
        setCustomers(newCustomers)
      } else {
        setCustomers(prev => [...prev, ...newCustomers])
      }
      setHasMore(!!res.data.next)
      setPage(pageNum)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers(1)
    }, 500)
    return () => clearTimeout(delayDebounceFn)
  }, [search, ordering])

  const handleSort = (field) => {
    if (ordering === field) {
      setOrdering(`-${field}`)
    } else {
      setOrdering(field)
    }
  }

  const SortIcon = ({ field }) => {
    if (ordering === field) return <span className="ml-1 text-palta-600 font-bold">↑</span>
    if (ordering === `-${field}`) return <span className="ml-1 text-palta-600 font-bold">↓</span>
    return null
  }



  const handleExport = async () => {
    try {
      const res = await api.get('/auth/customers/export/', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'clientes_palta_con_huevo.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      alert('Error al exportar clientes')
    }
  }

  const [showImportModal, setShowImportModal] = useState(false)

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/auth/customers/template/', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'plantilla_clientes.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      alert('Error al descargar la plantilla')
    }
  }

  const handleExport = () => {
    window.open(`${api.defaults.baseURL}/auth/customers/export/`, '_blank')
  }

  const handleDeleteCustomer = async (e, customerId) => {
    e.stopPropagation()
    if (!confirm('¿Seguro que deseas eliminar este cliente del sistema?')) return
    try {
      await api.delete(`/auth/customers/${customerId}/`)
      fetchCustomers()
    } catch (err) {
      alert('Error al eliminar cliente')
    }
  }

  return (
    <AdminLayout title="Clientes">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-gray-500 text-sm mt-1">{customers.length} clientes cargados</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-palta-600 text-white rounded-lg hover:bg-palta-700 text-sm font-medium">
              <Plus className="w-4 h-4" /> Nuevo Cliente
            </button>
            <button onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium" title="Descargar Plantilla">
              <Download className="w-4 h-4" /> Plantilla
            </button>
            <button onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
              <Upload className="w-4 h-4" /> Importar
            </button>
            <button onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
              <Download className="w-4 h-4" /> Exportar
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar por nombre, email, teléfono..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-palta-500 focus:border-transparent" />
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
                    <th className="text-left px-5 py-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('first_name')}>Cliente <SortIcon field="first_name" /></th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('email')}>Email <SortIcon field="email" /></th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('phone')}>Teléfono <SortIcon field="phone" /></th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('commune')}>Comuna <SortIcon field="commune" /></th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('created_at')}>Registro <SortIcon field="created_at" /></th>
                    <th className="text-right px-5 py-3 font-medium text-gray-600">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {customers.length > 0 ? customers.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelected(c)}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-palta-400 to-palta-600 flex items-center justify-center text-xs font-bold text-white">
                            {(c.first_name || c.username || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                            <p className="text-xs text-gray-500">@{c.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{c.email}</td>
                      <td className="px-5 py-3 text-gray-600">{c.phone || '-'}</td>
                      <td className="px-5 py-3 text-gray-600">{c.commune || '-'}</td>
                      <td className="px-5 py-3 text-gray-500">{c.created_at ? new Date(c.created_at).toLocaleDateString('es-CL') : '-'}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-1.5 hover:bg-palta-50 rounded-lg text-palta-600" title="Ver detalle">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setCustomerToEdit(c); }} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600" title="Editar cliente">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => handleDeleteCustomer(e, c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Eliminar cliente">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                      <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      No hay clientes registrados
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {hasMore && !loading && (
            <div className="flex justify-center p-4 border-t border-gray-100">
              <button 
                onClick={() => fetchCustomers(page + 1)} 
                className="px-6 py-2 bg-palta-50 text-palta-700 font-medium rounded-lg hover:bg-palta-100 transition-colors"
              >
                Cargar más clientes
              </button>
            </div>
          )}
        </div>
      </div>

      {selected && <CustomerDetail customer={selected} onClose={() => setSelected(null)} onEdit={(cust) => setCustomerToEdit(cust)} />}
      {showCreateModal && (
        <CreateCustomerModal onClose={() => setShowCreateModal(false)} onSuccess={fetchCustomers} />
      )}

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={fetchCustomers}
        title="Importar Clientes"
        endpoint="/auth/customers/import/"
      />

      {customerToEdit && <CustomerModal customer={customerToEdit} onClose={() => setCustomerToEdit(null)} onSave={fetchCustomers} />}
    </AdminLayout>
  )
}
