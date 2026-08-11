import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isLoading: false,
  login: (user, token) => set({ user, token }),
  logout: () => set({ user: null, token: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),
}))
