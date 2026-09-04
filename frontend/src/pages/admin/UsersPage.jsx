import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { Users, Search, Plus, X, Check, Shield, Mail, Phone, UserCheck, Edit3, Trash2 } from 'lucide-react'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'vendedor', label: 'Vendedor' },
]

const roleBadge = (role) => {
  const map = {
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
    vendedor: 'bg-blue-100 text-blue-800 border-blue-200',
  }
  const labelMap = { admin: 'Administrador', vendedor: 'Vendedor' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${map[role] || 'bg-gray-100'}`}>
      {labelMap[role] || role}
    </span>
  )
}

const EMPTY_USER = { username: '', email: '', first_name: '', last_name: '', phone: '', role: 'vendedor', password: '' }

function UserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState(user || EMPTY_USER)
  const [saving, setSaving] = useState(false)
  const isEdit = !!user?.id

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.first_name || (!form.email && !form.username)) {
      alert('Nombre y Usuario/Correo son requeridos')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await api.patch(`/auth/users/${user.id}/`, form)
      } else {
        await api.post('/auth/users/', form)
      }
      onSave()
      onClose()
    } catch (e) {
      console.error(e)
      alert('Error al guardar usuario')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto transform transition-transform" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto sm:hidden mt-3 mb-1"></div>
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Editar' : 'Crear'} Usuario del Sistema</h2>
          <button onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre <span className="text-red-500">*</span></label>
              <input type="text" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required
                className="w-full px-4 min-h-[44px] border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="Ej: Pedro" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Apellido</label>
              <input type="text" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})}
                className="w-full px-4 min-h-[44px] border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="Ej: Gómez" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Rol del Sistema</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                className="w-full px-4 min-h-[44px] border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500 bg-white">
                <option value="admin">Administrador</option>
                <option value="vendedor">Vendedor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Usuario / Nick</label>
              <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})}
                className="w-full px-4 min-h-[44px] border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="pedrog" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo electrónico</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              className="w-full px-4 min-h-[44px] border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="pedro@paltaconhuevo.cl" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono</label>
              <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full px-4 min-h-[44px] border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="+56912345678" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{isEdit ? 'Nueva Contraseña (opcional)' : 'Contraseña'}</label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                className="w-full px-4 min-h-[44px] border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder={isEdit ? 'Dejar en blanco para mantener' : 'Mínimo 6 caracteres'} />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="w-full sm:w-auto min-h-[44px] px-6 text-sm text-gray-700 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={saving}
              className="w-full sm:w-auto min-h-[44px] px-6 text-sm bg-palta-600 text-white font-bold rounded-lg hover:bg-palta-700 disabled:opacity-50 flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> {saving ? 'Guardando...' : (isEdit ? 'Guardar Cambios' : 'Crear Usuario')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = {}
      if (roleFilter) params.role = roleFilter
      const res = await api.get('/auth/users/', { params })
      setUsers(res.data.results || res.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [roleFilter])

  const filtered = users.filter(u => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      (u.first_name || '').toLowerCase().includes(s) ||
      (u.last_name || '').toLowerCase().includes(s) ||
      (u.username || '').toLowerCase().includes(s) ||
      (u.email || '').toLowerCase().includes(s)
    )
  })

  const handleDeleteUser = async (userId) => {
    if (!confirm('¿Seguro que deseas eliminar este usuario del sistema?')) return
    try {
      await api.delete(`/auth/users/${userId}/`)
      fetchUsers()
    } catch (e) {
      alert('Error al eliminar el usuario')
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usuarios del Sistema</h1>
            <p className="text-gray-500 text-sm mt-1">{filtered.length} usuarios del sistema (Administradores y Vendedores)</p>
          </div>
          <button onClick={() => { setEditingUser(null); setShowModal(true) }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-palta-600 text-white rounded-lg hover:bg-palta-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Buscar por nombre, usuario, email..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-palta-500 focus:border-transparent" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setRoleFilter('')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!roleFilter ? 'bg-palta-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
              Todos
            </button>
            {ROLE_OPTIONS.map(r => (
              <button key={r.value} onClick={() => setRoleFilter(r.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${roleFilter === r.value ? 'bg-palta-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                {r.label}
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
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Usuario</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Rol</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Email</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Teléfono</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Registro</th>
                      <th className="text-right px-5 py-3 font-medium text-gray-600">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.length > 0 ? filtered.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-palta-500 to-palta-700 flex items-center justify-center text-xs font-bold text-white">
                              {(u.first_name || u.username || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{u.first_name} {u.last_name}</p>
                              <p className="text-xs text-gray-500">@{u.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">{roleBadge(u.role)}</td>
                        <td className="px-5 py-3 text-gray-600">{u.email || '-'}</td>
                        <td className="px-5 py-3 text-gray-600">{u.phone || '-'}</td>
                        <td className="px-5 py-3 text-gray-500">{u.created_at ? new Date(u.created_at).toLocaleDateString('es-CL') : '-'}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setEditingUser(u); setShowModal(true) }} className="p-1.5 hover:bg-palta-50 rounded-lg text-palta-600 min-h-[44px] min-w-[44px] inline-flex items-center justify-center" title="Editar usuario">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 min-h-[44px] min-w-[44px] inline-flex items-center justify-center" title="Eliminar usuario">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                        <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                        No hay usuarios del sistema registrados
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="block sm:hidden divide-y divide-gray-100">
                {filtered.length > 0 ? filtered.map(u => (
                  <div key={u.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-palta-500 to-palta-700 flex items-center justify-center text-sm font-bold text-white">
                          {(u.first_name || u.username || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">{u.first_name} {u.last_name}</p>
                          <p className="text-xs text-gray-500">@{u.username}</p>
                        </div>
                      </div>
                      <div>{roleBadge(u.role)}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-gray-600 mb-4">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-400">Email</span>
                        <span className="truncate">{u.email || '-'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-400">Teléfono</span>
                        <span>{u.phone || '-'}</span>
                      </div>
                      <div className="flex flex-col col-span-2">
                        <span className="text-xs text-gray-400">Registro</span>
                        <span>{u.created_at ? new Date(u.created_at).toLocaleDateString('es-CL') : '-'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-50">
                      <button onClick={() => { setEditingUser(u); setShowModal(true) }} className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 text-sm font-medium transition-colors">
                        <Edit3 className="w-4 h-4" /> Editar
                      </button>
                      <button onClick={() => handleDeleteUser(u.id)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="px-5 py-12 text-center text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    No hay usuarios del sistema registrados
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showModal && <UserModal user={editingUser} onClose={() => setShowModal(false)} onSave={fetchUsers} />}
    </AdminLayout>
  )
}

