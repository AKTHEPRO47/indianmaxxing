import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { HeartPulse, LogIn, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login, googleLogin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const googleButtonRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined
    if (!clientId || !googleButtonRef.current) return

    const initializeGoogle = () => {
      const google = (window as any).google
      if (!google?.accounts?.id || !googleButtonRef.current) return
      google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential?: string }) => {
          if (!response.credential) return
          await googleLogin(response.credential)
          navigate(from, { replace: true })
        },
      })
      google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text: 'signin_with',
      })
    }

    if ((window as any).google?.accounts?.id) {
      initializeGoogle()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = initializeGoogle
    document.head.appendChild(script)

    return () => {
      script.remove()
    }
  }, [from, navigate])

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login({ email, password })
      navigate(from, { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/70 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-700 via-red-600 to-blue-600 text-white shadow-sm">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Tricard</div>
            <div className="text-xs text-slate-500">Sign in to your private workspace</div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-500">Use your account to restore watchlists, reports, and UI preferences across devices.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Email</span>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="input-base w-full" placeholder="you@example.com" required />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Password</span>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" className="input-base w-full" placeholder="••••••••" required />
          </label>

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          <button disabled={loading} className="btn-primary w-full justify-center">
            <LogIn className="h-4 w-4" />
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-slate-500 hover:text-slate-900">Forgot password?</Link>
          <Link to="/register" className="font-semibold text-rose-700 hover:text-rose-800">Create account</Link>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          <div className="flex items-center gap-2 font-semibold text-slate-900"><Sparkles className="h-4 w-4 text-rose-600" />Google sign-in</div>
          <p className="mt-2">Use your Google account if the client ID is configured for both frontend and backend.</p>
          <div ref={googleButtonRef} className="mt-3 min-h-[44px]" />
        </div>
      </div>
    </div>
  )
}