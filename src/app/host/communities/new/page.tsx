import Link from 'next/link'
import { createHostCommunity } from '../../actions'

export default async function NewCommunityPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
 const { error } = await searchParams
 return <main className="event-detail"><div className="event-detail-inner community-editor"><Link href="/host/dashboard" className="back-link">← Host dashboard</Link><p className="eyebrow">HOST STUDIO</p><h1 className="page-title">Create a community</h1><p className="hero-lead">Build a welcoming space around a shared interest.</p>{error && <p className="auth-error" role="alert">Please check the community details and try again.</p>}
 <form action={createHostCommunity} className="auth-form"><label>Community name<input name="name" required minLength={3} maxLength={80}/></label><label>Description<textarea name="description" required minLength={10} maxLength={3000} rows={5}/></label><label>Location (optional)<input name="location" maxLength={120}/></label><label>Image URL (optional)<input type="url" name="image_url"/></label><label>Interests (comma-separated)<input name="interests" placeholder="hiking, photography, cooking"/></label><p className="booking-note">Your community remains private until it has been approved.</p><div className="button-row"><button className="button button-light" name="intent" value="draft">Save draft</button><button className="button button-dark" name="intent" value="submit">Submit for review</button></div></form></div></main>
}
