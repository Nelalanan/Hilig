import Link from 'next/link'
import { redirect } from 'next/navigation'
import MessagesShell from '@/components/messages/MessagesShell'
import { MsgIcon } from '@/components/messages/MsgIcon'
import { initialsOf, toneOf } from '@/components/messages/helpers'
import { getInbox } from '@/lib/messages-view'
import { createClient } from '@/lib/supabase/server'
import { startConversation } from '../actions'

export const dynamic = 'force-dynamic'

export default async function NewMessagePage({ searchParams }: { searchParams: Promise<{ error?: string; to?: string; subject?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=%2Fmessages%2Fnew')
  const { data: hosts, error } = await supabase.from('hosts').select('id,name,owner_id').not('owner_id', 'is', null).order('name')
  const uniqueHosts = (hosts ?? []).filter((host, index, all) => host.owner_id && host.owner_id !== user.id && all.findIndex((candidate) => candidate.owner_id === host.owner_id) === index)

  // Display only: the list on the left, and the recipient's name if we know it.
  const inbox = await getInbox(supabase, user.id)
  const recipient = params.to
    ? uniqueHosts.find((host) => host.owner_id === params.to)
    : undefined

  return (
    <MessagesShell inbox={inbox} mode="new">
      <header className="msg-head">
        <Link className="msg-back" href="/messages" aria-label="Back to all messages">
          <MsgIcon name="back" />
        </Link>

        <div className="msg-head-text">
          <h1 className="msg-title">Start a conversation</h1>
          <p className="msg-subtitle">Contact a Hilig host about an experience or collaboration.</p>
        </div>
      </header>

      <div className="msg-new-body">
        {params.error && <p className="msg-alert" role="alert">We couldn't start that conversation. Please choose a valid recipient and try again.</p>}

        {error && !params.to ? <p className="msg-alert">Hosts couldn't be loaded. Please try again later.</p> : uniqueHosts.length === 0 && !params.to ? <div className="msg-empty"><span className="msg-empty-icon"><MsgIcon name="chat" size={34} /></span><h2>No hosts available to message yet</h2><p>Once hosts have linked accounts, you can start conversations here.</p></div> : <form action={startConversation} className="msg-form">
          {params.to ? <>
            <input type="hidden" name="recipient_id" value={params.to} />
            <div className="msg-recipient">
              <span className={`msg-avatar tone-${toneOf(recipient?.name ?? 'Hilig')}`} aria-hidden="true">{initialsOf(recipient?.name ?? 'Hilig')}</span>
              <div>
                <b>{recipient?.name ?? 'Hilig organizer'}</b>
                <small>Starting a conversation with the selected Hilig organizer.</small>
              </div>
            </div>
          </> : <div className="msg-field">
            <label htmlFor="recipient_id">Host</label>
            <select id="recipient_id" name="recipient_id" required defaultValue=""><option value="" disabled>Select a host</option>{uniqueHosts.map((host) => <option key={host.id} value={host.owner_id!}>{host.name}</option>)}</select>
          </div>}

          <div className="msg-field">
            <label htmlFor="subject">Subject</label>
            <input id="subject" name="subject" required minLength={1} maxLength={160} defaultValue={params.subject ? params.subject.slice(0, 160) : "Question about an experience"} />
          </div>

          <button className="button button-gold" type="submit">Start conversation</button>
        </form>}
      </div>
    </MessagesShell>
  )
}
