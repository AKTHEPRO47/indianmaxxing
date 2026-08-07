import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { requestPasswordReset } = useAuth()

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)
    try {
      const response: any = await requestPasswordReset({ email })
      setMessage(response?.reset_token ? `Reset token created: ${response.reset_token}` : 'If the account exists, a reset link was created.')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to create reset token')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/70">
        <div className="flex items-center gap-3 mb-6">
          <img src="/image.png" alt="Tricard logo" className="h-12 w-12 rounded-2xl object-cover shadow-sm ring-1 ring-slate-200" />
          <div>
            <div className="text-sm font-semibold text-slate-900">Tricard</div>
            <div className="text-xs text-slate-500">Password recovery</div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900">Forgot password</h1>
        <p className="mt-2 text-sm text-slate-500">Request a reset token and paste it into the reset form.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Email</span>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="input-base w-full" required />
          </label>
          {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          <button disabled={loading} className="btn-primary w-full justify-center">
            <KeyRound className="h-4 w-4" />
            {loading ? 'Sending...' : 'Send reset token'}
          </button>
        </form>

        <div className="mt-5 text-sm text-slate-500">
          <Link to="/login" className="font-semibold text-rose-700 hover:text-rose-800">Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}