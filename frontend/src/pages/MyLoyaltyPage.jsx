import { useState, useEffect } from 'react'
import api from '../services/api'
import { Gift, Award, Star, CheckCircle, Ticket } from 'lucide-react'

export default function MyLoyaltyPage() {
  const [loyalty, setLoyalty] = useState(null)
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)
  const [redeeming, setRedeeming] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [loyaltyRes, rewardsRes] = await Promise.all([
        api.get('/loyalty/my/'),
        api.get('/loyalty/rewards/')
      ])
      setLoyalty(loyaltyRes.data)
      setRewards(rewardsRes.data.results || rewardsRes.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleRedeem = async (reward) => {
    if (!confirm(`¿Estás seguro de canjear ${reward.name} por ${reward.points_cost} puntos?`)) return
    setRedeeming(reward.id)
    try {
      const res = await api.post(`/loyalty/rewards/${reward.id}/redeem/`)
      alert(`¡Canje exitoso! Tu código de descuento es: ${res.data.coupon_code}`)
      fetchData() // Refresh points and transactions
    } catch (e) {
      alert(e.response?.data?.error || 'Error al canjear el premio')
    } finally {
      setRedeeming(null)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-500">Cargando mis puntos...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-xs p-6 border flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-palta-100 flex items-center justify-center text-palta-600">
            <Award size={32} />
          </div>
          <div>
            <h2 className="text-sm text-gray-500 font-semibold uppercase tracking-wider">Mi Nivel Actual</h2>
            <p className="text-3xl font-black text-gray-900 capitalize">{loyalty?.level}</p>
          </div>
        </div>
        
        <div className="text-center md:text-right border-l pl-6">
          <p className="text-sm text-gray-500 font-semibold mb-1">Puntos Disponibles</p>
          <p className="text-4xl font-black text-palta-600">{loyalty?.points}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Catálogo de Premios */}
        <div className="bg-white rounded-2xl shadow-xs border p-6">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-4 border-b pb-2">
            <Gift className="text-palta-600" /> Catálogo de Premios
          </h3>
          <div className="space-y-4">
            {rewards.length === 0 ? (
              <p className="text-sm text-gray-500">No hay premios disponibles por ahora.</p>
            ) : (
              rewards.map(r => (
                <div key={r.id} className="p-4 rounded-xl border flex items-center justify-between gap-4 bg-gray-50 hover:bg-white transition-colors">
                  <div>
                    <h4 className="font-bold text-gray-900">{r.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">{r.description || `Descuento de $${r.discount_value}`}</p>
                    <p className="text-sm font-black text-palta-600 mt-2">{r.points_cost} pts</p>
                  </div>
                  <button
                    onClick={() => handleRedeem(r)}
                    disabled={loyalty?.points < r.points_cost || redeeming === r.id}
                    className="px-4 py-2 bg-black text-white text-sm font-bold rounded-lg disabled:opacity-50 hover:bg-gray-800 transition shadow-xs whitespace-nowrap"
                  >
                    {redeeming === r.id ? 'Canjeando...' : 'Canjear'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Historial de Movimientos */}
        <div className="bg-white rounded-2xl shadow-xs border p-6">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-4 border-b pb-2">
            <Star className="text-yellow-500" /> Movimientos y Cupones
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {loyalty?.transactions?.length === 0 ? (
              <p className="text-sm text-gray-500">No hay movimientos registrados.</p>
            ) : (
              loyalty?.transactions?.slice().reverse().map(t => (
                <div key={t.id} className="flex justify-between items-center p-3 rounded-lg border bg-gray-50">
                  <div>
                    <p className="text-sm font-semibold capitalize text-gray-800 flex items-center gap-1">
                      {t.transaction_type === 'canjeado' ? <Ticket size={14} className="text-blue-500" /> : <CheckCircle size={14} className="text-green-500" />}
                      {t.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{new Date(t.created_at).toLocaleDateString()}</p>
                    {t.transaction_type === 'canjeado' && t.reference_id && t.reference_id.startsWith('DESC') && (
                      <p className="text-xs font-mono font-bold text-blue-600 mt-1 bg-blue-50 inline-block px-1.5 py-0.5 rounded">Cupón: {t.reference_id}</p>
                    )}
                  </div>
                  <div className={`font-bold ${t.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {t.points > 0 ? '+' : ''}{t.points}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
