'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    console.log('[Hilig login] Form submitted', {
     email,
     page: window.location.href,
    })
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      console.log('[Hilig login] Supabase response', {
      success: !error,
      error: error?.message ?? null,
      })

      if (error) {
        setError(error.message)
        return
      }

      const params = new URLSearchParams(window.location.search)
      const requestedNext = params.get('next')

      const next =
      requestedNext?.startsWith('/') &&
      !requestedNext.startsWith('//') &&
      !requestedNext.startsWith('/\\')
      ? requestedNext
      : '/account'

      router.replace(next)
      router.refresh()
    } catch {
      setError('Unable to sign in. Please check your Supabase configuration.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-message auth-page">
      <p className="eyebrow">WELCOME BACK</p>
      <h1 className="page-title">Sign in to Hilig</h1>
      <p>Continue discovering experiences and making time for your hobbies.</p>

      <form className="auth-form" onSubmit={handleLogin}>
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Your password"
          required
        />

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button
          className="button button-dark"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="auth-switch">
        New to Hilig? <Link href="/signup">Create an account</Link>
      </p>
    </section>
  )
}