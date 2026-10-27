
'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    const trimmedName = fullName.trim()

    if (!trimmedName) {
      setError('Please enter your full name.')
      return
    }

    if (password.length < 8) {
      setError('Your password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: trimmedName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/account`,
        },
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.session) {
        window.location.assign('/account')
        return
      }

      setMessage(
        'Account created! Check your email for a confirmation link before signing in.',
      )
    } catch {
      setError('Unable to create your account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-message auth-page">
      <p className="eyebrow">START SOMETHING NEW</p>
      <h1 className="page-title">Join Hilig</h1>
      <p>Create an account to start exploring hobbies and experiences.</p>

      <form className="auth-form" onSubmit={handleSignup}>
        <label htmlFor="full-name">Full name</label>
        <input
          id="full-name"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Your full name"
          maxLength={100}
          required
        />

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
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
          minLength={8}
          required
        />

        <label htmlFor="confirm-password">Confirm password</label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Enter your password again"
          minLength={8}
          required
        />

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        {message && (
          <p className="auth-success" role="status">
            {message}
          </p>
        )}

        <button
          className="button button-dark"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </section>
  )
}
