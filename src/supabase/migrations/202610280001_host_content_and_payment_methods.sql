-- Hilig: host-managed content, moderation workflow, and booking payment choices.
-- Review the existing schema and apply this migration to a staging database first.

ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS admin_feedback text,
  ADD COLUMN IF NOT EXISTS online_payment_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cash_payment_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cash_payment_instructions text;

ALTER TABLE public.experiences
  DROP CONSTRAINT IF EXISTS experiences_approval_status_check;
ALTER TABLE public.experiences
  ADD CONSTRAINT experiences_approval_status_check
  CHECK (approval_status IN ('draft','pending_review','changes_requested','rejected','approved'));
ALTER TABLE public.experiences
  DROP CONSTRAINT IF EXISTS experiences_payment_methods_check;
ALTER TABLE public.experiences
  ADD CONSTRAINT experiences_payment_methods_check
  CHECK (price_php = 0 OR online_payment_enabled OR cash_payment_enabled);

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS admin_feedback text,
  ADD COLUMN IF NOT EXISTS cash_payment_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS online_payment_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cash_payment_instructions text;
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_approval_status_check;
ALTER TABLE public.events ADD CONSTRAINT events_approval_status_check
  CHECK (approval_status IN ('draft','pending_review','changes_requested','rejected','approved'));

ALTER TABLE public.community_groups
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS admin_feedback text;
ALTER TABLE public.community_groups DROP CONSTRAINT IF EXISTS community_groups_approval_status_check;
ALTER TABLE public.community_groups ADD CONSTRAINT community_groups_approval_status_check
  CHECK (approval_status IN ('draft','pending_review','changes_requested','rejected','approved'));

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS cash_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS cash_marked_paid_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_method_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_method_check
  CHECK (payment_method IN ('online','cash','free'));
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('unpaid','pending','paid','failed','refunded','not_required'));

-- Replace the booking RPC so seat reservation and payment-method validation are atomic.
CREATE OR REPLACE FUNCTION public.create_booking_idempotent(
  p_session_id uuid,
  p_quantity integer,
  p_idempotency_key text,
  p_payment_method text DEFAULT 'online'
)
RETURNS TABLE (booking_id uuid, session_id uuid, quantity integer, total_php integer, status text, payment_method text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE
  v_user_id uuid;
  v_price integer;
  v_total bigint;
  v_online boolean;
  v_cash boolean;
  v_booking public.bookings%rowtype;
  v_method text;
  v_status text;
  v_payment_status text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'You must sign in to book an experience.'; END IF;
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 16 OR length(p_idempotency_key) > 100 THEN RAISE EXCEPTION 'A valid idempotency key is required.'; END IF;
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 20 THEN RAISE EXCEPTION 'Choose between 1 and 20 participants.'; END IF;
  IF p_payment_method NOT IN ('online','cash') THEN RAISE EXCEPTION 'Choose a valid payment method.'; END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text || ':' || p_idempotency_key, 0));
  SELECT b.* INTO v_booking FROM public.bookings b WHERE b.user_id = v_user_id AND b.idempotency_key = p_idempotency_key FOR UPDATE;
  IF FOUND THEN
    IF v_booking.session_id <> p_session_id OR v_booking.quantity <> p_quantity OR (v_booking.payment_method <> p_payment_method AND v_booking.payment_method <> 'free') THEN
      RAISE EXCEPTION 'Idempotency key was already used for a different booking.';
    END IF;
    RETURN QUERY SELECT v_booking.id, v_booking.session_id, v_booking.quantity, v_booking.total_php, v_booking.status, v_booking.payment_method;
    RETURN;
  END IF;

  SELECT e.price_php, e.online_payment_enabled, e.cash_payment_enabled
    INTO v_price, v_online, v_cash
  FROM public.sessions s JOIN public.experiences e ON e.id = s.experience_id
  WHERE s.id = p_session_id AND e.is_published = true AND e.approval_status = 'approved' AND s.starts_at > pg_catalog.now();
  IF NOT FOUND THEN RAISE EXCEPTION 'This session is unavailable or has passed.'; END IF;

  IF v_price > 0 AND p_payment_method = 'online' AND NOT v_online THEN RAISE EXCEPTION 'Online payment is not accepted for this experience.'; END IF;
  IF v_price > 0 AND p_payment_method = 'cash' AND NOT v_cash THEN RAISE EXCEPTION 'Cash payment is not accepted for this experience.'; END IF;
  v_method := CASE WHEN v_price = 0 THEN 'free' ELSE p_payment_method END;
  v_total := v_price::bigint * p_quantity::bigint;
  IF v_total > 2147483647 THEN RAISE EXCEPTION 'Booking total is too large.'; END IF;

  UPDATE public.sessions s SET booked = s.booked + p_quantity
  WHERE s.id = p_session_id AND s.starts_at > pg_catalog.now() AND s.booked + p_quantity <= s.capacity
    AND EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = s.experience_id AND e.is_published = true AND e.approval_status = 'approved');
  IF NOT FOUND THEN RAISE EXCEPTION 'Not enough seats remain, or this session has passed.'; END IF;

  v_status := CASE WHEN v_price = 0 OR v_method = 'cash' THEN 'confirmed' ELSE 'pending' END;
  v_payment_status := CASE WHEN v_price = 0 THEN 'not_required' WHEN v_method = 'cash' THEN 'unpaid' ELSE 'pending' END;
  INSERT INTO public.bookings (user_id, session_id, quantity, total_php, status, idempotency_key, payment_method, payment_status)
  VALUES (v_user_id, p_session_id, p_quantity, v_total::integer, v_status, p_idempotency_key, v_method, v_payment_status)
  RETURNING * INTO v_booking;
  RETURN QUERY SELECT v_booking.id, v_booking.session_id, v_booking.quantity, v_booking.total_php, v_booking.status, v_booking.payment_method;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_booking_idempotent(uuid, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking_idempotent(uuid, integer, text, text) TO authenticated, service_role;

-- Existing public listings remain approved by default for backwards compatibility.
-- New host submissions must explicitly set approval_status='pending_review' and is_published=false.
CREATE INDEX IF NOT EXISTS experiences_approval_status_idx ON public.experiences(approval_status, created_at DESC);
CREATE INDEX IF NOT EXISTS events_approval_status_idx ON public.events(approval_status, starts_at);
CREATE INDEX IF NOT EXISTS community_groups_approval_status_idx ON public.community_groups(approval_status, created_at DESC);
