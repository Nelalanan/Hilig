import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const secretKey = process.env.PAYMONGO_SECRET_KEY
  if (!secretKey) return NextResponse.json({ error: 'PayMongo is not configured.' }, { status: 503 })

  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString()
  const { data: attempts, error } = await admin.from('payment_attempts')
    .select('booking_id, checkout_id, created_at')
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) {
    console.error('[hilig] Could not list stale checkout attempts:', error.message)
    return NextResponse.json({ error: 'Unable to load stale checkout attempts.' }, { status: 500 })
  }

  let expired = 0
  let stillActive = 0
  let failed = 0

  for (const attempt of attempts ?? []) {
    try {
      const auth = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`
      const expireResponse = await fetch(`https://api.paymongo.com/v2/checkout_sessions/${encodeURIComponent(attempt.checkout_id)}/expire`, {
        method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, cache: 'no-store',
      })
      let confirmedExpired = expireResponse.ok

      if (!expireResponse.ok) {
        // PayMongo refuses expiry for paid or still-processing checkouts. Retrieve
        // the session and leave it pending unless the provider confirms expiry.
        const retrieve = await fetch(`https://api.paymongo.com/v2/checkout_sessions/${encodeURIComponent(attempt.checkout_id)}`, {
          headers: { Authorization: auth }, cache: 'no-store',
        })
        const resource = await retrieve.json().catch(() => null)
        const attributes = resource?.data?.attributes
        if (retrieve.ok && attributes?.status === 'expired') confirmedExpired = true
        else {
          stillActive++
          continue
        }
      }

      if (confirmedExpired) {
        const { data: didExpire, error: rpcError } = await admin.rpc('expire_pending_booking_after_checkout', {
          p_booking_id: attempt.booking_id,
          p_checkout_id: attempt.checkout_id,
        })
        if (rpcError) {
          console.error('[hilig] Failed to release expired booking:', rpcError.message)
          failed++
          continue
        }
        if (didExpire) expired++
        await admin.from('payment_attempts').update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('checkout_id', attempt.checkout_id).eq('status', 'pending')
      }
    } catch (error) {
      console.error('[hilig] Checkout expiry attempt failed:', error)
      failed++
    }
  }

  return NextResponse.json({ processed: attempts?.length ?? 0, expired, stillActive, failed })
}
