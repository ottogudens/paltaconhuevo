import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { Tag, Plus, Send, Calendar, Image as ImageIcon, CheckCircle, Trash2, Percent } from 'lucide-react'

export default function OffersPage() {
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [sendingId, setSendingId] = useState(null)

  const [formData, setFormData] = useState({
    title: '', description: '', discount_percentage: 10, valid_from: new Date().toISOString().split('T')[0], valid_until: '', is_active: true
  })
  const [imageFile, setImageFile] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetchOffers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/marketing/offers/')
      setOffers(res.data.results || res.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOffers() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = new FormData()
      data.append('title', formData.title)
      data.append('description', formData.description)
      data.append('discount_percentage', formData.discount_percentage)
      data.append('valid_from', formData.valid_from)
      data.append('valid_until', formData.valid_until)
      data.append('is_active', formData.is_active)
      if (imageFile) data.append('image', imageFile)

      await api.post('/marketing/offers/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      alert('Oferta creada con éxito')
      setShowModal(false)
      fetchOffers()
    } catch (e) {
      alert('Error al crear oferta')
    } finally {
      setSaving(false)
    }
  }

  const handleSendBroadcast = async (offerId, channel = 'whatsapp') => {
    if (!confirm(`¿Seguro que deseas enviar masivamente esta oferta por ${channel.toUpperCase()} a todos los clientes?`)) return
    setSendingId(offerId)
    try {
      const res = await api.post(`/marketing/offers/${offerId}/send/`, { channel })
      alert(`¡Oferta enviada con éxito! Receptores: ${res.data.sent}`)
    } catch (e) {
      alert('Error al enviar la oferta masiva')
    } finally {
      setSendingId(null)
    }
  }

  const handleDelete = async (offerId) => {
    if (!confirm('¿Eliminar esta oferta?')) return
    try {
      await api.delete(`/marketing/offers/${offerId}/`)
      fetchOffers()
    } catch (e) { alert('Error al eliminar') }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Tag className="w-6 h-6 text-palta-600" />
              Gestión de Ofertas & Difusión Masiva
            </h1>
            <p className="text-gray-500 text-sm mt-1">Crea promociones con imágenes y envíalas masivamente a tus clientes por WhatsApp o Correo.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-palta-600 hover:bg-palta-700 text-white font-bold rounded-xl shadow transition-colors text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Crear Nueva Oferta
          </button>
        </div>

        {/* Grid de Ofertas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-16 text-center text-gray-400">Cargando ofertas...</div>
          ) : offers.length > 0 ? (
            offers.map(offer => (
              <div key={offer.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="h-44 bg-gray-100 relative">
                    {offer.image ? (
                      <img src={offer.image} alt={offer.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-palta-50 to-huevo-50">
                        🥑🏷️
                      </div>
                    )}
                    <span className="absolute top-3 right-3 bg-red-500 text-white font-bold text-xs px-3 py-1 rounded-full shadow">
                      {parseFloat(offer.discount_percentage)}% OFF
                    </span>
                  </div>
                  <div className="p-5 space-y-2">
                    <h3 className="font-bold text-gray-900 text-lg">{offer.title}</h3>
                    <p className="text-gray-600 text-sm line-clamp-2">{offer.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 pt-2">
                      <Calendar className="w-3.5 h-3.5" />
                      Válido hasta: {offer.valid_until}
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-gray-50 flex items-center justify-between gap-2 mt-4">
                  <button
                    onClick={() => handleSendBroadcast(offer.id, 'whatsapp')}
                    disabled={sendingId === offer.id}
                    className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" /> {sendingId === offer.id ? 'Enviando...' : 'Difundir WhatsApp'}
                  </button>
                  <button
                    onClick={() => handleDelete(offer.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
              <Tag className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              No hay ofertas creadas. Crea una nueva oferta para enviarla masivamente.
            </div>
          )}
        </div>

        {/* Modal Crear Oferta */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="text-lg font-bold text-gray-900">Crear Oferta Especial</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Título de la Oferta</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 20% OFF en Paltas Hass de Exportación"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Detalles de la oferta, condiciones o productos asociados..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">% Descuento</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={formData.discount_percentage}
                      onChange={e => setFormData({ ...formData, discount_percentage: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Válido Hasta</label>
                    <input
                      type="date"
                      required
                      value={formData.valid_until}
                      onChange={e => setFormData({ ...formData, valid_until: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Imagen Promocional (Opcional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setImageFile(e.target.files[0])}
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-palta-50 file:text-palta-700 hover:file:bg-palta-100"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 text-xs bg-palta-600 text-white font-bold rounded-lg hover:bg-palta-700 disabled:opacity-50">
                    {saving ? 'Guardando...' : 'Crear Oferta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
