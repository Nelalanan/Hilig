
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: Props) {
  const { id } = await params

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)

  if (!isUuid) {
    return NextResponse.json(
      { error: 'Invalid booking reference.' },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Please sign in to cancel a booking.' },
      { status: 401 },
    )
  }

  const { data, error } = await supabase.rpc('cancel_booking', {
    p_booking_id: id,
  })

  if (error) {
    console.error('[hilig] Cancellation failed:', error.message)

    const message = error.message.toLowerCase()

    if (message.includes('booking not found')) {
      return NextResponse.json(
        { error: 'Booking not found.' },
        { status: 404 },
      )
    }

    if (
      message.includes('only pending') ||
      message.includes('already started') ||
      message.includes('release the reserved seats') ||
      message.includes('status changed') ||
      message.includes('session not found')
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 },
      )
    }

    return NextResponse.json(
      { error: 'Unable to cancel this booking. Please try again.' },
      { status: 500 },
    )
  }

  const cancellation = Array.isArray(data) ? data[0] : data

  if (!cancellation?.booking_id) {
    return NextResponse.json(
      { error: 'Cancellation could not be verified. Please refresh your bookings.' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    bookingId: cancellation.booking_id,
    status: cancellation.booking_status,
  })
}
