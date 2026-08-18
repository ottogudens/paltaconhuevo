import { create } from 'zustand'

const savedToken = localStorage.getItem('token') || null
const savedUserStr = localStorage.getItem('user')
let savedUser = null
if (savedUserStr && savedUserStr !== 'undefined') {
  try {
    savedUser = JSON.parse(savedUserStr)
  } catch (e) {}
}

export const useAuthStore = create((set) => ({
  user: savedUser,
  token: savedToken,
  isLoading: false,
  login: (user, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token })
  },
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null })
  },
  setLoading: (loading) => set({ isLoading: loading }),
  updateUser: (updates) => set((state) => {
    const newUser = { ...state.user, ...updates }
    localStorage.setItem('user', JSON.stringify(newUser))
    return { user: newUser }
  }),
}))
