import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const IDEMPOTENCY_REGEX = /^[0-9a-f-]{36}$/i

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Please sign in before booking an experience.' }, { status: 401 })
    }

    let body: unknown
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON request.' }, { status: 400 })
    }

    const input = body as Record<string, unknown>
    const sessionId = typeof input.sessionId === 'string' ? input.sessionId : ''
    const quantity = input.quantity
    const idempotencyKey = typeof input.idempotencyKey === 'string' ? input.idempotencyKey : ''
    const requestedMethod = input.paymentMethod === 'cash' ? 'cash' : 'online'

    if (!UUID_REGEX.test(sessionId)) {
      return NextResponse.json({ error: 'Choose a valid session.' }, { status: 400 })
    }
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return NextResponse.json({ error: 'Choose between 1 and 20 participants.' }, { status: 400 })
    }
    if (!IDEMPOTENCY_REGEX.test(idempotencyKey)) {
      return NextResponse.json({ error: 'A valid request key is required. Please try again.' }, { status: 400 })
    }

    const { data, error } = await supabase.rpc('create_booking_idempotent', {
      p_session_id: sessionId,
      p_quantity: quantity,
      p_idempotency_key: idempotencyKey,
      p_payment_method: requestedMethod,
    })

    if (error) {
      const message = error.message.toLowerCase()
      if (message.includes('not enough seats') || message.includes('session has passed') || message.includes('unavailable')) {
        return NextResponse.json({ error: 'Those seats are no longer available. Refresh and choose another session.' }, { status: 409 })
      }
      if (message.includes('idempotency key was already used')) {
        return NextResponse.json({ error: 'This request key was already used for a different booking. Please try again.' }, { status: 409 })
      }
      console.error('[hilig] create_booking_idempotent failed:', error.message)
      return NextResponse.json({ error: 'Unable to create your booking. Please try again.' }, { status: 500 })
    }

    const booking = Array.isArray(data) ? data[0] : data
    if (!booking?.booking_id) {
      return NextResponse.json({ error: 'The booking was not returned. Please refresh your bookings.' }, { status: 500 })
    }

    const resolvedMethod = booking.payment_method || (Number(booking.total_php) === 0 ? 'free' : requestedMethod)

    // Free and in-person bookings are confirmed by the atomic database RPC and must
    // never create an online checkout session.
    if (resolvedMethod === 'free' || resolvedMethod === 'cash') {
      return NextResponse.json({
        success: true,
        bookingId: booking.booking_id,
        bookingStatus: booking.status,
        paymentMethod: resolvedMethod,
        paymentStatus: resolvedMethod === 'free' ? 'not_required' : 'unpaid',
        redirectUrl: `/bookings/${encodeURIComponent(booking.booking_id)}`,
      })
    }

    // Simulation is deliberately limited to local development. It cannot be enabled in production.
    if (process.env.NODE_ENV !== 'production' && process.env.HILIG_PAYMENT_MODE === 'simulation') {
      return NextResponse.json({
        success: true,
        bookingId: booking.booking_id,
        checkoutUrl: `/api/payments/simulate?bookingId=${encodeURIComponent(booking.booking_id)}`,
        paymentMode: 'simulation',
      })
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
    const secretKey = process.env.PAYMONGO_SECRET_KEY
    if (!origin || !secretKey) {
      return NextResponse.json({
        error: 'Checkout is not configured yet. Your booking is pending; you can view it in My Bookings.',
        bookingId: booking.booking_id,
      }, { status: 503 })
    }

    const { data: bookingInfo, error: bookingInfoError } = await supabase
      .from('bookings')
      .select('id, quantity, total_php, status, paymongo_checkout_id, sessions(experience_id, experiences(title))')
      .eq('id', booking.booking_id)
      .eq('user_id', user.id)
      .single()

    if (bookingInfoError || !bookingInfo) {
      console.error('[hilig] Could not load booking for checkout:', bookingInfoError?.message)
      return NextResponse.json({ error: 'Booking created, but checkout details could not be loaded.', bookingId: booking.booking_id }, { status: 500 })
    }

    if (bookingInfo.status !== 'pending') {
      return NextResponse.json({ error: 'This booking is no longer awaiting payment.', bookingId: booking.booking_id }, { status: 409 })
    }

    const admin = createAdminClient()

    // Reuse an existing checkout when the client retries the same idempotent request.
    if (bookingInfo.paymongo_checkout_id) {
      const { data: existingAttempt } = await admin
        .from('payment_attempts')
        .select('checkout_url, status')
        .eq('booking_id', booking.booking_id)
        .eq('checkout_id', bookingInfo.paymongo_checkout_id)
        .maybeSingle()
      if (existingAttempt?.status === 'pending' && existingAttempt.checkout_url) {
        return NextResponse.json({ success: true, bookingId: booking.booking_id, checkoutUrl: existingAttempt.checkout_url })
      }
    }

    const sessionRelation = Array.isArray(bookingInfo.sessions) ? bookingInfo.sessions[0] : bookingInfo.sessions
    const experienceRelation = sessionRelation && (Array.isArray(sessionRelation.experiences) ? sessionRelation.experiences[0] : sessionRelation.experiences)
    const title = experienceRelation?.title || 'Hilig experience'

    const checkoutResponse = await fetch('https://api.paymongo.com/v2/checkout_sessions', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: { attributes: {
          line_items: [{ name: title.slice(0, 120), amount: Number(bookingInfo.total_php) * 100, currency: 'PHP', quantity: 1 }],
          payment_method_types: ['card', 'gcash', 'qrph'],
          success_url: `${origin}/bookings/${bookingInfo.id}?payment=return`,
          cancel_url: `${origin}/bookings/${bookingInfo.id}?payment=cancelled`,
          reference_number: bookingInfo.id,
          send_email_receipt: true,
          metadata: { booking_id: bookingInfo.id, user_id: user.id },
        } },
      }),
      cache: 'no-store',
    })

    const checkoutPayload = await checkoutResponse.json().catch(() => null)
    const checkout = checkoutPayload?.data
    const checkoutId = checkout?.id
    const checkoutUrl = checkout?.attributes?.checkout_url

    if (!checkoutResponse.ok || typeof checkoutId !== 'string' || typeof checkoutUrl !== 'string') {
      console.error('[hilig] PayMongo checkout creation failed:', checkoutPayload?.errors ?? checkoutResponse.status)
      return NextResponse.json({ error: 'Your booking is pending, but checkout could not be created. Please try again from your booking page.', bookingId: bookingInfo.id }, { status: 502 })
    }

    const { error: attemptError } = await admin.from('payment_attempts').insert({
      booking_id: bookingInfo.id,
      provider: 'paymongo',
      checkout_id: checkoutId,
      checkout_url: checkoutUrl,
      amount_php: Number(bookingInfo.total_php),
      currency: 'PHP',
      status: 'pending',
    })

    if (attemptError) {
      console.error('[hilig] Could not save payment attempt:', attemptError.message)
      // Do not return the provider URL if we could not persist the matching checkout.
      return NextResponse.json({ error: 'Checkout was created but could not be safely linked to your booking. Contact support before retrying.', bookingId: bookingInfo.id }, { status: 500 })
    }

    const { error: updateError } = await admin.from('bookings')
      .update({ paymongo_checkout_id: checkoutId })
      .eq('id', bookingInfo.id)
      .eq('user_id', user.id)
      .eq('status', 'pending')

    if (updateError) {
      console.error('[hilig] Could not attach checkout to booking:', updateError.message)
      return NextResponse.json({ error: 'Checkout could not be linked to your booking. Contact support before retrying.', bookingId: bookingInfo.id }, { status: 500 })
    }

    return NextResponse.json({ success: true, bookingId: bookingInfo.id, checkoutUrl })
  } catch (error) {
    console.error('[hilig] Booking API error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
