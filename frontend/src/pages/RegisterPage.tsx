import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HeartPulse, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { register } = useAuth()
  const navigate = useNavigate()

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await register({ email, password, full_name: fullName || null })
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/70 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-700 via-red-600 to-blue-600 text-white shadow-sm">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Tricard</div>
            <div className="text-xs text-slate-500">Create a private account</div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900">Create account</h1>
        <p className="mt-2 text-sm text-slate-500">Your watchlists, preferences, reports, and settings will sync to your account.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Full name</span>
            <input value={fullName} onChange={e => setFullName(e.target.value)} type="text" className="input-base w-full" placeholder="Your name" />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Email</span>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="input-base w-full" placeholder="you@example.com" required />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Password</span>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" className="input-base w-full" placeholder="At least 8 characters" required />
          </label>

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          <button disabled={loading} className="btn-primary w-full justify-center">
            <UserPlus className="h-4 w-4" />
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="mt-5 text-sm text-slate-500">
          Already have an account? <Link to="/login" className="font-semibold text-rose-700 hover:text-rose-800">Sign in</Link>
        </div>
      </div>
    </div>
  )
}