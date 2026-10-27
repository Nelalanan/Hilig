import Link from 'next/link'
import { redirect } from 'next/navigation'
import MessagesShell from '@/components/messages/MessagesShell'
import { MsgIcon } from '@/components/messages/MsgIcon'
import { getInbox } from '@/lib/messages-view'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const query = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=%2Fmessages')

  const inbox = await getInbox(supabase, user.id)
  const hasConversations = inbox.length > 0

  return (
    <MessagesShell inbox={inbox} mode="list">
      <div className="msg-empty">
        {query.error === 'forbidden' && (
          <p className="msg-alert" role="alert">
            You don&apos;t have access to that conversation.
          </p>
        )}

        <span className="msg-empty-icon">
          <MsgIcon name="chat" size={34} />
        </span>

        <h2>
          {hasConversations ? 'Pick up where you left off' : 'No conversations yet'}
        </h2>

        <p>
          {hasConversations
            ? 'Choose a conversation from the list, or start a new one with a Hilig host.'
            : 'Start by messaging a Hilig host.'}
        </p>

        <Link className="button button-gold" href="/messages/new">
          {hasConversations ? 'Start a conversation' : 'Find a host'}
        </Link>
      </div>
    </MessagesShell>
  )
}
