import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { Tag, Plus, Send, Calendar, Image as ImageIcon, CheckCircle, Trash2, Percent } from 'lucide-react'

export default function OffersPage() {
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [sendingId, setSendingId] = useState(null)

  const [showSendModal, setShowSendModal] = useState(false)
  const [targetOfferId, setTargetOfferId] = useState(null)
  const [targetOption, setTargetOption] = useState('all')
  const [selectedCustomers, setSelectedCustomers] = useState([])
  const [customers, setCustomers] = useState([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)

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

  const openSendModal = async (offerId) => {
    setTargetOfferId(offerId)
    setTargetOption('all')
    setSelectedCustomers([])
    setShowSendModal(true)
    if (customers.length === 0) {
      setLoadingCustomers(true)
      try {
        const res = await api.get('/auth/customers/', { params: { page_size: 1000 } })
        setCustomers(res.data.results || res.data || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingCustomers(false)
      }
    }
  }

  const handleSendSubmit = async () => {
    if (targetOption === 'specific' && selectedCustomers.length === 0) {
      alert('Debes seleccionar al menos un cliente')
      return
    }
    setSendingId(targetOfferId)
    setShowSendModal(false)
    try {
      const payload = { channel: 'whatsapp' }
      if (targetOption === 'specific') payload.customer_ids = selectedCustomers
      const res = await api.post(`/marketing/offers/${targetOfferId}/send/`, payload)
      alert(`¡Oferta enviada con éxito! Receptores: ${res.data.sent}`)
    } catch (e) {
      alert('Error al enviar la oferta masiva')
    } finally {
      setSendingId(null)
    }
  }

  const toggleCustomer = (id) => {
    setSelectedCustomers(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    )
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
                    onClick={() => openSendModal(offer.id)}
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

        {/* Modal Enviar Oferta */}
        {showSendModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="text-lg font-bold text-gray-900">Enviar Oferta por WhatsApp</h2>
                <button onClick={() => setShowSendModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Selecciona a quién enviar:</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="targetOption" value="all" checked={targetOption === 'all'} onChange={() => setTargetOption('all')} className="w-4 h-4 text-palta-600 focus:ring-palta-500" />
                      <span className="text-sm text-gray-700">A todos los clientes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="targetOption" value="specific" checked={targetOption === 'specific'} onChange={() => setTargetOption('specific')} className="w-4 h-4 text-palta-600 focus:ring-palta-500" />
                      <span className="text-sm text-gray-700">Selección específica</span>
                    </label>
                  </div>
                </div>

                {targetOption === 'specific' && (
                  <div className="mt-4 border rounded-lg p-3 bg-gray-50 h-64 overflow-y-auto">
                    {loadingCustomers ? (
                      <p className="text-xs text-gray-500 text-center py-10">Cargando clientes...</p>
                    ) : customers.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-10">No hay clientes disponibles</p>
                    ) : (
                      <div className="space-y-2">
                        {customers.map(c => (
                          <label key={c.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-white rounded">
                            <input 
                              type="checkbox" 
                              checked={selectedCustomers.includes(c.id)} 
                              onChange={() => toggleCustomer(c.id)} 
                              className="w-4 h-4 text-palta-600 rounded focus:ring-palta-500" 
                            />
                            <span className="text-sm text-gray-700">{c.first_name} {c.last_name || ''} <span className="text-xs text-gray-400">({c.whatsapp_number || 'Sin WP'})</span></span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button onClick={() => setShowSendModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button onClick={handleSendSubmit} className="px-4 py-2 text-sm bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 flex items-center gap-2">
                  <Send className="w-4 h-4" /> Enviar Ahora
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
