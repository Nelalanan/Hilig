
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CancelBookingButton from '@/components/CancelBookingButton'


export const metadata: Metadata = {
  title: 'Booking confirmation',
  robots: { index: false, follow: false },
}

type Props = {
  params: Promise<{ id: string }>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function money(value: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function BookingConfirmationPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/bookings/${id}`)}`)
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      id,
      quantity,
      total_php,
      status,
      created_at,
      sessions (
        starts_at,
        experiences (
          title,
          location,
          slug
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !booking) notFound()

  const session = Array.isArray(booking.sessions)
    ? booking.sessions[0]
    : booking.sessions

  if (!session) notFound()

  const experience = Array.isArray(session.experiences)
    ? session.experiences[0]
    : session.experiences

  if (!experience) notFound()

  return (
    <section className="page-message">
      <p className="eyebrow">BOOKING RECEIVED</p>
      <h1 className="page-title">You're on your way!</h1>
      <p>
        Your booking details are shown below. Payment confirmation is updated only after Hilig receives a verified payment notification.
      </p>

      <div className="booking-card">
        <p><strong>Booking reference</strong></p>
        <p>{booking.id}</p>

        <p><strong>Experience</strong></p>
        <p>{experience.title}</p>

        <p><strong>Location</strong></p>
        <p>{experience.location}</p>

        <p><strong>Date and time</strong></p>
        <p>{formatDate(session.starts_at)}</p>

        <p><strong>Participants</strong></p>
        <p>{booking.quantity}</p>

        <p><strong>Total</strong></p>
        <p>{money(booking.total_php)}</p>

        <p><strong>Status</strong></p>
        <p>{booking.status === 'pending' ? 'Pending' : booking.status}</p>
        {booking.status === 'pending' &&
        new Date(session.starts_at).getTime() > Date.now() && (
        <CancelBookingButton bookingId={booking.id} />
        )}
      </div>

      <p>
        A pending booking is not a confirmed payment. If you just returned from checkout, refresh this page in a moment while Hilig verifies the provider notification.
      </p>

      <Link
        className="button button-dark"
        href={`/experiences/${experience.slug}`}
      >
        Back to experience
      </Link>
      <p>
      <Link href="/account/bookings">View all my bookings</Link>
      </p>

      <p>
        <Link href="/experiences">Explore more experiences</Link>
      </p>
    </section>
  )
}
