-- Phase 5A: allow the server-only service-role client to review submissions.
-- Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
GRANT SELECT, UPDATE ON TABLE public.contact_inquiries TO service_role;
GRANT SELECT, UPDATE ON TABLE public.partnership_applications TO service_role;
