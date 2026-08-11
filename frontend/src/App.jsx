import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Navbar from './components/Navbar'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/admin/DashboardPage'
import CustomersPage from './pages/admin/CustomersPage'
import OrdersPage from './pages/admin/OrdersPage'
import ProductsPage from './pages/admin/ProductsPage'
import RecipesPage from './pages/RecipesPage'
import ShopPage from './pages/ShopPage'
import MyOrdersPage from './pages/MyOrdersPage'
import NotFoundPage from './pages/NotFoundPage'
import FinancePage from './pages/admin/FinancePage'
import WhatsAppPage from './pages/admin/WhatsAppPage'

function ProtectedRoute({ children, requiredRole = null }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" />
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" />
  return children
}

export default function App() {
  const { user, token } = useAuthStore()

  // Cargar usuario del localStorage al iniciar
  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (savedToken && savedUser) {
      useAuthStore.setState({ token: savedToken, user: JSON.parse(savedUser) })
    }
  }, [])

  return (
    <Router>
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Admin Routes */}
        <Route path="/dashboard" element={<ProtectedRoute requiredRole="admin"><DashboardPage /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute requiredRole="admin"><CustomersPage /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute requiredRole="admin"><OrdersPage /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute requiredRole="admin"><ProductsPage /></ProtectedRoute>} />
        <Route path="/finance" element={<ProtectedRoute requiredRole="admin"><FinancePage /></ProtectedRoute>} />
        <Route path="/whatsapp" element={<ProtectedRoute requiredRole="admin"><WhatsAppPage /></ProtectedRoute>} />

        {/* Client Routes */}
        <Route path="/shop" element={<ProtectedRoute><ShopPage /></ProtectedRoute>} />
        <Route path="/my-orders" element={<ProtectedRoute><MyOrdersPage /></ProtectedRoute>} />
        <Route path="/my-loyalty" element={<ProtectedRoute><MyOrdersPage /></ProtectedRoute>} />

        {/* Public Routes */}
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/" element={user ? <Navigate to={user.role === 'admin' ? '/dashboard' : '/shop'} /> : <Navigate to="/login" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  )
}
