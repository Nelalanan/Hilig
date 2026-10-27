import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'
import { createHostExperience } from '../../actions'

export default async function NewExperiencePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return <main className="event-detail"><div className="event-detail-inner community-editor"><Link href="/host/dashboard" className="back-link">← Host dashboard</Link><p className="eyebrow">HOST STUDIO</p><h1 className="page-title">Create an experience</h1><p className="hero-lead">Add the details, schedule a session, and choose how guests can pay.</p>
    {error && <p className="auth-error" role="alert">Please review the form. {error === 'date' ? 'The session date must be in the future.' : 'Some required information is missing or invalid.'}</p>}
    <form action={createHostExperience} className="auth-form">
      <label>Experience title<input name="title" required minLength={3} maxLength={120} placeholder="e.g. Beginner pottery workshop" /></label>
      <label>Category<select name="category" required defaultValue=""><option value="" disabled>Select a category</option>{CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}</select></label>
      <label>Description<textarea name="description" required minLength={20} maxLength={5000} rows={5} placeholder="What will guests do and learn?" /></label>
      <label>Location<input name="location" required maxLength={160} placeholder="City, venue, or meeting point" /></label>
      <label>Image URL (optional)<input type="url" name="image_url" placeholder="https://…" /></label>
      <div className="form-grid"><label>Price per person (PHP)<input type="number" name="price_php" min="0" max="1000000" step="1" defaultValue="0" required /><small>Set ₱0 for a free experience.</small></label><label>Duration (minutes)<input type="number" name="duration_minutes" min="15" max="1440" step="15" defaultValue="60" required /></label></div>
      <label>What’s included (one item per line)<textarea name="includes" rows={3} placeholder="Materials\nGuidance from the host" /></label>
      <h2>First session</h2><div className="form-grid"><label>Date and time<input type="datetime-local" name="starts_at" required /></label><label>Available spots<input type="number" name="capacity" min="1" max="500" defaultValue="10" required /></label></div>
      <h2>Payment settings</h2><p className="booking-note">Free experiences require no payment. For paid experiences, select at least one method guests can use.</p>
      <label className="form-option"><input type="checkbox" name="online_payment_enabled" defaultChecked /><span><strong>Accept online payment</strong><small>Guests pay through Hilig’s existing checkout.</small></span></label>
      <label className="form-option"><input type="checkbox" name="cash_payment_enabled" /><span><strong>Accept cash / payment in person</strong><small>Guests reserve a spot and pay you directly.</small></span></label>
      <label>Cash payment instructions (optional)<textarea name="cash_payment_instructions" rows={2} maxLength={500} placeholder="e.g. Please pay at the venue before the activity begins." /></label>
      <div className="button-row"><button className="button button-light" type="submit" name="intent" value="draft">Save draft</button><button className="button button-dark" type="submit" name="intent" value="submit">Submit for review</button></div>
    </form>
  </div></main>
}
