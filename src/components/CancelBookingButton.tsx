
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  bookingId: string
}

export default function CancelBookingButton({ bookingId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function cancelBooking() {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this booking? The reserved seats will be released.',
    )

    if (!confirmed) return

    setLoading(true)
    setErrorMessage('')

    try {
      const response = await fetch(
        `/api/bookings/${bookingId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )

      const data = await response.json().catch(() => null)

      if (response.status === 401) {
        window.location.href =
          `/login?next=${encodeURIComponent(`/bookings/${bookingId}`)}`
        return
      }

      if (!response.ok) {
        console.error('Cancellation API error:', {
          status: response.status,
          data,
        })

        setErrorMessage(
          data?.error ??
            `Cancellation failed (HTTP ${response.status}). Check the server logs.`,
        )
        return
      }

      router.refresh()
    } catch (error) {
      console.error('Cancellation request failed:', error)
      setErrorMessage(
        'The cancellation request could not reach the server. Check your connection and the terminal running Next.js.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        className="button button-cancel"
        onClick={cancelBooking}
        disabled={loading}
      >
        {loading ? 'Cancelling...' : 'Cancel booking'}
      </button>

      {errorMessage && (
        <p role="alert" className="booking-cancel-error">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
