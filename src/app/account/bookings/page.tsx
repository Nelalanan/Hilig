
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CancelBookingButton from '@/components/CancelBookingButton'

export const metadata: Metadata = {
  title: 'My Bookings | Hilig',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ status?: string }>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    month: 'short',
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

function readableStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default async function BookingHistoryPage({
  searchParams,
}: Props) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login?next=/account/bookings')
  }

  const params = await searchParams
  const filter = params.status

  const validStatuses = [
    'pending',
    'confirmed',
    'cancelled',
    'refunded',
  ]

  const selectedStatus = validStatuses.includes(filter ?? '')
    ? filter!
    : 'all'

  let query = supabase
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
          slug,
          location
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (selectedStatus !== 'all') {
    query = query.eq('status', selectedStatus)
  }

  const { data: bookings, error } = await query

  if (error) {
    console.error(
      'Unable to load booking history:',
      error.message,
    )

    return (
      <section className="page-message">
        <p className="eyebrow">YOUR HILIG ACCOUNT</p>
        <h1 className="page-title">My bookings</h1>

        <p>
          We couldn't load your bookings right now.
          Please try again later.
        </p>

        <Link className="button button-dark" href="/account">
          Back to my account
        </Link>
      </section>
    )
  }

  return (
    <section className="page-message">
      <p className="eyebrow">YOUR HILIG ACCOUNT</p>

      <h1 className="page-title">My bookings</h1>

      <p>
        View your reservations and check their current status.
      </p>

      <nav
        className="booking-filters"
        aria-label="Filter bookings"
      >
        {[
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'confirmed', label: 'Confirmed' },
          { value: 'cancelled', label: 'Cancelled' },
          { value: 'refunded', label: 'Refunded' },
        ].map((item) => (
          <Link
            key={item.value}
            href={
              item.value === 'all'
                ? '/account/bookings'
                : `/account/bookings?status=${item.value}`
            }
            aria-current={
              selectedStatus === item.value ? 'page' : undefined
            }
            className={
              selectedStatus === item.value
                ? 'booking-filter booking-filter-active'
                : 'booking-filter'
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {!bookings?.length ? (
        <div className="booking-card">
          <h2>
            {selectedStatus === 'all'
              ? 'No bookings yet'
              : `No ${selectedStatus} bookings`}
          </h2>

          <p>
            {selectedStatus === 'all'
              ? 'When you book an experience, it will appear here.'
              : 'There are no bookings with this status.'}
          </p>

          <Link
            className="button button-dark"
            href="/experiences"
          >
            Find an experience
          </Link>
        </div>
      ) : (
        <div className="booking-history-list">
          {bookings.map((booking) => {
            const session = Array.isArray(booking.sessions)
              ? booking.sessions[0]
              : booking.sessions

            const experience = session
              ? Array.isArray(session.experiences)
                ? session.experiences[0]
                : session.experiences
              : null

            const canCancel =
              booking.status === 'pending' &&
              Boolean(session?.starts_at) &&
              new Date(session!.starts_at).getTime() > Date.now()

            return (
              <article
                className="booking-card booking-history-item"
                key={booking.id}
              >
                <div className="booking-history-heading">
                  <div>
                    <p className="eyebrow">
                      BOOKING REFERENCE
                    </p>

                    <p className="booking-reference">
                      {booking.id}
                    </p>
                  </div>

                  <span
                    className={`booking-status booking-status-${booking.status}`}
                  >
                    {readableStatus(booking.status)}
                  </span>
                </div>

                <h2>
                  {experience?.title ?? 'Experience unavailable'}
                </h2>

                {experience?.location && (
                  <p>{experience.location}</p>
                )}

                {session?.starts_at && (
                  <p>
                    <strong>Date and time:</strong>{' '}
                    {formatDate(session.starts_at)}
                  </p>
                )}

                <p>
                  <strong>Participants:</strong>{' '}
                  {booking.quantity}
                </p>

                <p>
                  <strong>Total:</strong>{' '}
                  {money(Number(booking.total_php))}
                </p>

                <p>
                  <strong>Booked on:</strong>{' '}
                  {formatDate(booking.created_at)}
                </p>

                <div className="auth-actions">
                  <Link
                    className="button button-dark"
                    href={`/bookings/${booking.id}`}
                  >
                    View booking details
                  </Link>

                  {experience?.slug && (
                    <Link
                      className="button button-dark"
                      href={`/experiences/${experience.slug}`}
                    >
                      View experience
                    </Link>
                  )}

                  {canCancel && (
                    <CancelBookingButton
                      bookingId={booking.id}
                    />
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      <div className="auth-actions">
        <Link className="button button-dark" href="/account">
          Back to my account
        </Link>

        <Link className="button button-dark" href="/experiences">
          Explore experiences
        </Link>
      </div>
    </section>
  )
}
