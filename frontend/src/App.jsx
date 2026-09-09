import React, { Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Navbar from './components/Navbar'

// Code Splitting - Lazy Loading Pages
const LoginPage = React.lazy(() => import('./pages/LoginPage'))
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'))
const DashboardPage = React.lazy(() => import('./pages/admin/DashboardPage'))
const CustomersPage = React.lazy(() => import('./pages/admin/CustomersPage'))
const OrdersPage = React.lazy(() => import('./pages/admin/OrdersPage'))
const ProductsPage = React.lazy(() => import('./pages/admin/ProductsPage'))
const RecipesPage = React.lazy(() => import('./pages/RecipesPage'))
const ShopPage = React.lazy(() => import('./pages/ShopPage'))
const MyOrdersPage = React.lazy(() => import('./pages/MyOrdersPage'))
const MyLoyaltyPage = React.lazy(() => import('./pages/MyLoyaltyPage'))
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'))
const FinanceVentasPage = React.lazy(() => import('./pages/admin/FinanceVentasPage'))
const FinanceComprasPage = React.lazy(() => import('./pages/admin/FinanceComprasPage'))
const FinanceStatsPage = React.lazy(() => import('./pages/admin/FinanceStatsPage'))
const WhatsAppPage = React.lazy(() => import('./pages/admin/WhatsAppPage'))
const UsersPage = React.lazy(() => import('./pages/admin/UsersPage'))
const LoyaltyDashboard = React.lazy(() => import('./pages/admin/LoyaltyDashboard'))
const SettingsPage = React.lazy(() => import('./pages/admin/SettingsPage'))
const AiAssistantPage = React.lazy(() => import('./pages/admin/AiAssistantPage'))

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-palta-600" />
  </div>
)

function ProtectedRoute({ children, requiredRole = null }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" />
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" />
  return children
}

export default function App() {
  const { user } = useAuthStore()

  return (
    <Router>
      {user && <Navbar />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Admin Routes */}
          <Route path="/dashboard" element={<ProtectedRoute requiredRole="admin"><DashboardPage /></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute requiredRole="admin"><CustomersPage /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute requiredRole="admin"><UsersPage /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute requiredRole="admin"><OrdersPage /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute requiredRole="admin"><ProductsPage /></ProtectedRoute>} />
          <Route path="/loyalty" element={<ProtectedRoute requiredRole="admin"><LoyaltyDashboard /></ProtectedRoute>} />
          <Route path="/finance/sales" element={<ProtectedRoute requiredRole="admin"><FinanceVentasPage /></ProtectedRoute>} />
          <Route path="/finance/purchases" element={<ProtectedRoute requiredRole="admin"><FinanceComprasPage /></ProtectedRoute>} />
          <Route path="/finance/stats" element={<ProtectedRoute requiredRole="admin"><FinanceStatsPage /></ProtectedRoute>} />
          <Route path="/whatsapp" element={<ProtectedRoute requiredRole="admin"><WhatsAppPage /></ProtectedRoute>} />
          <Route path="/ai-assistant" element={<ProtectedRoute requiredRole="admin"><AiAssistantPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute requiredRole="admin"><SettingsPage /></ProtectedRoute>} />

          {/* Client Routes */}
          <Route path="/shop" element={<ProtectedRoute><ShopPage /></ProtectedRoute>} />
          <Route path="/my-orders" element={<ProtectedRoute><MyOrdersPage /></ProtectedRoute>} />
          <Route path="/my-loyalty" element={<ProtectedRoute><MyLoyaltyPage /></ProtectedRoute>} />

          {/* Public Routes */}
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/" element={user ? <Navigate to={user.role === 'admin' ? '/dashboard' : '/shop'} /> : <Navigate to="/login" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Router>
  )
}
