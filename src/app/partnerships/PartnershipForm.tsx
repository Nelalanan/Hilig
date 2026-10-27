'use client'

import { useActionState } from 'react'
import { submitPartnership } from './actions'
import type { SubmissionState } from '@/app/contact/actions'

const initialState: SubmissionState = { status: 'idle', message: '' }

export default function PartnershipForm() {
  const [state, action, pending] = useActionState(submitPartnership, initialState)
  return (
    <form action={action} className="phase-form">
      <div className="phase-form-honeypot" aria-hidden="true">
        <label htmlFor="partnership-website-trap">Website</label>
        <input id="partnership-website-trap" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="phase-form-grid">
        <label>Contact name<input name="contact_name" required minLength={2} maxLength={120} autoComplete="name" /></label>
        <label>Email address<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
      </div>
      <label>Organization or project name<input name="organization_name" required minLength={2} maxLength={200} /></label>
      <label>What best describes you?
        <select name="applicant_type" defaultValue="business" required>
          <option value="business">Business</option><option value="creator">Creator</option>
          <option value="event_organizer">Event organizer</option><option value="host">Experience host</option>
          <option value="community">Community</option><option value="other">Other</option>
        </select>
      </label>
      <div className="phase-form-grid">
        <label>Website (optional)<input name="website_url" type="url" maxLength={2048} placeholder="https://example.com" /></label>
        <label>Location (optional)<input name="location" maxLength={200} placeholder="City, region" /></label>
      </div>
      <label>Tell us about your proposal<textarea name="proposal" required minLength={20} maxLength={10000} rows={7} placeholder="What would you like to build or do with Hilig?" /></label>
      {state.message && <p className={`phase-form-message ${state.status}`} role="status">{state.message}</p>}
      <button className="button button-dark" type="submit" disabled={pending}>{pending ? 'Submitting…' : 'Submit partnership proposal'}</button>
    </form>
  )
}
