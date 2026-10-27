import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.HILIG_EMAIL_FROM
  if (!apiKey || !from) return NextResponse.json({ error: 'Email delivery is not configured.' }, { status: 503 })

  const admin = createAdminClient()
  const { data: notifications, error } = await admin.from('booking_notifications')
    .select('id, booking_id, recipient_email, attempts')
    .in('status', ['pending', 'failed'])
    .lt('attempts', 5)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) {
    console.error('[hilig] Could not load email outbox:', error.message)
    return NextResponse.json({ error: 'Unable to load pending notifications.' }, { status: 500 })
  }

  let sent = 0
  let failed = 0
  for (const notification of notifications ?? []) {
    const { data: claimed } = await admin.from('booking_notifications')
      .update({ status: 'pending', attempts: notification.attempts + 1, last_error: null })
      .eq('id', notification.id)
      .in('status', ['pending', 'failed'])
      .select('id')
      .maybeSingle()

    // This lightweight claim prevents most overlapping cron sends; Resend also
    // receives a stable idempotency key for the notification record.
    if (!claimed) continue

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `hilig-booking-notification-${notification.id}`,
      },
      body: JSON.stringify({
        from,
        to: [notification.recipient_email],
        subject: 'Your Hilig booking is confirmed',
        text: `Your Hilig booking ${notification.booking_id} is confirmed. You can view the details in your Hilig account.`,
      }),
      cache: 'no-store',
    })

    if (response.ok) {
      await admin.from('booking_notifications').update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null }).eq('id', notification.id)
      sent++
    } else {
      const message = (await response.text()).slice(0, 1000)
      await admin.from('booking_notifications').update({ status: 'failed', last_error: message }).eq('id', notification.id)
      failed++
    }
  }

  return NextResponse.json({ processed: notifications?.length ?? 0, sent, failed })
}
