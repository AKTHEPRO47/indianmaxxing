import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CircleCheck, CircleX, Loader2 } from 'lucide-react'
import { verifyEmail } from '../api/client'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Verifying your email address...')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setState('error')
      setMessage('This verification link is missing its token.')
      return
    }
    verifyEmail(token)
      .then(response => {
        setState('success')
        setMessage(response?.message ?? 'Email verified successfully.')
      })
      .catch(error => {
        setState('error')
        setMessage(error?.response?.data?.detail ?? 'This verification link is invalid or has already been used.')
      })
  }, [searchParams])

  const success = state === 'success'
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md border border-slate-200 bg-white p-8 text-center shadow-xl">
        {state === 'loading' ? <Loader2 className="mx-auto h-10 w-10 animate-spin text-slate-700" /> : success ? <CircleCheck className="mx-auto h-10 w-10 text-emerald-600" /> : <CircleX className="mx-auto h-10 w-10 text-rose-600" />}
        <h1 className="mt-5 text-2xl font-bold text-slate-950">{success ? 'Email verified' : state === 'loading' ? 'Verifying email' : 'Verification unavailable'}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{message}</p>
        <Link to="/login" className="btn-primary mt-6 justify-center">Continue to sign in</Link>
      </div>
    </div>
  )
}