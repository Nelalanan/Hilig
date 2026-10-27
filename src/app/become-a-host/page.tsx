
'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function BecomeAHostPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const trimmedName = name.trim()
    const trimmedBio = bio.trim()

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setError('Your host name must be between 2 and 100 characters.')
      return
    }

    if (trimmedBio.length > 1000) {
      setError('Your bio cannot exceed 1000 characters.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/host/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          bio: trimmedBio,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Unable to create your host profile.')
        return
      }

      setSuccess('Your host profile is ready! Opening your dashboard…')

      // Allow the success message to appear before navigating.
      window.setTimeout(() => {
        router.push('/host/bookings')
        router.refresh()
      }, 700)
    } catch {
      setError('A network error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 text-gray-900 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/experiences"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-950"
        >
          <span aria-hidden="true">←</span>
          Back to experiences
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-start">
          <section className="pt-2">
            <div className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
              Hilig Host
            </div>

            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              Share what makes you unique.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-gray-600">
              Turn your skills, passions, and local knowledge into experiences
              people can discover and book on Hilig.
            </p>

            <div className="mt-9 space-y-5">
              <Feature
                number="01"
                title="Create your host identity"
                description="Choose the name guests will see when they discover your experiences."
              />
              <Feature
                number="02"
                title="Manage your bookings"
                description="Access your host dashboard to review bookings associated with your experiences."
              />
              <Feature
                number="03"
                title="Grow at your own pace"
                description="You can update your host details by submitting this form again."
              />
            </div>

            <p className="mt-8 text-sm leading-6 text-gray-500">
              Host registration is activated immediately. Experience publishing
              and other host features may require additional setup.
            </p>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-bold">Set up your host profile</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Tell guests a little about who you are. You can refine your
              profile later.
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-6">
              <div>
                <label
                  htmlFor="host-name"
                  className="mb-2 block text-sm font-semibold"
                >
                  Host or business name
                </label>
                <input
                  id="host-name"
                  name="name"
                  type="text"
                  autoComplete="organization"
                  required
                  minLength={2}
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Iloilo Food Adventures"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition placeholder:text-gray-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Use the name you want guests to recognize.
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="host-bio"
                    className="block text-sm font-semibold"
                  >
                    About you
                  </label>
                  <span className="text-xs text-gray-500">
                    {bio.length}/1000
                  </span>
                </div>
                <textarea
                  id="host-bio"
                  name="bio"
                  rows={5}
                  maxLength={1000}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Tell guests about yourself, your interests, and the experiences you want to share."
                  className="w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition placeholder:text-gray-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Optional. You can leave this blank for now.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                >
                  {error}
                </div>
              )}

              {success && (
                <div
                  role="status"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
                >
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-700/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Setting up your profile…' : 'Become a host'}
                {!loading && <span aria-hidden="true">→</span>}
              </button>

              <p className="text-center text-xs leading-5 text-gray-500">
                By continuing, you confirm that you are creating a host profile
                for your own Hilig account.
              </p>
            </form>
          </section>
        </div>
      </div>
    </main>
  )
}

function Feature({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm font-bold text-emerald-800">
        {number}
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-gray-600">{description}</p>
      </div>
    </div>
  )
}
