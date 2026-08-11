import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { ChefHat } from 'lucide-react'

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const res = await api.get('/recipes/')
        setRecipes(res.data.results || res.data)
      } finally {
        setLoading(false)
      }
    }
    fetchRecipes()
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-12 text-center">
        <ChefHat className="w-16 h-16 mx-auto mb-4 text-palta-600" />
        <h1 className="text-4xl font-bold text-palta-700 mb-4">🍳 Recetas Deliciosas 🥑</h1>
        <p className="text-gray-600 text-lg">Descubre formas innovadoras de preparar paltas y huevos</p>
      </div>

      {loading ? (
        <div className="text-center py-12">Cargando recetas...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map(recipe => (
            <div key={recipe.id} className="card hover:shadow-lg cursor-pointer">
              {recipe.image && <img src={recipe.image} alt={recipe.title} className="w-full h-48 object-cover rounded-lg mb-4" />}
              <h3 className="font-bold text-lg text-palta-700">{recipe.title}</h3>
              <p className="text-gray-600 text-sm mb-2">{recipe.description.substring(0, 100)}...</p>
              <div className="flex gap-2 flex-wrap">
                <span className="badge-success">{recipe.difficulty}</span>
                <span className="badge-warning">{recipe.meal_type}</span>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <p>⏱️ {recipe.prep_time_minutes + recipe.cook_time_minutes} min</p>
                <p>🔥 {recipe.calories} cal | 🥚 {recipe.proteins_g}g proteína</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
