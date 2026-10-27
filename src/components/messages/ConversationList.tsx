'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import Icon from '@/components/Icon'
import type { InboxItem } from '@/lib/messages-view'
import { formatListTime, initialsOf, toneOf } from './helpers'

export default function ConversationList({
  items,
  activeId,
}: {
  items: InboxItem[]
  activeId?: string
}) {
  const [query, setQuery] = useState('')
  // Times are formatted in the visitor's own timezone, after the page loads,
  // so the server and browser never disagree about what to print.
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
  }, [])

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return items
    return items.filter((item) =>
      [item.otherName, item.subject, item.preview ?? '']
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [items, query])

  if (items.length === 0) {
    return (
      <div className="msg-side-empty">
        <p>No conversations yet.</p>
        <Link className="button button-gold small" href="/messages/new">
          Find a host
        </Link>
      </div>
    )
  }

  return (
    <>
      {items.length >= 5 && (
        <label className="msg-search">
          <Icon name="search" size={17} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
          />
        </label>
      )}

      <ul className="msg-list">
        {visible.map((item) => {
          const active = item.id === activeId
          const unread = item.unread && !active

          return (
            <li key={item.id}>
              <Link
                href={`/messages/${item.id}`}
                className={unread ? 'msg-item is-unread' : 'msg-item'}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className={`msg-avatar tone-${toneOf(item.otherName)}`}
                  aria-hidden="true"
                >
                  {initialsOf(item.otherName)}
                </span>

                <span className="msg-item-body">
                  <span className="msg-item-top">
                    <span className="msg-item-name">{item.otherName}</span>
                    <span className="msg-item-meta">
                      {unread && (
                        <span className="msg-dot" role="img" aria-label="Unread" />
                      )}
                      <time dateTime={item.updatedAt}>
                        {now ? formatListTime(new Date(item.updatedAt), now) : ''}
                      </time>
                    </span>
                  </span>

                  <span className="msg-item-subject">{item.subject}</span>

                  <span className="msg-item-preview">
                    {item.preview
                      ? `${item.previewMine ? 'You: ' : ''}${item.preview}`
                      : 'No messages yet'}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      {visible.length === 0 && (
        <p className="msg-side-empty">No conversations match “{query}”.</p>
      )}
    </>
  )
}
