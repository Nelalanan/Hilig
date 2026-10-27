import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { MessageComposer, Thread } from '@/components/messages/MessageClient'
import MessagesShell from '@/components/messages/MessagesShell'
import { MsgIcon } from '@/components/messages/MsgIcon'
import { initialsOf, toneOf } from '@/components/messages/helpers'
import { getInbox } from '@/lib/messages-view'
import { createClient } from '@/lib/supabase/server'
import { sendMessage } from '../actions'

export const dynamic = 'force-dynamic'

export default async function ConversationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params
  const query = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(`/messages/${id}`)}`)
  const { data: membership } = await supabase.from('conversation_members').select('conversation_id,last_read_at').eq('conversation_id', id).eq('user_id', user.id).maybeSingle()
  if (!membership) notFound()
  const [{ data: conversation }, { data: messages }] = await Promise.all([
    supabase.from('conversations').select('id,subject,updated_at').eq('id', id).maybeSingle(),
    supabase.from('messages').select('id,sender_id,body,created_at').eq('conversation_id', id).order('created_at', { ascending: true }).limit(200),
  ])
  if (!conversation) notFound()
  // Reading a conversation advances this user's read cursor. Service role is only used after membership is verified.
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const readAt = new Date().toISOString()
  await admin.from('conversation_members').update({ last_read_at: readAt }).eq('conversation_id', id).eq('user_id', user.id)
  await admin.from('in_app_notifications').update({ read_at: readAt }).eq('user_id', user.id).eq('href', `/messages/${id}`).is('read_at', null)

  // Display only: the list on the left and the name in the header.
  const inbox = await getInbox(supabase, user.id)
  const current = inbox.find((item) => item.id === id)
  const otherName = current?.otherName ?? 'Hilig member'

  const thread = (messages ?? []).map((message) => ({
    id: message.id as string,
    mine: message.sender_id === user.id,
    body: message.body as string,
    createdAt: message.created_at as string,
  }))

  return (
    <MessagesShell inbox={inbox} activeId={id} mode="thread">
      <header className="msg-head">
        <Link className="msg-back" href="/messages" aria-label="Back to all messages">
          <MsgIcon name="back" />
        </Link>

        <span className={`msg-avatar tone-${toneOf(otherName)}`} aria-hidden="true">
          {initialsOf(otherName)}
        </span>

        <div className="msg-head-text">
          <h1 className="msg-title">{otherName}</h1>
          <p className="msg-subtitle">{conversation.subject}</p>
        </div>

        {current?.hostId && (
          <Link className="msg-head-link" href={`/hosts/${current.hostId}`}>
            View profile
          </Link>
        )}
      </header>

      <Thread messages={thread} otherName={otherName} />

      <MessageComposer
        action={sendMessage}
        conversationId={id}
        hasError={Boolean(query.error)}
      />
    </MessagesShell>
  )
}
