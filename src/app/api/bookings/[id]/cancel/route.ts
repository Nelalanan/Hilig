
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{ id: string }>
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid booking ID.' },
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
        { error: 'Please sign in to cancel this booking.' },
        { status: 401 },
      )
    }

    // If a provider checkout exists, close it before releasing seats. Otherwise a
    // guest could pay through an old checkout after the booking was cancelled.
    const { data: bookingForCancellation, error: bookingLookupError } = await supabase
      .from('bookings')
      .select('id, status, paymongo_checkout_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (bookingLookupError || !bookingForCancellation) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    }

    if (bookingForCancellation.paymongo_checkout_id) {
      const secretKey = process.env.PAYMONGO_SECRET_KEY
      if (!secretKey) {
        return NextResponse.json({ error: 'Payment status cannot be verified right now. Please try again later.' }, { status: 503 })
      }
      const authorization = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`
      const checkoutId = bookingForCancellation.paymongo_checkout_id
      const expireResponse = await fetch(`https://api.paymongo.com/v2/checkout_sessions/${encodeURIComponent(checkoutId)}/expire`, {
        method: 'POST', headers: { Authorization: authorization, 'Content-Type': 'application/json' }, cache: 'no-store',
      })

      let checkoutExpired = expireResponse.ok
      if (!expireResponse.ok) {
        const retrieve = await fetch(`https://api.paymongo.com/v2/checkout_sessions/${encodeURIComponent(checkoutId)}`, {
          headers: { Authorization: authorization }, cache: 'no-store',
        })
        const payload = await retrieve.json().catch(() => null)
        const attributes = payload?.data?.attributes
        if (retrieve.ok && attributes?.status === 'expired') checkoutExpired = true
        else {
          return NextResponse.json({ error: 'This checkout may be paid or still processing. Refresh your bookings and check the payment status before cancelling.' }, { status: 409 })
        }
      }

      if (checkoutExpired) {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const admin = createAdminClient()
        await admin.from('payment_attempts').update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('checkout_id', checkoutId).eq('status', 'pending')
      }
    }

    const { data, error } = await supabase.rpc(
      'cancel_booking',
      { p_booking_id: id },
    )

    if (error) {
      console.error('Supabase cancel_booking RPC error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })

      const message = error.message.toLowerCase()

      if (
        message.includes('booking not found') ||
        message.includes('session not found')
      ) {
        return NextResponse.json(
          { error: 'Booking not found.' },
          { status: 404 },
        )
      }

      if (
        message.includes('only pending') ||
        message.includes('already started') ||
        message.includes('release the reserved seats') ||
        message.includes('status changed')
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 },
        )
      }

      if (
        message.includes('must be signed in') ||
        message.includes('not authenticated')
      ) {
        return NextResponse.json(
          { error: 'Please sign in to cancel this booking.' },
          { status: 401 },
        )
      }

      return NextResponse.json(
        { error: 'Unable to cancel booking. Please try again.' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      booking: Array.isArray(data) ? data[0] : data,
    })
  } catch (error) {
    console.error('Cancellation API route error:', error)

    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 },
    )
  }
}
