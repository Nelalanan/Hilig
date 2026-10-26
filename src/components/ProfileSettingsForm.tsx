
'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ProfileSettingsFormProps = {
  initialFullName: string
  initialAvatarUrl: string
  email: string
}

export default function ProfileSettingsForm({
  initialFullName,
  initialAvatarUrl,
  email,
}: ProfileSettingsFormProps) {
  const router = useRouter()

  const [fullName, setFullName] = useState(initialFullName)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    const trimmedName = fullName.trim()
    const trimmedAvatarUrl = avatarUrl.trim()

    if (!trimmedName) {
      setError('Please enter your full name.')
      return
    }

    if (trimmedName.length > 100) {
      setError('Your name must be 100 characters or fewer.')
      return
    }

    if (trimmedAvatarUrl) {
      try {
        const parsedUrl = new URL(trimmedAvatarUrl)

        if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
          setError('Please enter a valid HTTP or HTTPS image URL.')
          return
        }
      } catch {
        setError('Please enter a valid profile picture URL.')
        return
      }
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('Your session has expired. Please sign in again.')
        router.replace('/login?next=/account/settings')
        router.refresh()
        return
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: trimmedName,
          avatar_url: trimmedAvatarUrl || null,
        })
        .eq('id', user.id)

      if (updateError) {
        setError('Unable to save your profile. Please try again.')
        console.error('Profile update failed:', updateError.message)
        return
      }

      setFullName(trimmedName)
      setAvatarUrl(trimmedAvatarUrl)
      setMessage('Your profile has been updated successfully.')

      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label htmlFor="profile-email">Email address</label>
      <input
        id="profile-email"
        type="email"
        value={email}
        readOnly
        disabled
      />
      <p className="settings-help">
        Your email is managed by your Hilig sign-in account.
      </p>

      <label htmlFor="profile-full-name">Full name</label>
      <input
        id="profile-full-name"
        type="text"
        autoComplete="name"
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        placeholder="Enter your full name"
        maxLength={100}
        required
      />

      <label htmlFor="profile-avatar-url">Profile picture URL</label>
      <input
        id="profile-avatar-url"
        type="url"
        inputMode="url"
        value={avatarUrl}
        onChange={(event) => setAvatarUrl(event.target.value)}
        placeholder="https://example.com/your-photo.jpg"
      />
      <p className="settings-help">
      </p>

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
        {loading ? 'Saving changes...' : 'Save changes'}
      </button>
    </form>
  )
}
