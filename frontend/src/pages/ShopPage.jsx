import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { ShoppingCart } from 'lucide-react'

export default function ShopPage() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/products/')
        setProducts(res.data.results || res.data)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  const addToCart = (product) => {
    const existing = cart.find(i => i.product.id === product.id)
    if (existing) {
      existing.quantity += 1
    } else {
      cart.push({ product, quantity: 1 })
    }
    setCart([...cart])
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-palta-700 mb-8">🛒 Comprar Productos</h1>
      
      {loading ? (
        <div>Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map(product => (
            <div key={product.id} className="card">
              <h3 className="font-bold text-lg text-palta-700">{product.name}</h3>
              <p className="text-gray-600 text-sm mb-2">{product.description}</p>
              <div className="mb-4">
                <span className="text-2xl font-bold text-huevo-600">${product.sale_price}</span>
                <span className="text-gray-600 text-sm ml-2">por {product.unit}</span>
              </div>
              <button onClick={() => addToCart(product)} className="btn-secondary w-full flex items-center justify-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Agregar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
