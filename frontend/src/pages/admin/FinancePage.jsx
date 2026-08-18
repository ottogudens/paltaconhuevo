import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { DollarSign, TrendingUp, TrendingDown, Download, Plus, X, Check, ArrowUpCircle, ArrowDownCircle, Calculator, Percent, Sparkles } from 'lucide-react'

const CATEGORY_OPTIONS = [
  { value: 'venta', label: 'Venta' },
  { value: 'compra', label: 'Compra de insumos' },
  { value: 'gasto_operacional', label: 'Gasto operacional' },
  { value: 'combustible', label: 'Combustible' },
  { value: 'cajas', label: 'Cajas / Embalaje' },
  { value: 'despacho', label: 'Despacho' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'otro', label: 'Otro' },
]

function PriceCalculatorModal({ onClose }) {
  const [costPrice, setCostPrice] = useState('')
  const [marginType, setMarginType] = useState('percentage')
  const [marginValue, setMarginValue] = useState('30')
  const [includeIVA, setIncludeIVA] = useState(false)

  const cost = parseFloat(costPrice) || 0
  const marginVal = parseFloat(marginValue) || 0

  let profit = 0
  if (marginType === 'percentage') {
    profit = cost * (marginVal / 100)
  } else {
    profit = marginVal
  }

  const netSalePrice = cost + profit
  const iva = includeIVA ? netSalePrice * 0.19 : 0
  const finalSalePrice = netSalePrice + iva

  const marginOnSale = netSalePrice > 0 ? (profit / netSalePrice) * 100 : 0

  const formatCLP = (n) => `$${Math.round(n || 0).toLocaleString('es-CL')}`
  const presets = [15, 25, 30, 40, 50, 100]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6 bg-gradient-to-r from-palta-700 to-palta-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Calculadora de Precios</h2>
              <p className="text-xs text-palta-100">Calcula tu precio de venta y utilidad</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Precio de Costo ($)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400 font-bold">$</span>
              <input
                type="number"
                value={costPrice}
                onChange={e => setCostPrice(e.target.value)}
                placeholder="Ej: 5000"
                min="0"
                className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-xl text-base font-semibold focus:ring-2 focus:ring-palta-500 focus:border-palta-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Margen de Ganancia</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMarginType('percentage')}
                className={`py-2.5 px-4 rounded-xl text-sm font-medium border-2 flex items-center justify-center gap-2 transition-all ${
                  marginType === 'percentage'
                    ? 'border-palta-600 bg-palta-50 text-palta-700 font-bold shadow-xs'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Percent className="w-4 h-4" /> Porcentaje (%)
              </button>
              <button
                type="button"
                onClick={() => setMarginType('fixed')}
                className={`py-2.5 px-4 rounded-xl text-sm font-medium border-2 flex items-center justify-center gap-2 transition-all ${
                  marginType === 'fixed'
                    ? 'border-palta-600 bg-palta-50 text-palta-700 font-bold shadow-xs'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <DollarSign className="w-4 h-4" /> Monto Fijo ($)
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-semibold text-gray-700">
                {marginType === 'percentage' ? 'Porcentaje de Ganancia (%)' : 'Ganancia Deseada ($)'}
              </label>
              {marginType === 'percentage' && (
                <span className="text-xs text-palta-600 font-medium">Preajustes rápidos:</span>
              )}
            </div>

            <div className="relative">
              <input
                type="number"
                value={marginValue}
                onChange={e => setMarginValue(e.target.value)}
                placeholder={marginType === 'percentage' ? '30' : '1500'}
                min="0"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-base font-semibold focus:ring-2 focus:ring-palta-500 focus:border-palta-500"
              />
              <span className="absolute right-3 top-2.5 text-gray-400 font-bold">
                {marginType === 'percentage' ? '%' : '$'}
              </span>
            </div>

            {marginType === 'percentage' && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {presets.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setMarginValue(p.toString())}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      marginValue === p.toString()
                        ? 'bg-palta-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    +{p}%
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeIVA"
                checked={includeIVA}
                onChange={e => setIncludeIVA(e.target.checked)}
                className="w-4 h-4 text-palta-600 rounded-xs border-gray-300 focus:ring-palta-500 cursor-pointer"
              />
              <label htmlFor="includeIVA" className="text-sm font-medium text-gray-700 cursor-pointer">
                Incluir IVA (19%) en el precio final
              </label>
            </div>
            {includeIVA && (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                +19% IVA
              </span>
            )}
          </div>

          <div className="bg-gradient-to-br from-palta-50 via-white to-palta-50/30 rounded-2xl p-4 border border-palta-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-palta-200/60 pb-3">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Precio de Venta Sugerido</p>
                <p className="text-3xl font-extrabold text-palta-800 mt-0.5">{formatCLP(finalSalePrice)}</p>
                {includeIVA && (
                  <p className="text-[11px] text-gray-500">
                    Neto: {formatCLP(netSalePrice)} + IVA: {formatCLP(iva)}
                  </p>
                )}
              </div>
              <div className="p-3 bg-palta-600 text-white rounded-xl shadow-md">
                <Sparkles className="w-6 h-6" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
                <p className="text-xs text-gray-500 font-medium">Utilidad / Ganancia</p>
                <p className="text-lg font-bold text-green-600 mt-0.5">{formatCLP(profit)}</p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
                <p className="text-xs text-gray-500 font-medium">Margen s/ Venta</p>
                <p className="text-lg font-bold text-palta-700 mt-0.5">{marginOnSale.toFixed(1)}%</p>
              </div>
            </div>

            {cost > 0 && netSalePrice > 0 && (
              <div className="pt-1">
                <div className="flex justify-between text-[11px] font-semibold text-gray-500 mb-1">
                  <span>Costo ({((cost / netSalePrice) * 100).toFixed(0)}%)</span>
                  <span>Utilidad ({((profit / netSalePrice) * 100).toFixed(0)}%)</span>
                </div>
                <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden flex">
                  <div
                    className="bg-gray-400 h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (cost / netSalePrice) * 100)}%` }}
                  />
                  <div
                    className="bg-palta-500 h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (profit / netSalePrice) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 font-medium text-sm transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

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
  const [showCalculator, setShowCalculator] = useState(false)

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const fetchAll = async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true)
    try {
      const params = { page: pageNum }
      if (filter) params.type = filter
      const [txRes, sumRes] = await Promise.all([
        api.get('/finance/', { params }),
        api.get('/finance/summary/', { params: { period } }),
      ])
      const newTx = txRes.data.results || txRes.data || []
      
      if (pageNum === 1) {
        setTransactions(newTx)
        setSummary(sumRes.data)
      } else {
        setTransactions(prev => [...prev, ...newTx])
      }
      setHasMore(!!txRes.data.next)
      setPage(pageNum)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll(1) }, [filter, period])

  const formatCLP = (n) => `$${(n || 0).toLocaleString('es-CL')}`

  const handleExport = async () => {
    try {
      const res = await api.get('/finance/export/', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'finanzas.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert('Error al exportar finanzas')
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finanzas</h1>
            <p className="text-gray-500 text-sm mt-1">Gestión de ingresos, egresos y cálculo de precios</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowCalculator(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-palta-50 border border-palta-200 text-palta-800 rounded-lg hover:bg-palta-100 text-sm font-medium transition-colors shadow-2xs">
              <Calculator className="w-4 h-4 text-palta-700" /> Calculadora de Precios
            </button>
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

          {hasMore && !loading && (
            <div className="flex justify-center p-4 border-t border-gray-100">
              <button 
                onClick={() => fetchAll(page + 1)} 
                className="px-6 py-2 bg-palta-50 text-palta-700 font-medium rounded-lg hover:bg-palta-100 transition-colors"
              >
                Cargar más transacciones
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && <TransactionModal onClose={() => setShowModal(false)} onSave={fetchAll} />}
      {showCalculator && <PriceCalculatorModal onClose={() => setShowCalculator(false)} />}
    </AdminLayout>
  )
}
