
import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string,
  isTestMode: boolean,
) {
  if (!signatureHeader) return false

  const parts = signatureHeader.split(',').map((part) => part.trim())
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2)
  const testSignature = parts.find((part) => part.startsWith('te='))?.slice(3)
  const liveSignature = parts.find((part) => part.startsWith('li='))?.slice(3)

  const suppliedSignature = isTestMode ? testSignature : liveSignature

  if (!timestamp || !suppliedSignature || !/^\d+$/.test(timestamp)) {
    return false
  }

  const expected = createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${rawBody}`, 'utf8')
    .digest()

  if (!/^[0-9a-f]{64}$/i.test(suppliedSignature)) {
    return false
  }

  const supplied = Buffer.from(suppliedSignature, 'hex')

  return (
    supplied.length === expected.length &&
    timingSafeEqual(supplied, expected)
  )
}

async function queueAndSendConfirmation(admin: ReturnType<typeof createAdminClient>, bookingId: string, userId: string) {
  const { data: authUser } = await admin.auth.admin.getUserById(userId)
  const email = authUser.user?.email ?? ''
  if (!email) return

  const { data: notification, error } = await admin
    .from('booking_notifications')
    .upsert({
      booking_id: bookingId,
      notification_type: 'booking_confirmed',
      recipient_email: email,
      status: 'pending',
      payload: { source: 'paymongo_webhook' },
    }, { onConflict: 'booking_id,notification_type', ignoreDuplicates: true })
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[hilig] Could not queue booking email:', error.message)
    return
  }
  if (!notification?.id) return // Already queued/sent; do not send a duplicate.

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.HILIG_EMAIL_FROM
  if (!apiKey || !from) return // Remains pending until email delivery is configured.

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `hilig-booking-notification-${notification.id}` },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Your Hilig booking is confirmed',
      text: `Your Hilig booking ${bookingId} is confirmed. You can view the details in your Hilig account.`,
    }),
    cache: 'no-store',
  })

  if (response.ok) {
    await admin.from('booking_notifications').update({ status: 'sent', sent_at: new Date().toISOString(), attempts: 1 })
      .eq('id', notification.id)
  } else {
    const message = (await response.text()).slice(0, 1000)
    await admin.from('booking_notifications').update({ status: 'failed', attempts: 1, last_error: message })
      .eq('id', notification.id)
    console.error('[hilig] Confirmation email delivery failed:', response.status)
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET
  const secretKey = process.env.PAYMONGO_SECRET_KEY

  if (!webhookSecret || !secretKey) {
    console.error('[hilig] PayMongo webhook configuration is missing.')

    return NextResponse.json(
      { error: 'Webhook is not configured.' },
      { status: 500 },
    )
  }

  const rawBody = await request.text()
  const isTestMode = secretKey.startsWith('sk_test_')

  if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
    return NextResponse.json(
      { error: 'Invalid payment configuration.' },
      { status: 500 },
    )
  }

  const validSignature = verifySignature(
    rawBody,
    request.headers.get('Paymongo-Signature'),
    webhookSecret,
    isTestMode,
  )

  if (!validSignature) {
    return NextResponse.json(
      { error: 'Invalid webhook signature.' },
      { status: 401 },
    )
  }

  let payload: any

  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload.' },
      { status: 400 },
    )
  }

  // PayMongo v2 wraps the event type and Checkout Session in data.
const event = payload?.data
const eventAttributes = event?.attributes
const eventType = eventAttributes?.type

if (eventType !== 'checkout_session.payment.paid') {
  console.info('[hilig] Ignoring PayMongo event:', eventType)
  return NextResponse.json({ received: true })
}

const eventId = typeof event?.id === 'string' ? event.id : null
if (!eventId) {
  return NextResponse.json({ error: 'Webhook event ID is missing.' }, { status: 400 })
}

const checkout = eventAttributes?.data
const attributes = checkout?.attributes
const checkoutId = checkout?.id
const referenceNumber = attributes?.reference_number
const payments = attributes?.payments

  if (
    typeof checkoutId !== 'string' ||
    typeof referenceNumber !== 'string' ||
    !Array.isArray(payments)
  ) {
    return NextResponse.json(
      { error: 'Incomplete checkout payment event.' },
      { status: 400 },
    )
  }

  if (typeof eventAttributes?.livemode === 'boolean' && eventAttributes.livemode === isTestMode) {
    return NextResponse.json(
      { error: 'Payment mode does not match server configuration.' },
      { status: 400 },
    )
  }

  const paidPayment = payments.find(
    (payment: any) => payment?.attributes?.status === 'paid',
  )

  if (!paidPayment) {
    return NextResponse.json(
      { error: 'No successful payment found.' },
      { status: 400 },
    )
  }

  const paymentAttributes = paidPayment.attributes

  if (
    paymentAttributes.currency !== 'PHP' ||
    !Number.isSafeInteger(paymentAttributes.amount) ||
    paymentAttributes.amount <= 0 ||
    !Number.isSafeInteger(paymentAttributes.net_amount) ||
    paymentAttributes.net_amount <= 0
  ) {
    return NextResponse.json(
      { error: 'Invalid payment amount or currency.' },
      { status: 400 },
    )
  }

  try {
    const admin = createAdminClient()

    const { error: eventInsertError } = await admin.from('payment_webhook_events').insert({
      event_id: eventId,
      event_type: eventType,
      processing_status: 'processing',
    })
    if (eventInsertError && eventInsertError.code !== '23505') {
      console.error('[hilig] Could not record webhook event:', eventInsertError.message)
      return NextResponse.json({ error: 'Unable to record webhook event.' }, { status: 500 })
    }
    if (eventInsertError?.code === '23505') {
      const { data: priorEvent } = await admin.from('payment_webhook_events')
        .select('processing_status').eq('event_id', eventId).maybeSingle()
      if (priorEvent?.processing_status === 'processed' || priorEvent?.processing_status === 'ignored') {
        return NextResponse.json({ received: true, alreadyProcessed: true })
      }
      // Failed or in-progress events are allowed to retry; booking updates below are conditional.
    }

    // The reference number must be the booking ID we supplied at checkout.
    const { data: booking, error: lookupError } = await admin
      .from('bookings')
      .select('id, user_id, status, total_php, paymongo_checkout_id, paid_at')
      .eq('id', referenceNumber)
      .maybeSingle()

    if (lookupError) {
      console.error('[hilig] Webhook booking lookup failed:', lookupError.message)

      return NextResponse.json(
        { error: 'Unable to look up booking.' },
        { status: 500 },
      )
    }

    if (!booking || booking.paymongo_checkout_id !== checkoutId) {
      console.error('[hilig] Webhook checkout does not match a booking.')

      return NextResponse.json(
        { error: 'Checkout does not match a booking.' },
        { status: 400 },
      )
    }

    // PayMongo amounts are in centavos; net_amount is the merchant amount
    // after payment-method fees, if any.
    // `amount` is the gross amount charged to the guest. `net_amount` is
    // after fees and must not be compared with the booking's customer total.
    if (paymentAttributes.amount !== booking.total_php * 100) {
      console.error('[hilig] Charged payment amount does not match booking total.')
      return NextResponse.json({ error: 'Payment amount does not match booking total.' }, { status: 400 })
    }

    // Duplicate delivery of an already processed event is safe to acknowledge.
    if (booking.status === 'confirmed' && booking.paid_at) {
      await admin.from('payment_webhook_events').update({ processing_status: 'processed', processed_at: new Date().toISOString() }).eq('event_id', eventId)
      await queueAndSendConfirmation(admin, booking.id, booking.user_id)
      return NextResponse.json({ received: true, alreadyProcessed: true })
    }

    if (booking.status !== 'pending') {
      console.error('[hilig] Paid checkout belongs to a non-pending booking.')

      return NextResponse.json(
        { error: 'Booking is not pending.' },
        { status: 409 },
      )
    }

    // Conditional update prevents two webhook deliveries from confirming twice.
    const { data: updated, error: updateError } = await admin
      .from('bookings')
      .update({
        status: 'confirmed',
        paid_at: new Date().toISOString(),
      })
      .eq('id', booking.id)
      .eq('paymongo_checkout_id', checkoutId)
      .eq('status', 'pending')
      .is('paid_at', null)
      .select('id')
      .maybeSingle()

    if (updateError) {
      console.error('[hilig] Booking payment update failed:', updateError.message)

      return NextResponse.json(
        { error: 'Unable to update booking.' },
        { status: 500 },
      )
    }

    if (!updated) {
      // Another delivery may have processed the event concurrently.
      const { data: current, error: currentError } = await admin
        .from('bookings')
        .select('status, paid_at, paymongo_checkout_id')
        .eq('id', booking.id)
        .maybeSingle()

      if (currentError) {
        return NextResponse.json(
          { error: 'Unable to verify booking status.' },
          { status: 500 },
        )
      }

      if (
        current?.status === 'confirmed' &&
        current.paid_at &&
        current.paymongo_checkout_id === checkoutId
      ) {
        return NextResponse.json({
          received: true,
          alreadyProcessed: true,
        })
      }

      return NextResponse.json(
        { error: 'Booking could not be confirmed.' },
        { status: 409 },
      )
    }

    await admin.from('payment_attempts').update({
      status: 'paid',
      provider_payment_id: typeof paidPayment.id === 'string' ? paidPayment.id : null,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('checkout_id', checkoutId)

    await queueAndSendConfirmation(admin, booking.id, booking.user_id)
    await admin.from('payment_webhook_events').update({
      processing_status: 'processed',
      processed_at: new Date().toISOString(),
      last_error: null,
    }).eq('event_id', eventId)

    return NextResponse.json({ received: true, confirmed: true })
  } catch (error) {
    console.error('[hilig] PayMongo webhook failed:', error)

    return NextResponse.json(
      { error: 'Unexpected webhook processing error.' },
      { status: 500 },
    )
  }
}
