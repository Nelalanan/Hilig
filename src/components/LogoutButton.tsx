'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogout() {
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        setError(error.message)
        return
      }

      router.replace('/login')
      router.refresh()
    } catch {
      setError('Unable to sign out. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        className="button button-dark"
        type="button"
        onClick={handleLogout}
        disabled={loading}
      >
        {loading ? 'Signing out...' : 'Sign out'}
      </button>

      {error && <p className="auth-error" role="alert">{error}</p>}
    </div>
  )
}