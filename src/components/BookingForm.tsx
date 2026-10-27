
'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import type { Session } from '@/lib/types'

type Props = {
  sessions: Session[]
  pricePhp: number
  onlinePaymentEnabled?: boolean
  cashPaymentEnabled?: boolean
  cashPaymentInstructions?: string | null
}

function formatDate(startsAt: string) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(startsAt))
}

function formatTime(startsAt: string) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(startsAt))
}

function money(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function BookingForm({ sessions, pricePhp, onlinePaymentEnabled = true, cashPaymentEnabled = false, cashPaymentInstructions }: Props) {
  // Sessions passed by the data layer contain upcoming dates only.
  const upcomingSessions = sessions.filter(
    (session) => Date.parse(session.startsAt) > Date.now(),
  )

  const availableSessions = upcomingSessions.filter(
    (session) => session.capacity - session.booked > 0,
  )

  const [sessionId, setSessionId] = useState(
    availableSessions[0]?.id ?? '',
  )
  const [quantity, setQuantity] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>(onlinePaymentEnabled ? 'online' : 'cash')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Reuse the same key after network failures so retries cannot reserve seats twice.
  const idempotencyKeyRef = useRef<string | null>(null)

  const selectedSession = availableSessions.find(
    (session) => session.id === sessionId,
  )

  const spotsLeft = selectedSession
    ? Math.max(0, selectedSession.capacity - selectedSession.booked)
    : 0

  // Keep the participant count within the selected session's capacity.
  const safeQuantity = Math.min(quantity, Math.max(1, spotsLeft))
  const total = pricePhp * safeQuantity

  async function submitBooking() {
    if (!selectedSession || submitting) return

    if (safeQuantity > spotsLeft) {
      setError('Not enough seats remain. Please choose another session or participant count.')
      return
    }

    setError('')
    setSubmitting(true)
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID()
    }

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          quantity: safeQuantity,
          idempotencyKey: idempotencyKeyRef.current,
          paymentMethod,
        }),
      })

      const result = await response.json()

      if (response.status === 401) {
        window.location.assign(
          `/login?next=${encodeURIComponent(window.location.pathname)}`,
        )
        return
      }

      if (!response.ok) {
        setError(
          response.status === 409
            ? 'Those seats are no longer available. Please refresh the page and choose another session.'
            : result.error ?? 'Booking failed. Please try again.',
        )
        return
      }

      if (typeof result.redirectUrl === 'string') {
        window.location.assign(result.redirectUrl)
        return
      }
      if (typeof result.checkoutUrl !== 'string') {
        setError(result.error ?? 'Checkout could not be opened. Please try again.')
        return
      }

      window.location.assign(result.checkoutUrl)
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // No future sessions have been scheduled.
  if (upcomingSessions.length === 0) {
    return (
      <aside className="booking-card" aria-label="Booking">
        <p className="booking-price">
          {money(pricePhp)} <small>/ person</small>
        </p>

        <h2>No upcoming dates yet</h2>
        <p className="booking-note">
          The host hasn't scheduled another session yet. Please check back
          soon for new dates.
        </p>

        <Link
          href="/experiences"
          className="button button-dark"
        >
          Explore other experiences
        </Link>
      </aside>
    )
  }

  // Upcoming sessions exist, but every session is full.
  if (availableSessions.length === 0) {
    return (
      <aside className="booking-card" aria-label="Booking">
        <p className="booking-price">
          {money(pricePhp)} <small>/ person</small>
        </p>

        <h2>All sessions are sold out</h2>
        <p className="booking-note">
          All upcoming sessions are currently full. Please check back later
          for newly scheduled dates.
        </p>

        <Link
          href="/experiences"
          className="button button-dark"
        >
          Explore other experiences
        </Link>
      </aside>
    )
  }

  return (
    <aside className="booking-card" aria-label="Book this experience">
      <p className="booking-price">
        {money(pricePhp)} <small>/ person</small>
      </p>

      <div className="auth-form">
        <label htmlFor="booking-session">Choose a session</label>
        <select
          id="booking-session"
          value={sessionId}
          onChange={(event) => {
            setSessionId(event.target.value)
            idempotencyKeyRef.current = null
            setQuantity(1)
            setError('')
          }}
          disabled={submitting}
        >
          {availableSessions.map((session) => (
            <option key={session.id} value={session.id}>
              {formatDate(session.startsAt)} · {formatTime(session.startsAt)}
              {' — '}{session.capacity - session.booked} left
            </option>
          ))}
        </select>

        <label htmlFor="booking-quantity">Participants</label>
        <select
          id="booking-quantity"
          value={safeQuantity}
          onChange={(event) => {
            setQuantity(Number(event.target.value))
            idempotencyKeyRef.current = null
            setError('')
          }}
          disabled={submitting || !selectedSession}
        >
          {Array.from(
            { length: Math.min(20, spotsLeft) },
            (_, index) => index + 1,
          ).map((count) => (
            <option key={count} value={count}>
              {count} {count === 1 ? 'person' : 'people'}
            </option>
          ))}
        </select>
      </div>

      <div className="booking-next">
        <span>Selected date</span>
        <b>
          {selectedSession
            ? `${formatDate(selectedSession.startsAt)} · ${formatTime(selectedSession.startsAt)}`
            : 'Choose a session'}
        </b>
      </div>

      <div className="booking-next">
        <span>
          Total · {safeQuantity} {safeQuantity === 1 ? 'person' : 'people'}
        </span>
        <b>{money(total)}</b>
      </div>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      {pricePhp > 0 && (onlinePaymentEnabled || cashPaymentEnabled) && (
        <fieldset className="auth-form" style={{ border: 0, padding: 0, margin: '1rem 0' }}>
          <legend><strong>Payment method</strong></legend>
          {onlinePaymentEnabled && (
            <label className="form-option">
              <input type="radio" name="paymentMethod" value="online" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} />
              <span><strong>Pay online</strong><small>Secure checkout through Hilig.</small></span>
            </label>
          )}
          {cashPaymentEnabled && (
            <label className="form-option">
              <input type="radio" name="paymentMethod" value="cash" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} />
              <span><strong>Pay in person</strong><small>{cashPaymentInstructions || 'Reserve your spot now and pay the host in person.'}</small></span>
            </label>
          )}
        </fieldset>
      )}
      {pricePhp === 0 && <p className="booking-note">Free reservation — no payment is required.</p>}

      <button
        type="button"
        className="button button-dark"
        onClick={submitBooking}
        disabled={!selectedSession || submitting}
      >
        {submitting ? 'Confirming booking…' : pricePhp === 0 ? 'Reserve for free' : paymentMethod === 'cash' ? 'Reserve and pay in person' : 'Continue to payment'}
      </button>

        <p className="booking-note">
        Your seats will be reserved while your booking is pending.
        Complete payment through PayMongo to confirm your booking.
        </p>

      <p className="booking-note">
        Need an account? <Link href="/login">Sign in</Link> to continue.
      </p>
    </aside>
  )
}
