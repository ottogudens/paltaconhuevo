import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { Users, Search, Plus, X, Check, Shield, Mail, Phone, UserCheck } from 'lucide-react'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'cliente', label: 'Cliente' },
]

const roleBadge = (role) => {
  const map = {
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
    vendedor: 'bg-blue-100 text-blue-800 border-blue-200',
    cliente: 'bg-green-100 text-green-800 border-green-200',
  }
  const labelMap = { admin: 'Administrador', vendedor: 'Vendedor', cliente: 'Cliente' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${map[role] || 'bg-gray-100'}`}>
      {labelMap[role] || role}
    </span>
  )
}

function UserModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'vendedor',
    password: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.first_name || (!form.email && !form.username)) {
      alert('Nombre y Usuario/Correo son requeridos')
      return
    }
    setSaving(true)
    try {
      await api.post('/auth/users/', form)
      onSave()
      onClose()
    } catch (e) {
      console.error(e)
      alert('Error al crear usuario')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Crear Usuario del Sistema</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
              <input type="text" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="Ej: Pedro" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
              <input type="text" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="Ej: Gómez" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol del Sistema</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500">
                <option value="admin">Administrador</option>
                <option value="vendedor">Vendedor</option>
                <option value="cliente">Cliente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario / Nick</label>
              <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="pedrog" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="pedro@paltaconhuevo.cl" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="+56912345678" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="Mínimo 6 caracteres" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-palta-600 text-white rounded-lg hover:bg-palta-700 disabled:opacity-50 flex items-center gap-2">
              <Check className="w-4 h-4" /> {saving ? 'Guardando...' : 'Crear Usuario'}
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usuarios del Sistema</h1>
            <p className="text-gray-500 text-sm mt-1">{filtered.length} usuarios registrados</p>
          </div>
          <button onClick={() => setShowModal(true)}
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Usuario</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Rol</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Email</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Teléfono</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Registro</th>
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
                      <td className="px-5 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString('es-CL')}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                      <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      No hay usuarios registrados
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && <UserModal onClose={() => setShowModal(false)} onSave={fetchUsers} />}
    </AdminLayout>
  )
}
