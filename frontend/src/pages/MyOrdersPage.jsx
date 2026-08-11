import React, { useState, useEffect } from 'react'
import api from '../services/api'

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get('/orders/')
        setOrders(res.data.results || res.data)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-palta-700 mb-8">📦 Mis Pedidos</h1>
      {loading ? <div>Cargando...</div> : <div className="space-y-4">{orders.map(o => <div key={o.id} className="card"><p className="font-bold">Pedido #{o.id}</p><p className="text-gray-600">${o.total} - {o.status}</p></div>)}</div>}
    </div>
  )
}
