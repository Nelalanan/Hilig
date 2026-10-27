
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const allowedStatuses = [
  'confirmed',
  'pending',
  'cancelled',
  'refunded',
] as const

type BookingStatus = (typeof allowedStatuses)[number]

export async function GET() {
  try {
    // Identify the user using their authenticated session.
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Please sign in to view host bookings.' },
        { status: 401 },
      )
    }

    // Verify the account has the host role.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Host profile lookup failed:', profileError.message)
      return NextResponse.json(
        { error: 'Unable to verify your account.' },
        { status: 500 },
      )
    }

    if (!profile || profile.role !== 'host') {
      return NextResponse.json(
        { error: 'A host account is required to view these bookings.' },
        { status: 403 },
      )
    }

    // Only use the admin client after authenticating the user.
    const admin = createAdminClient()

    // Resolve the host record owned by this authenticated user.
    const { data: host, error: hostError } = await admin
      .from('hosts')
      .select('id, name')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (hostError) {
      console.error('Host lookup failed:', hostError.message)
      return NextResponse.json(
        { error: 'Unable to load your host account.' },
        { status: 500 },
      )
    }

    if (!host) {
      return NextResponse.json(
        { error: 'No host profile is linked to this account.' },
        { status: 404 },
      )
    }

    // Find only experiences owned by this host.
    const { data: experiences, error: experiencesError } = await admin
      .from('experiences')
      .select('id, title')
      .eq('host_id', host.id)

    if (experiencesError) {
      console.error('Experience lookup failed:', experiencesError.message)
      return NextResponse.json(
        { error: 'Unable to load your experiences.' },
        { status: 500 },
      )
    }

    const experienceIds = (experiences ?? []).map((item) => item.id)
    const experienceById = new Map(
      (experiences ?? []).map((item) => [item.id, item.title]),
    )

    if (experienceIds.length === 0) {
      return NextResponse.json({
        hostName: host.name,
        bookings: [],
      })
    }

    // Find sessions belonging to those experiences.
    const { data: sessions, error: sessionsError } = await admin
      .from('sessions')
      .select('id, experience_id, starts_at, capacity, booked')
      .in('experience_id', experienceIds)

    if (sessionsError) {
      console.error('Session lookup failed:', sessionsError.message)
      return NextResponse.json(
        { error: 'Unable to load your sessions.' },
        { status: 500 },
      )
    }

    const sessionIds = (sessions ?? []).map((session) => session.id)
    const sessionById = new Map(
      (sessions ?? []).map((session) => [session.id, session]),
    )

    if (sessionIds.length === 0) {
      return NextResponse.json({
        hostName: host.name,
        bookings: [],
      })
    }

    // Only fetch bookings for sessions owned by this host.
    const { data: rows, error: bookingsError } = await admin
      .from('bookings')
      .select(
        'id, user_id, session_id, quantity, total_php, status, created_at',
      )
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false })

    if (bookingsError) {
      console.error('Booking lookup failed:', bookingsError.message)
      return NextResponse.json(
        { error: 'Unable to load bookings.' },
        { status: 500 },
      )
    }

    const bookingIds = (rows ?? []).map((booking) => booking.id)
    const { data: paymentAttempts, error: paymentAttemptsError } = bookingIds.length
      ? await admin.from('payment_attempts')
          .select('booking_id, status, created_at')
          .in('booking_id', bookingIds)
          .order('created_at', { ascending: false })
      : { data: [], error: null }

    if (paymentAttemptsError) {
      console.error('Payment attempt lookup failed:', paymentAttemptsError.message)
      return NextResponse.json({ error: 'Unable to load payment statuses.' }, { status: 500 })
    }

    const paymentStatusByBooking = new Map<string, string>()
    for (const attempt of paymentAttempts ?? []) {
      if (!paymentStatusByBooking.has(attempt.booking_id)) {
        paymentStatusByBooking.set(attempt.booking_id, attempt.status)
      }
    }

    const userIds = [
      ...new Set((rows ?? []).map((booking) => booking.user_id)),
    ]

    // Load public profile names separately to avoid relying on a
    // particular generated foreign-key relationship name.
    const { data: guestProfiles, error: guestsError } =
      userIds.length > 0
        ? await admin
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds)
        : { data: [], error: null }

    if (guestsError) {
      console.error('Guest profile lookup failed:', guestsError.message)
      return NextResponse.json(
        { error: 'Unable to load guest details.' },
        { status: 500 },
      )
    }

    const guestNameById = new Map(
      (guestProfiles ?? []).map((guest) => [
        guest.id,
        guest.full_name || 'Guest',
      ]),
    )

    // Email addresses live in Supabase Auth, not in the profiles schema.
    // Fetch only the users referenced by these bookings.
    const guestUsers = await Promise.all(
      userIds.map(async (id) => {
        const { data, error } = await admin.auth.admin.getUserById(id)

        if (error) {
          console.error(`Could not load guest email for ${id}`)
        }

        return [id, data.user?.email ?? ''] as const
      }),
    )

    const guestEmailById = new Map(guestUsers)

    const bookings = (rows ?? []).flatMap((booking) => {
      const session = sessionById.get(booking.session_id)

      if (!session) return []

      const status = allowedStatuses.includes(
        booking.status as BookingStatus,
      )
        ? (booking.status as BookingStatus)
        : null

      // Do not silently display an unexpected database status.
      if (!status) return []

      return [
        {
          id: booking.id,
          displayId: `HLG-${booking.id.slice(0, 8).toUpperCase()}`,
          guestName: guestNameById.get(booking.user_id) ?? 'Guest',
          guestEmail: guestEmailById.get(booking.user_id) ?? '',
          experience:
            experienceById.get(session.experience_id) ?? 'Experience',
          sessionDate: session.starts_at,
          sessionCapacity: Number(session.capacity),
          sessionBooked: Number(session.booked),
          quantity: Number(booking.quantity),
          totalPhp: Number(booking.total_php),
          status,
          paymentStatus: paymentStatusByBooking.get(booking.id) ?? (status === 'confirmed' ? 'paid' : status === 'cancelled' ? 'cancelled' : 'not_started'),
        },
      ]
    })

    return NextResponse.json({
      hostName: host.name,
      bookings,
    })
  } catch (error) {
    console.error('Host bookings API failed:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred while loading bookings.' },
      { status: 500 },
    )
  }
}
