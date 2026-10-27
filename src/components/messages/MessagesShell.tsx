import Link from 'next/link'
import type { ReactNode } from 'react'
import type { InboxItem } from '@/lib/messages-view'
import ConversationList from './ConversationList'
import { MsgIcon } from './MsgIcon'
import './messages.css'

/**
 * Two-column messages layout: conversation list on the left, the open
 * conversation (or the "new conversation" form) on the right.
 *
 * On phones only one column shows at a time: the list on /messages, and the
 * right-hand pane on /messages/[id] and /messages/new.
 */
export default function MessagesShell({
  inbox,
  activeId,
  mode,
  children,
}: {
  inbox: InboxItem[]
  activeId?: string
  mode: 'list' | 'thread' | 'new'
  children: ReactNode
}) {
  return (
    <div className="msg-page">
      <div className="msg-app" data-mode={mode}>
        <aside className="msg-sidebar" aria-label="Conversations">
          <div className="msg-side-head">
            {mode === 'list' ? (
              <h1 className="msg-side-title">Messages</h1>
            ) : (
              <p className="msg-side-title">Messages</p>
            )}

            <Link
              className="msg-new"
              href="/messages/new"
              aria-label="Start a conversation"
              title="Start a conversation"
              aria-current={mode === 'new' ? 'page' : undefined}
            >
              <MsgIcon name="plus" />
            </Link>
          </div>

          <ConversationList items={inbox} activeId={activeId} />
        </aside>

        <section className="msg-main">{children}</section>
      </div>
    </div>
  )
}
