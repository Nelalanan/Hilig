BEGIN;

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT 'Conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conversations_subject_length CHECK (char_length(trim(subject)) BETWEEN 1 AND 160)
);

CREATE TABLE IF NOT EXISTS public.conversation_members (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT messages_body_length CHECK (char_length(trim(body)) BETWEEN 1 AND 5000)
);

CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  href TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT in_app_notifications_type_length CHECK (char_length(notification_type) BETWEEN 1 AND 80),
  CONSTRAINT in_app_notifications_title_length CHECK (char_length(title) BETWEEN 1 AND 160),
  CONSTRAINT in_app_notifications_body_length CHECK (char_length(body) <= 1000),
  CONSTRAINT in_app_notifications_href_local CHECK (href IS NULL OR (left(href, 1) = '/' AND left(href, 2) <> '//'))
);

CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON public.conversation_members(user_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.in_app_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.in_app_notifications(user_id, created_at DESC) WHERE read_at IS NULL;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.conversations, public.conversation_members, public.messages, public.in_app_notifications FROM PUBLIC, anon;
GRANT SELECT ON public.conversations, public.conversation_members, public.messages, public.in_app_notifications TO authenticated;
GRANT ALL ON public.conversations, public.conversation_members, public.messages, public.in_app_notifications TO service_role;
-- Mutations are performed by authenticated server actions after verifying membership.
-- Do not grant authenticated direct INSERT/UPDATE/DELETE access; the service-role key stays server-only.
GRANT SELECT ON public.hosts TO authenticated;

DROP POLICY IF EXISTS "Members can read conversations" ON public.conversations;
CREATE POLICY "Members can read conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id = id AND cm.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can read their own memberships" ON public.conversation_members;
CREATE POLICY "Users can read their own memberships" ON public.conversation_members
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Members can read messages" ON public.messages;
CREATE POLICY "Members can read messages" ON public.messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can read their notifications" ON public.in_app_notifications;
CREATE POLICY "Users can read their notifications" ON public.in_app_notifications
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

COMMIT;
