-- Hilig booking/payment hardening migration.
-- Review and run in Supabase SQL Editor after taking a schema backup.

-- A request key is supplied by the browser and scoped to the authenticated guest.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS payment_expires_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_user_idempotency_key_unique
  ON public.bookings (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('paymongo')),
  checkout_id text NOT NULL UNIQUE,
  checkout_url text NOT NULL,
  amount_php integer NOT NULL CHECK (amount_php >= 0),
  currency text NOT NULL DEFAULT 'PHP' CHECK (currency = 'PHP'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'cancelled')),
  provider_payment_id text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS payment_attempts_booking_id_created_at_idx
  ON public.payment_attempts (booking_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'paymongo' CHECK (provider = 'paymongo'),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  processing_status text NOT NULL DEFAULT 'processing'
    CHECK (processing_status IN ('processing', 'processed', 'ignored', 'failed')),
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  last_error text
);

CREATE TABLE IF NOT EXISTS public.booking_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  recipient_email text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  UNIQUE (booking_id, notification_type)
);

CREATE INDEX IF NOT EXISTS booking_notifications_pending_idx
  ON public.booking_notifications (created_at)
  WHERE status = 'pending';

-- These tables are accessed only by trusted server-side service-role code.
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_attempts FROM anon, authenticated;
REVOKE ALL ON public.payment_webhook_events FROM anon, authenticated;
REVOKE ALL ON public.booking_notifications FROM anon, authenticated;
GRANT ALL ON public.payment_attempts TO service_role;
GRANT ALL ON public.payment_webhook_events TO service_role;
GRANT ALL ON public.booking_notifications TO service_role;

CREATE OR REPLACE FUNCTION public.create_booking_idempotent(
  p_session_id uuid,
  p_quantity integer,
  p_idempotency_key text
)
RETURNS TABLE (
  booking_id uuid,
  session_id uuid,
  quantity integer,
  total_php integer,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid;
  v_price integer;
  v_total bigint;
  v_booking public.bookings%rowtype;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must sign in to book an experience.';
  END IF;

  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 16 OR length(p_idempotency_key) > 100 THEN
    RAISE EXCEPTION 'A valid idempotency key is required.';
  END IF;
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 20 THEN
    RAISE EXCEPTION 'Choose between 1 and 20 participants.';
  END IF;

  -- Serialize simultaneous retries of the same guest/key pair.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || p_idempotency_key, 0)
  );

  SELECT b.* INTO v_booking
  FROM public.bookings AS b
  WHERE b.user_id = v_user_id AND b.idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    IF v_booking.session_id <> p_session_id OR v_booking.quantity <> p_quantity THEN
      RAISE EXCEPTION 'Idempotency key was already used for a different booking.';
    END IF;
    RETURN QUERY SELECT v_booking.id, v_booking.session_id, v_booking.quantity,
      v_booking.total_php, v_booking.status;
    RETURN;
  END IF;

  SELECT e.price_php INTO v_price
  FROM public.sessions AS s
  JOIN public.experiences AS e ON e.id = s.experience_id
  WHERE s.id = p_session_id AND e.is_published = true AND s.starts_at > pg_catalog.now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This session is unavailable or has passed.';
  END IF;

  v_total := v_price::bigint * p_quantity::bigint;
  IF v_total > 2147483647 THEN
    RAISE EXCEPTION 'Booking total is too large.';
  END IF;

  UPDATE public.sessions AS s
  SET booked = s.booked + p_quantity
  WHERE s.id = p_session_id
    AND s.starts_at > pg_catalog.now()
    AND s.booked + p_quantity <= s.capacity
    AND EXISTS (
      SELECT 1 FROM public.experiences AS e
      WHERE e.id = s.experience_id AND e.is_published = true
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not enough seats remain, or this session has passed.';
  END IF;

  INSERT INTO public.bookings (
    user_id, session_id, quantity, total_php, status, idempotency_key
  ) VALUES (
    v_user_id, p_session_id, p_quantity, v_total::integer, 'pending', p_idempotency_key
  ) RETURNING * INTO v_booking;

  RETURN QUERY SELECT v_booking.id, v_booking.session_id, v_booking.quantity,
    v_booking.total_php, v_booking.status;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_booking_idempotent(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking_idempotent(uuid, integer, text) TO authenticated, service_role;

-- Do not expire a pending booking by changing its status alone. PayMongo checkout
-- sessions must first be expired through the provider API, then the seat release
-- must be done transactionally. Schedule that workflow only after provider expiry is implemented.

CREATE OR REPLACE FUNCTION public.expire_pending_booking_after_checkout(
  p_booking_id uuid,
  p_checkout_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_booking public.bookings%rowtype;
  v_session_id uuid;
  v_quantity integer;
  v_updated integer;
BEGIN
  SELECT b.* INTO v_booking
  FROM public.bookings AS b
  WHERE b.id = p_booking_id AND b.paymongo_checkout_id = p_checkout_id
  FOR UPDATE;

  IF NOT FOUND OR v_booking.status <> 'pending' THEN
    RETURN false;
  END IF;

  v_session_id := v_booking.session_id;
  v_quantity := v_booking.quantity;

  UPDATE public.sessions AS s
  SET booked = s.booked - v_quantity
  WHERE s.id = v_session_id AND s.booked >= v_quantity;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'Unable to safely release expired booking seats.';
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled', payment_expires_at = pg_catalog.now()
  WHERE id = p_booking_id AND status = 'pending' AND paymongo_checkout_id = p_checkout_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'Booking changed while expiring checkout.';
  END IF;

  UPDATE public.payment_attempts
  SET status = 'expired', updated_at = pg_catalog.now()
  WHERE checkout_id = p_checkout_id AND booking_id = p_booking_id AND status = 'pending';

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.expire_pending_booking_after_checkout(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_pending_booking_after_checkout(uuid, text) TO service_role;
