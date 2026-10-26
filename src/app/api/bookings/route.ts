
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Verify the user's session on the server.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Please sign in before booking.' },
      { status: 401 },
    )
  }

  // Accept only a valid session ID and participant count.
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 },
    )
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('sessionId' in body) ||
    !('quantity' in body)
  ) {
    return NextResponse.json(
      { error: 'A session and participant count are required.' },
      { status: 400 },
    )
  }

  const { sessionId, quantity } = body

  if (
    typeof sessionId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId) ||
    typeof quantity !== 'number' ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 20
  ) {
    return NextResponse.json(
      { error: 'Choose a valid session and between 1 and 20 participants.' },
      { status: 400 },
    )
  }

  // The database function verifies capacity and creates the booking atomically.
  const { data, error } = await supabase.rpc('create_booking', {
    p_session_id: sessionId,
    p_quantity: quantity,
  })

  if (error) {
    console.error('[hilig] Booking failed:', error.message)

    const unavailable =
      /not enough seats|session has passed|session is unavailable/i.test(
        error.message,
      )

    return NextResponse.json(
      {
        error: unavailable
          ? 'This session no longer has enough available seats. Please choose another session or reduce the number of participants.'
          : 'We could not create your booking. Please try again.',
      },
      { status: unavailable ? 409 : 400 },
    )
  }

  const booking = Array.isArray(data) ? data[0] : null

  if (!booking?.booking_id) {
    return NextResponse.json(
      { error: 'The booking could not be confirmed. Please check your bookings before retrying.' },
      { status: 500 },
    )
  }

  return NextResponse.json(
    { bookingId: booking.booking_id },
    { status: 201 },
  )
}
