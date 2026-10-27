# Hilig booking and payment implementation

This patch assumes the archive's `app/`, `components/`, and `lib/` folders are the contents of your Next.js `src/` directory. Copy them into the matching locations in your repository. If your project uses a root-level `app/` instead of `src/app/`, use the matching paths there.

## Apply the database migration first

Run `supabase/migrations/202610270001_booking_payment_hardening.sql` in the Supabase SQL Editor. Review it before applying it to production. It adds:

- `bookings.idempotency_key` and a unique index scoped to the guest.
- `payment_attempts` to associate each PayMongo Checkout Session with a booking.
- `payment_webhook_events` for webhook event deduplication and retry tracking.
- `booking_notifications` as an email outbox.
- `create_booking_idempotent(...)` to prevent repeated HTTP requests from reserving seats twice.
- `expire_pending_booking_after_checkout(...)` to release seats only after the provider confirms checkout expiry.

The existing `create_booking` and `cancel_booking` functions are not dropped. The new booking endpoint uses the new idempotent function.

## Environment variables

Keep all secret values server-only; never use a `NEXT_PUBLIC_` prefix for these secrets.

```dotenv
NEXT_PUBLIC_SITE_URL=https://your-public-site.example
SUPABASE_SERVICE_ROLE_KEY=your-server-only-supabase-service-role-key
PAYMONGO_SECRET_KEY=sk_test_...
PAYMONGO_WEBHOOK_SECRET=your-paymongo-webhook-secret
CRON_SECRET=use-a-long-random-secret
RESEND_API_KEY=re_...                 # optional until email is configured
HILIG_EMAIL_FROM=Hilig <bookings@your-verified-domain.example>  # optional
```

For local development only, payment simulation can be enabled with:

```dotenv
HILIG_PAYMENT_MODE=simulation
```

The simulator refuses to run when `NODE_ENV=production`. Do not enable it in production. It changes a pending booking to confirmed only to exercise the local UI; it does not process money.

## PayMongo setup

1. Configure a test-mode PayMongo secret key and webhook secret.
2. Register `https://your-public-site.example/api/webhooks/paymongo` as a webhook endpoint.
3. Subscribe to `checkout_session.payment.paid`.
4. Complete test-mode checkout and confirm that the webhook is delivered and signature verification passes.
5. Only after testing, switch to live credentials and production URLs.

The webhook checks the gross `payments[].attributes.amount` against the booking total in centavos. It does not compare `net_amount`, because net amount is after fees.

## Scheduled jobs

PayMongo Checkout Sessions remain active until explicitly expired. Configure a scheduler (for example, your hosting provider's cron) to POST these routes with `Authorization: Bearer $CRON_SECRET`:

- `/api/cron/expire-checkouts` — every 5 minutes. Attempts to expire pending checkouts older than 20 minutes; it leaves paid or processing checkouts alone. A confirmed provider expiry releases seats transactionally.
- `/api/cron/notifications` — every 5 minutes. Retries pending/failed booking confirmation emails when Resend is configured.

Do not run these routes without a strong `CRON_SECRET`. The cron route returns aggregate counts, not personal data.

## Lifecycle behavior and remaining production checks

- A request idempotency key is reused by the client after network errors, so retries return the same booking rather than reserving more seats.
- Capacity is still enforced in PostgreSQL, including concurrent requests.
- Checkout return/cancel URLs are not treated as payment proof; the signed webhook is authoritative.
- Cancellation tries to expire an existing provider checkout before releasing seats. If PayMongo says the payment is paid or still processing, cancellation is blocked for manual/status refresh rather than risking a paid-but-cancelled booking.
- Booking confirmation email delivery is optional and requires Resend configuration. Without it, notification records remain in the outbox.
- This patch does not implement refunds or automatic payment-failure events because the current PayMongo webhook handler is subscribed to the paid Checkout Session event. Add the appropriate provider events and refund workflow before supporting refunds in production.

## Test checklist

1. Create a booking with 1 participant; verify `pending`, correct `total_php`, and `sessions.booked` increments once.
2. Retry the exact same request with the same idempotency key; verify the same booking ID and no additional seat reservation.
3. Reuse the key with a different session/quantity; expect HTTP 409.
4. Try a sold-out session and quantity greater than remaining capacity; expect HTTP 409 and no counter change.
5. Submit concurrent requests against the last available seats; verify `booked <= capacity` and no extra successful bookings.
6. Cancel a pending booking with no checkout; verify status `cancelled` and seat count decrements once.
7. With PayMongo test mode, complete checkout; verify only a valid webhook changes the booking to `confirmed` and sets `paid_at`.
8. Replay the same webhook; verify it is acknowledged without duplicate confirmation or duplicate outbox notification.
9. Verify a mismatched checkout ID, currency, amount, or signature is rejected.
10. Verify a host can see only their own sessions/bookings and sees capacity, reserved attendees, booking status, and payment status.
11. Test checkout expiry through PayMongo test mode and confirm seats are released only after the provider confirms expiry.
12. Verify email delivery and cron retries after configuring Resend.

## Important validation note

The files are prepared as a coordinated patch, but the migration and live payment flow have not been executed against your Supabase or PayMongo accounts from this environment. Run your project's `npm run typecheck` and `npm run build`, apply the migration to a non-production Supabase project first, and complete the test checklist before deploying.
