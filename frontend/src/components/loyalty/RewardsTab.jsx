import { useState, useEffect } from 'react'
import api from '../../services/api'
import { Plus, Trash, Edit, Star, Ticket, X } from 'lucide-react'

export default function RewardsPage() {
  const [rewards, setRewards] = useState([])
  const [redemptions, setRedemptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '', points_cost: 100, discount_value: 0, is_active: true })
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [rRes, redRes] = await Promise.all([
        api.get('/loyalty/admin-rewards/'),
        api.get('/loyalty/admin-redemptions/')
      ])
      setRewards(rRes.data.results || rRes.data || [])
      setRedemptions(redRes.data.results || redRes.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await api.put(`/loyalty/admin-rewards/${editingId}/`, formData)
      } else {
        await api.post('/loyalty/admin-rewards/', formData)
      }
      setShowModal(false)
      fetchData()
    } catch (e) {
      alert('Error al guardar el premio')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este premio?')) return
    try {
      await api.delete(`/loyalty/admin-rewards/${id}/`)
      fetchData()
    } catch (e) {
      alert('Error al eliminar')
    }
  }

  const openModal = (reward = null) => {
    if (reward) {
      setEditingId(reward.id)
      setFormData({
        name: reward.name,
        description: reward.description,
        points_cost: reward.points_cost,
        discount_value: reward.discount_value,
        is_active: reward.is_active
      })
    } else {
      setEditingId(null)
      setFormData({ name: '', description: '', points_cost: 100, discount_value: 0, is_active: true })
    }
    setShowModal(true)
  }

  return (
    <div>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Star className="text-palta-600" /> Puntos y Premios
          </h1>
          <button onClick={() => openModal()} className="px-4 py-2 bg-palta-600 text-white font-bold rounded-xl hover:bg-palta-700 flex items-center gap-2">
            <Plus size={18} /> Nuevo Premio
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Premios Activos */}
          <div className="bg-white rounded-2xl shadow-xs border p-6">
            <h2 className="text-lg font-bold mb-4 border-b pb-2">Premios Configurados</h2>
            <div className="space-y-3">
              {loading ? <p className="text-sm text-gray-500">Cargando...</p> : rewards.length === 0 ? <p className="text-sm text-gray-500">No hay premios configurados.</p> : rewards.map(r => (
                <div key={r.id} className="p-3 border rounded-xl flex justify-between items-center bg-gray-50">
                  <div>
                    <h4 className="font-bold text-gray-900">{r.name}</h4>
                    <p className="text-sm text-palta-600 font-bold">{r.points_cost} pts <span className="text-gray-400 font-normal ml-2">(${r.discount_value} desc)</span></p>
                    {!r.is_active && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full mt-1 inline-block">Inactivo</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openModal(r)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(r.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Últimos Canjes */}
          <div className="bg-white rounded-2xl shadow-xs border p-6">
            <h2 className="text-lg font-bold mb-4 border-b pb-2 flex items-center gap-2">
              <Ticket className="text-blue-500" /> Últimos Canjes
            </h2>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {loading ? <p className="text-sm text-gray-500">Cargando...</p> : redemptions.length === 0 ? <p className="text-sm text-gray-500">No hay canjes registrados.</p> : redemptions.map(r => (
                <div key={r.id} className="p-3 border rounded-xl bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{r.user_name}</p>
                      <p className="text-xs text-gray-500">Canjeó: {r.reward_name}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                      {r.coupon_code}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{new Date(r.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold">{editingId ? 'Editar Premio' : 'Nuevo Premio'}</h2>
                <button onClick={() => setShowModal(false)} className="p-3 -mr-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border-gray-300 rounded-lg" placeholder="Ej. Envío Gratis" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border-gray-300 rounded-lg" rows="2" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Costo (Puntos)</label>
                    <input type="number" inputMode="numeric" pattern="[0-9]*" required min="1" value={formData.points_cost} onChange={e => setFormData({...formData, points_cost: e.target.value})} className="w-full border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Descuento ($)</label>
                    <input type="number" inputMode="numeric" pattern="[0-9]*" required min="0" value={formData.discount_value} onChange={e => setFormData({...formData, discount_value: e.target.value})} className="w-full border-gray-300 rounded-lg" />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="rounded text-palta-600 focus:ring-palta-500" />
                  <span className="text-sm font-semibold text-gray-700">Premio Activo</span>
                </label>
                <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                  <button type="submit" className="px-4 py-2 text-sm bg-palta-600 text-white font-bold rounded-lg hover:bg-palta-700">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
