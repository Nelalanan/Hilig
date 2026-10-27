'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { MsgIcon } from './MsgIcon'
import { dayLabel, formatClock } from './helpers'

/* -------------------------------------------------------------------------- */
/* Thread: bubbles, day dividers, scroll-to-latest                             */
/* -------------------------------------------------------------------------- */

export type ThreadMessage = {
  id: string
  mine: boolean
  body: string
  createdAt: string
}

type Row =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'msg'; msg: ThreadMessage; start: boolean; end: boolean }

const GROUP_GAP_MS = 10 * 60 * 1000

export function Thread({
  messages,
  otherName,
}: {
  messages: ThreadMessage[]
  otherName: string
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const firstScroll = useRef(true)
  // Day dividers and times depend on the visitor's timezone, so they appear
  // right after the page loads rather than being guessed on the server.
  const [ready, setReady] = useState(false)
  const lastId = messages.length ? messages[messages.length - 1].id : null

  useEffect(() => {
    setReady(true)
  }, [])

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    box.scrollTo({
      top: box.scrollHeight,
      behavior: firstScroll.current ? 'auto' : 'smooth',
    })
    if (ready) firstScroll.current = false
  }, [lastId, ready])

  const rows = useMemo(() => {
    const now = ready ? new Date() : null
    const out: Row[] = []
    let previousDay = ''

    const sameGroup = (a?: ThreadMessage, b?: ThreadMessage) => {
      if (!a || !b || a.mine !== b.mine) return false
      const ta = new Date(a.createdAt)
      const tb = new Date(b.createdAt)
      if (Math.abs(tb.getTime() - ta.getTime()) > GROUP_GAP_MS) return false
      return !now || ta.toDateString() === tb.toDateString()
    }

    messages.forEach((msg, index) => {
      const created = new Date(msg.createdAt)

      if (now) {
        const day = created.toDateString()
        if (day !== previousDay) {
          out.push({ kind: 'day', key: `day-${msg.id}`, label: dayLabel(created, now) })
          previousDay = day
        }
      }

      out.push({
        kind: 'msg',
        msg,
        start: !sameGroup(messages[index - 1], msg),
        end: !sameGroup(msg, messages[index + 1]),
      })
    })

    return out
  }, [messages, ready])

  return (
    <div className="msg-scroll" ref={boxRef}>
      <div className="msg-stream">
        <p className="msg-privacy">
          Private conversation. Only you and {otherName} can see these messages.
        </p>

        {messages.length === 0 && (
          <p className="msg-quiet">
            No messages yet. Say hello below and get the conversation started.
          </p>
        )}

        {rows.map((row) => {
          if (row.kind === 'day') {
            return (
              <span className="msg-day" key={row.key}>
                {row.label}
              </span>
            )
          }

          const { msg, start, end } = row
          const className = [
            'msg-row',
            msg.mine ? 'is-mine' : 'is-theirs',
            start ? 'is-start' : '',
            end ? 'is-end' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div className={className} key={msg.id}>
              <div className="msg-bubble">{msg.body}</div>
              {end && ready && (
                <time className="msg-time" dateTime={msg.createdAt}>
                  {formatClock(new Date(msg.createdAt))}
                </time>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Composer: auto-growing box, Enter to send on desktop                        */
/* -------------------------------------------------------------------------- */

function SendButton() {
  const { pending } = useFormStatus()

  return (
    <button
      className="msg-send"
      type="submit"
      disabled={pending}
      aria-label={pending ? 'Sending' : 'Send message'}
      title="Send"
    >
      <MsgIcon name="send" size={20} />
    </button>
  )
}

export function MessageComposer({
  action,
  conversationId,
  hasError = false,
}: {
  action: (formData: FormData) => void | Promise<void>
  conversationId: string
  hasError?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) ref.current?.focus()
  }, [])

  const grow = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }

  return (
    <form
      className="msg-composer"
      action={action}
      onReset={() => {
        // React clears the form after a send; shrink the box back to one line.
        if (ref.current) ref.current.style.height = 'auto'
      }}
      onSubmit={(event) => {
        // Don't send blank messages.
        if (!ref.current?.value.trim()) event.preventDefault()
      }}
    >
      <input type="hidden" name="conversation_id" value={conversationId} />

      {hasError && (
        <p className="msg-alert" role="alert">
          Your message could not be sent. Check the message and try again.
        </p>
      )}

      <div className="msg-composer-row">
        <label className="msg-composer-box">
          <span className="msg-sr">Your message</span>
          <textarea
            ref={ref}
            id="body"
            name="body"
            required
            minLength={1}
            maxLength={5000}
            rows={1}
            placeholder="Write a message…"
            onInput={grow}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing &&
                window.matchMedia('(pointer: fine)').matches
              ) {
                event.preventDefault()
                if (event.currentTarget.value.trim()) {
                  event.currentTarget.form?.requestSubmit()
                }
              }
            }}
          />
        </label>

        <SendButton />
      </div>

      <p className="msg-hint">Enter to send · Shift + Enter for a new line</p>
    </form>
  )
}
