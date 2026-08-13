import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({ 
  baseURL: API_URL, 
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Token ${token}`
  return config
}, (error) => Promise.reject(error))

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Normalizar mensaje de error para consumo unificado en la UI
    if (!error.response) {
      error.userMessage = 'No se pudo establecer conexión con el servidor. Verifica tu conexión a internet.'
    } else {
      const data = error.response.data
      if (typeof data === 'string') {
        error.userMessage = data
      } else if (data?.detail) {
        error.userMessage = data.detail
      } else if (data?.error) {
        error.userMessage = data.error
      } else if (typeof data === 'object') {
        // Concatenar errores de validación de campos DRF (ej: { name: ["Este campo es requerido"] })
        const messages = Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' | ')
        error.userMessage = messages || 'Ocurrió un error al procesar la solicitud.'
      } else {
        error.userMessage = 'Ocurrió un error inesperado.'
      }
    }

    const isAuthRequest = error.config?.url?.includes('/auth/') || error.config?.url?.includes('/agent-config/')
    if (error.response?.status === 401 && !isAuthRequest) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

export default api
