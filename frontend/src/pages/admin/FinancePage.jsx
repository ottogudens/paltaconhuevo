import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { DollarSign, TrendingUp, TrendingDown, Download, Plus, X, Check, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

const CATEGORY_OPTIONS = [
  { value: 'venta', label: 'Venta' },
  { value: 'compra', label: 'Compra de insumos' },
  { value: 'gasto_operacional', label: 'Gasto operacional' },
  { value: 'despacho', label: 'Despacho' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'otro', label: 'Otro' },
]

function TransactionModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    transaction_type: 'egreso', category: 'gasto_operacional', amount: '', description: '', date: new Date().toISOString().split('T')[0]
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/finance/', form)
      onSave()
      onClose()
    } catch (e) { alert('Error al guardar') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Nueva Transacción</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setForm({...form, transaction_type: 'ingreso'})}
                className={`flex-1 py-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                  form.transaction_type === 'ingreso' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'
                }`}>
                <ArrowUpCircle className="w-5 h-5 mx-auto mb-1" /> Ingreso
              </button>
              <button type="button" onClick={() => setForm({...form, transaction_type: 'egreso'})}
                className={`flex-1 py-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                  form.transaction_type === 'egreso' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600'
                }`}>
                <ArrowDownCircle className="w-5 h-5 mx-auto mb-1" /> Egreso
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500">
                {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
            <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-palta-500" placeholder="Descripción del movimiento" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-palta-600 text-white rounded-lg hover:bg-palta-700 disabled:opacity-50 flex items-center gap-2">
              <Check className="w-4 h-4" /> {saving ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function FinancePage() {
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [period, setPeriod] = useState('month')
  const [showModal, setShowModal] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filter) params.type = filter
      const [txRes, sumRes] = await Promise.all([
        api.get('/finance/', { params }),
        api.get('/finance/summary/', { params: { period } }),
      ])
      setTransactions(txRes.data.results || txRes.data || [])
      setSummary(sumRes.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [filter, period])

  const formatCLP = (n) => `$${(n || 0).toLocaleString('es-CL')}`

  const handleExport = () => {
    window.open(`${api.defaults.baseURL}/finance/export/`, '_blank')
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finanzas</h1>
            <p className="text-gray-500 text-sm mt-1">Gestión de ingresos y egresos</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
              <Download className="w-4 h-4" /> Exportar
            </button>
            <button onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-palta-600 text-white rounded-lg hover:bg-palta-700 text-sm font-medium">
              <Plus className="w-4 h-4" /> Nueva Transacción
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Ingresos</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{formatCLP(summary.ingresos)}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-400 to-green-600 shadow-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Egresos</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{formatCLP(summary.egresos)}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-red-400 to-red-600 shadow-lg">
                  <TrendingDown className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Balance</p>
                  <p className={`text-2xl font-bold mt-1 ${summary.balance >= 0 ? 'text-palta-700' : 'text-red-600'}`}>
                    {formatCLP(summary.balance)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-palta-400 to-palta-600 shadow-lg">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {['month', 'week', 'day'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  period === p ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}>
                {p === 'month' ? 'Mes' : p === 'week' ? 'Semana' : 'Hoy'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {[{ v: '', l: 'Todos' }, { v: 'ingreso', l: 'Ingresos' }, { v: 'egreso', l: 'Egresos' }].map(f => (
              <button key={f.v} onClick={() => setFilter(f.v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f.v ? 'bg-palta-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}>
                {f.l}
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
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Tipo</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Categoría</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Descripción</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-600">Monto</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {transactions.length > 0 ? transactions.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        {t.transaction_type === 'ingreso' ? (
                          <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium">
                            <ArrowUpCircle className="w-3 h-3" /> Ingreso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full text-xs font-medium">
                            <ArrowDownCircle className="w-3 h-3" /> Egreso
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-600 capitalize">{t.category?.replace('_', ' ')}</td>
                      <td className="px-5 py-3 text-gray-900 font-medium">{t.description}</td>
                      <td className={`px-5 py-3 text-right font-bold ${t.transaction_type === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.transaction_type === 'ingreso' ? '+' : '-'}{formatCLP(t.amount)}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{t.date}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                      <DollarSign className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      No hay transacciones
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && <TransactionModal onClose={() => setShowModal(false)} onSave={fetchAll} />}
    </AdminLayout>
  )
}
