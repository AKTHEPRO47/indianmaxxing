import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { confirmPasswordReset, getCurrentUser, login, logout, googleLogin, register, requestPasswordReset, updatePreferences, updateProfile } from '../api/client'
import type { AuthResponse, LoginPayload, RegisterPayload, ResetPasswordConfirmPayload, ResetPasswordPayload, UpdatePreferencesPayload, UpdateProfilePayload, UserProfile } from '../types'

type AuthContextValue = {
  user: UserProfile | null
  loading: boolean
  login: (payload: LoginPayload) => Promise<AuthResponse>
  register: (payload: RegisterPayload) => Promise<AuthResponse>
  googleLogin: (credential: string) => Promise<AuthResponse>
  logout: () => Promise<void>
  requestPasswordReset: (payload: ResetPasswordPayload) => Promise<unknown>
  confirmPasswordReset: (payload: ResetPasswordConfirmPayload) => Promise<unknown>
  updateProfile: (payload: UpdateProfilePayload) => Promise<UserProfile>
  updatePreferences: (payload: UpdatePreferencesPayload) => Promise<UserProfile>
  refreshUser: () => Promise<UserProfile | null>
}

const accentPalette: Record<string, string> = {
  slate: '#0f172a',
  rose: '#be123c',
  emerald: '#059669',
  blue: '#2563eb',
  violet: '#7c3aed',
  amber: '#d97706',
}

const resolveTheme = (mode: UserProfile['theme_mode'] | undefined) => {
  if (mode === 'dark') return 'dark'
  if (mode === 'light') return 'light'
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const applyPreferences = (profile: UserProfile | null) => {
    const root = document.documentElement
    const resolvedTheme = resolveTheme(profile?.theme_mode)
    root.dataset.tricardTheme = profile?.theme_mode ?? 'light'
    root.dataset.tricardThemeResolved = resolvedTheme
    root.dataset.tricardAccent = profile?.accent_color ?? 'slate'
    root.dataset.tricardLayout = profile?.dashboard_layout ?? 'comfortable'
    root.dataset.tricardDensity = profile?.card_density ?? 'comfortable'
    root.style.setProperty('--tricard-accent', accentPalette[profile?.accent_color ?? 'slate'])
    root.classList.toggle('dark', resolvedTheme === 'dark')
    if (profile?.dashboard_layout) localStorage.setItem('tricard-dashboard-layout', profile.dashboard_layout)
    if (profile?.card_density) localStorage.setItem('tricard-card-density', profile.card_density)
    if (profile?.theme_mode) localStorage.setItem('tricard-theme', profile.theme_mode)
    if (profile?.accent_color) localStorage.setItem('tricard-accent', profile.accent_color)
  }

  const refreshUser = async () => {
    try {
      const profile = await getCurrentUser()
      setUser(profile)
      applyPreferences(profile)
      return profile
    } catch {
      setUser(null)
      applyPreferences(null)
      return null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  useEffect(() => {
    if (user?.theme_mode !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyPreferences(user)
    handler()
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [user])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    login: async (payload) => {
      const response = await login(payload)
      setUser(response.user)
      applyPreferences(response.user)
      return response
    },
    register: async (payload) => {
      const response = await register(payload)
      setUser(response.user)
      applyPreferences(response.user)
      return response
    },
    googleLogin: async (credential) => {
      const response = await googleLogin(credential)
      setUser(response.user)
      applyPreferences(response.user)
      return response
    },
    logout: async () => {
      await logout()
      setUser(null)
      applyPreferences(null)
    },
    requestPasswordReset,
    confirmPasswordReset,
    updateProfile: async (payload) => {
      const profile = await updateProfile(payload)
      setUser(profile)
      applyPreferences(profile)
      return profile
    },
    updatePreferences: async (payload) => {
      const profile = await updatePreferences(payload)
      setUser(profile)
      applyPreferences(profile)
      return profile
    },
    refreshUser,
  }), [loading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}