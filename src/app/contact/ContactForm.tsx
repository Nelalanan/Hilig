'use client'

import { useActionState } from 'react'
import { submitContact, type SubmissionState } from './actions'

const initialState: SubmissionState = { status: 'idle', message: '' }

export default function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, initialState)
  return (
    <form action={action} className="phase-form">
      <div className="phase-form-honeypot" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="phase-form-grid">
        <label>Full name<input name="name" required minLength={2} maxLength={120} autoComplete="name" /></label>
        <label>Email address<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
      </div>
      <label>What is this about?
        <select name="category" defaultValue="general" required>
          <option value="general">General inquiry</option><option value="support">Technical support</option>
          <option value="feedback">Feedback</option><option value="booking">Booking</option><option value="other">Other</option>
        </select>
      </label>
      <label>Subject<input name="subject" required minLength={3} maxLength={200} /></label>
      <label>Message<textarea name="message" required minLength={10} maxLength={10000} rows={6} /></label>
      {state.message && <p className={`phase-form-message ${state.status}`} role="status">{state.message}</p>}
      <button className="button button-dark" type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send message'}</button>
    </form>
  )
}
