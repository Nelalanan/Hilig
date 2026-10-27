
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type BookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'refunded'

type HostBooking = {
  id: string
  displayId: string
  guestName: string
  guestEmail: string
  experience: string
  sessionDate: string
  sessionCapacity: number
  sessionBooked: number
  quantity: number
  totalPhp: number
  status: BookingStatus
  paymentStatus?: string
}

type BookingFilter =
  | 'all'
  | 'upcoming'
  | 'completed'
  | 'pending'
  | 'cancelled'

type ApiResponse = {
  hostName?: string
  bookings?: HostBooking[]
  error?: string
}

const FILTERS: { label: string; value: BookingFilter }[] = [
  { label: 'All bookings', value: 'all' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Completed', value: 'completed' },
  { label: 'Pending', value: 'pending' },
  { label: 'Cancelled', value: 'cancelled' },
]

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount)
}

function isUpcoming(booking: HostBooking) {
  return new Date(booking.sessionDate).getTime() > Date.now()
}

function statusLabel(status: BookingStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function statusClass(status: BookingStatus) {
  switch (status) {
    case 'confirmed':
      return 'bg-emerald-50 text-emerald-700'
    case 'pending':
      return 'bg-amber-50 text-amber-700'
    case 'cancelled':
      return 'bg-rose-50 text-rose-700'
    case 'refunded':
      return 'bg-slate-100 text-slate-600'
  }
}

export default function HostBookingsPage() {
  const [filter, setFilter] = useState<BookingFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedBooking, setSelectedBooking] =
    useState<HostBooking | null>(null)

  const [bookings, setBookings] = useState<HostBooking[]>([])
  const [hostName, setHostName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadBookings = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/host/bookings', {
        method: 'GET',
        cache: 'no-store',
      })

      const result: ApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Unable to load bookings.')
      }

      setBookings(
        (result.bookings ?? []).filter(
          (booking) =>
            booking &&
            typeof booking.id === 'string' &&
            typeof booking.sessionDate === 'string' &&
            ['confirmed', 'pending', 'cancelled', 'refunded'].includes(
              booking.status,
            ),
        ),
      )
      setHostName(result.hostName ?? '')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while loading your bookings.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBookings()
  }, [loadBookings])

  const now = Date.now()

  const stats = useMemo(() => {
    const upcoming = bookings.filter(
      (booking) =>
        isUpcoming(booking) &&
        booking.status !== 'cancelled' &&
        booking.status !== 'refunded',
    )

    const confirmed = bookings.filter(
      (booking) => booking.status === 'confirmed',
    )

    const pending = bookings.filter(
      (booking) => booking.status === 'pending',
    )

    return {
      upcomingSessions: new Set(
        upcoming.map((booking) => booking.sessionDate),
      ).size,
      confirmedBookings: confirmed.length,
      attendees: confirmed
        .filter(
          (booking) =>
            new Date(booking.sessionDate).getTime() >= now,
        )
        .reduce((sum, booking) => sum + booking.quantity, 0),
      pendingBookings: pending.length,
    }
  }, [bookings, now])

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase()

    return bookings
      .filter((booking) => {
        const matchesSearch =
          !query ||
          booking.guestName.toLowerCase().includes(query) ||
          booking.guestEmail.toLowerCase().includes(query) ||
          booking.experience.toLowerCase().includes(query) ||
          booking.displayId.toLowerCase().includes(query) ||
          booking.id.toLowerCase().includes(query)

        let matchesFilter = true

        switch (filter) {
          case 'upcoming':
            matchesFilter =
              isUpcoming(booking) &&
              booking.status !== 'cancelled' &&
              booking.status !== 'refunded'
            break
          case 'completed':
            matchesFilter =
              new Date(booking.sessionDate).getTime() < now &&
              booking.status === 'confirmed'
            break
          case 'pending':
            matchesFilter = booking.status === 'pending'
            break
          case 'cancelled':
            matchesFilter =
              booking.status === 'cancelled' ||
              booking.status === 'refunded'
            break
          default:
            matchesFilter = true
        }

        return matchesSearch && matchesFilter
      })
      .sort(
        (a, b) =>
          new Date(a.sessionDate).getTime() -
          new Date(b.sessionDate).getTime(),
      )
  }, [bookings, filter, search, now])

  return (
    <main className="min-h-screen bg-[#f7f8f5] px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.2em] text-emerald-700">
              HOST STUDIO
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Your bookings
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Manage your guests, keep track of upcoming sessions,
              and get ready to host great experiences.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
            <p className="text-xs text-slate-500">Host account</p>
            <p className="mt-1 font-semibold">
              {hostName || 'Host'}
            </p>
          </div>
        </header>

        {loading && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600"
          >
            Loading your bookings...
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            <p className="font-semibold">Could not load bookings</p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              onClick={() => void loadBookings()}
              className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold hover:bg-rose-100"
            >
              Try again
            </button>
          </div>
        )}

        <section
          aria-label="Booking statistics"
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <StatCard
            label="Upcoming sessions"
            value={String(stats.upcomingSessions)}
            description="Distinct future session times"
            icon="◷"
          />
          <StatCard
            label="Confirmed bookings"
            value={String(stats.confirmedBookings)}
            description="Bookings marked confirmed"
            icon="✓"
          />
          <StatCard
            label="Upcoming attendees"
            value={String(stats.attendees)}
            description="Seats in confirmed bookings"
            icon="♙"
          />
          <StatCard
            label="Pending bookings"
            value={String(stats.pendingBookings)}
            description="Awaiting confirmation"
            icon="◷"
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-lg font-bold">
                  Booking management
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review reservations and attendee details.
                </p>
              </div>

              <label className="relative block w-full lg:max-w-sm">
                <span className="sr-only">Search bookings</span>
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  ⌕
                </span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search guest, experience, or ID..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  aria-pressed={filter === item.value}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                    filter === item.value
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Guest</th>
                  <th className="px-6 py-4 font-semibold">Experience</th>
                  <th className="px-6 py-4 font-semibold">Session</th>
                  <th className="px-6 py-4 font-semibold">Attendees</th>
                  <th className="px-6 py-4 font-semibold">Total</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-5">
                      <p className="font-semibold">
                        {booking.guestName || 'Guest'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {booking.guestEmail}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="max-w-52 text-sm font-medium">
                        {booking.experience}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {booking.displayId}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="whitespace-nowrap text-sm font-medium">
                        {formatDate(booking.sessionDate)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatTime(booking.sessionDate)}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-sm">
                      <p>{booking.quantity} {booking.quantity === 1 ? 'guest' : 'guests'}</p>
                      <p className="mt-1 text-xs text-slate-500">Session: {booking.sessionBooked}/{booking.sessionCapacity} reserved</p>
                    </td>
                    <td className="px-6 py-5 text-sm font-semibold">
                      {formatCurrency(booking.totalPhp)}
                    </td>
                    <td className="px-6 py-5">
                      <StatusPill status={booking.status} />
                      <p className="mt-1 text-xs text-slate-500">Payment: {booking.paymentStatus ?? 'unknown'}</p>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedBooking(booking)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:border-slate-400 hover:bg-white"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-100 md:hidden">
            {filteredBookings.map((booking) => (
              <article
                key={booking.id}
                className="space-y-3 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {booking.guestName || 'Guest'}
                    </p>
                    <p className="break-all text-xs text-slate-500">
                      {booking.guestEmail}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusPill status={booking.status} />
                    <p className="mt-1 text-xs text-slate-500">Payment: {booking.paymentStatus ?? 'unknown'}</p>
                  </div>
                </div>

                <div>
                  <p className="font-medium">{booking.experience}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(booking.sessionDate)} ·{' '}
                    {formatTime(booking.sessionDate)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {booking.displayId}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      {booking.quantity}{' '}
                      {booking.quantity === 1 ? 'guest' : 'guests'}
                    </p>
                    <p className="mt-1 font-semibold">
                      {formatCurrency(booking.totalPhp)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Session: {booking.sessionBooked}/{booking.sessionCapacity} reserved</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedBooking(booking)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
                  >
                    View details
                  </button>
                </div>
              </article>
            ))}
          </div>

          {!loading && !error && filteredBookings.length === 0 && (
            <div className="px-6 py-16 text-center">
              <div className="text-3xl text-slate-300">⌕</div>
              <h3 className="mt-3 font-semibold">No bookings found</h3>
              <p className="mt-1 text-sm text-slate-500">
                {bookings.length === 0
                  ? 'Bookings for your experiences will appear here.'
                  : 'Try another search or choose a different filter.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setFilter('all')
                }}
                className="mt-4 text-sm font-semibold text-emerald-700 hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}

          <footer className="border-t border-slate-100 bg-slate-50 px-5 py-4 text-xs text-slate-500 sm:px-6">
            {loading
              ? 'Loading booking records...'
              : `Showing ${filteredBookings.length} of ${bookings.length} bookings.`}
          </footer>
        </section>
      </div>

      {selectedBooking && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedBooking(null)
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-detail-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-widest text-emerald-700">
                  BOOKING DETAILS
                </p>
                <h2
                  id="booking-detail-title"
                  className="mt-2 text-xl font-bold"
                >
                  {selectedBooking.guestName || 'Guest'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedBooking.displayId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                aria-label="Close booking details"
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <DetailRow
                label="Guest email"
                value={selectedBooking.guestEmail || 'Not available'}
              />
              <DetailRow
                label="Experience"
                value={selectedBooking.experience}
              />
              <DetailRow
                label="Session date"
                value={formatDate(selectedBooking.sessionDate)}
              />
              <DetailRow
                label="Session time"
                value={formatTime(selectedBooking.sessionDate)}
              />
              <DetailRow
                label="Attendees"
                value={String(selectedBooking.quantity)}
              />
              <DetailRow
                label="Booking total"
                value={formatCurrency(selectedBooking.totalPhp)}
              />
              <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
                <span className="text-sm text-slate-500">
                  Booking status
                </span>
                <StatusPill status={selectedBooking.status} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedBooking(null)}
              className="mt-7 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Close details
            </button>
          </section>
        </div>
      )}
    </main>
  )
}

function StatCard({
  label,
  value,
  description,
  icon,
}: {
  label: string
  value: string
  description: string
  icon: string
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-lg font-semibold text-emerald-700">
          {icon}
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </article>
  )
}

function StatusPill({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(status)}`}
    >
      {statusLabel(status)}
    </span>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="max-w-[65%] break-words text-right text-sm font-medium">
        {value}
      </span>
    </div>
  )
}
