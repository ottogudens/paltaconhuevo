import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import { Plus, Trash2, Edit3, Image as ImageIcon, Sparkles, X, Check, ChefHat } from 'lucide-react'

function AiRecipeModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    provider: 'anthropic',
    ingredient: 'ambos',
    meal_type: 'almuerzo',
    difficulty: 'facil',
    servings: 2
  })
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState(null)

  const handleGenerate = async () => {
    setGenerating(true)
    setPreview(null)
    try {
      const res = await api.post('/recipes/ai-generate/', form)
      setPreview(res.data)
      onSave() // The backend saves it by default as of now, so list should refresh
    } catch (e) {
      alert('Error al generar: ' + (e.response?.data?.error || e.message))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Generar Receta con IA</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {!preview ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motor de IA</label>
                  <select value={form.provider} onChange={e => setForm({...form, provider: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500">
                    <option value="anthropic">Claude 3.5 Sonnet</option>
                    <option value="openai">OpenAI GPT-4o-mini</option>
                    <option value="gemini">Google Gemini 1.5 Flash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ingrediente Clave</label>
                  <select value={form.ingredient} onChange={e => setForm({...form, ingredient: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500">
                    <option value="ambos">Palta y Huevo</option>
                    <option value="palta">Solo Palta</option>
                    <option value="huevo">Solo Huevo</option>
                    <option value="proteina">Alta Proteína</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Comida</label>
                  <select value={form.meal_type} onChange={e => setForm({...form, meal_type: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500">
                    <option value="desayuno">Desayuno</option>
                    <option value="almuerzo">Almuerzo</option>
                    <option value="cena">Cena</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dificultad</label>
                  <select value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500">
                    <option value="facil">Fácil</option>
                    <option value="media">Media</option>
                    <option value="avanzada">Avanzada</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Porciones</label>
                  <input type="number" min="1" value={form.servings} onChange={e => setForm({...form, servings: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              
              <button onClick={handleGenerate} disabled={generating}
                className="w-full mt-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
                {generating ? (
                  <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Cocinando IA...</span>
                ) : (
                  <><ChefHat className="w-5 h-5"/> Generar Ahora!</>
                )}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-center">
                <Check className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <h3 className="font-bold text-gray-900">{preview.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{preview.description}</p>
              </div>
              <p className="text-sm text-center text-gray-500">La receta ha sido guardada en la base de datos automáticamente.</p>
              <button onClick={onClose} className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all">
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RecipesLoyaltyTab() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAiModal, setShowAiModal] = useState(false)

  const fetchRecipes = async () => {
    setLoading(true)
    try {
      const res = await api.get('/recipes/')
      setRecipes(res.data.results || res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecipes()
  }, [])

  const handleDelete = async (slug) => {
    if (!confirm('¿Seguro que deseas eliminar esta receta?')) return;
    try {
      await api.delete(`/recipes/${slug}/`)
      fetchRecipes()
    } catch (e) {
      alert('Error eliminando receta')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Blog de Recetas (WhatsApp)</h2>
          <p className="text-sm text-gray-500">Estas recetas pueden ser consultadas por los clientes mediante el Agente AI.</p>
        </div>
        <button onClick={() => setShowAiModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-700 transition-colors shadow-sm">
          <Sparkles className="w-4 h-4" /> Generar con IA
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-palta-600"></div>
          </div>
        ) : recipes.length > 0 ? (
          recipes.map(r => (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              <div className="h-40 bg-gray-100 relative">
                {r.image ? (
                   <img src={r.image} alt={r.title} className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
                     <ImageIcon className="w-8 h-8 opacity-50" />
                   </div>
                )}
                {r.ai_generated && (
                   <span className="absolute top-2 right-2 bg-purple-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm shadow flex items-center gap-1">
                     <Sparkles className="w-3 h-3" /> IA
                   </span>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-palta-700 bg-palta-50 px-2 py-0.5 rounded-full">{r.category}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{r.difficulty}</span>
                </div>
                <h3 className="font-bold text-gray-900 leading-tight mb-1">{r.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 flex-1">{r.description}</p>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                  <span className="text-xs font-semibold text-gray-400">{r.views_count} vistas</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleDelete(r.slug)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-12">
            <ChefHat className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Aún no hay recetas creadas.</p>
          </div>
        )}
      </div>

      {showAiModal && <AiRecipeModal onClose={() => setShowAiModal(false)} onSave={fetchRecipes} />}
    </div>
  )
}
