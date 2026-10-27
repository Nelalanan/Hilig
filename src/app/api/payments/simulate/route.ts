import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production' || process.env.HILIG_PAYMENT_MODE !== 'simulation') {
    return NextResponse.json({ error: 'Payment simulation is available only in local development when explicitly enabled.' }, { status: 404 })
  }

  const url = new URL(request.url)
  const bookingId = url.searchParams.get('bookingId')
  if (!bookingId) return NextResponse.json({ error: 'Booking ID is required.' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login?next=/account/bookings', url.origin))

  const { data: booking, error } = await supabase.from('bookings')
    .select('id, status, total_php')
    .eq('id', bookingId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  if (booking.status !== 'pending') return NextResponse.redirect(new URL(`/bookings/${booking.id}`, url.origin))

  const admin = createAdminClient()
  const { data: updated, error: updateError } = await admin.from('bookings')
    .update({ status: 'confirmed', paid_at: new Date().toISOString() })
    .eq('id', booking.id)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .is('paid_at', null)
    .select('id')
    .maybeSingle()

  if (updateError) {
    console.error('[hilig] Simulation confirmation failed:', updateError.message)
    return NextResponse.json({ error: 'Could not simulate payment.' }, { status: 500 })
  }

  // This is intentionally a local-only test shortcut, not a representation of a real payment.
  await admin.from('booking_notifications').insert({
    booking_id: booking.id,
    notification_type: 'booking_confirmed',
    recipient_email: user.email ?? '',
    status: 'pending',
    payload: { source: 'development_simulation', clearly_not_real_payment: true },
  })

  return NextResponse.redirect(new URL(`/bookings/${booking.id}?payment=simulation`, url.origin))
}
