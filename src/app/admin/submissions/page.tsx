import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateSubmission } from './actions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Submission management', robots: { index: false, follow: false } }

type SearchParams = Promise<Record<string, string | string[] | undefined>>
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value }
function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default async function AdminSubmissionsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login?next=%2Fadmin%2Fsubmissions')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') redirect('/?error=forbidden')

  const admin = createAdminClient()
  const [{ data: contacts, error: contactError }, { data: partnerships, error: partnershipError }] = await Promise.all([
    admin.from('contact_inquiries').select('*').order('created_at', { ascending: false }).limit(100),
    admin.from('partnership_applications').select('*').order('created_at', { ascending: false }).limit(100),
  ])
  const params = await searchParams
  const notice = first(params.notice)
  const errorCode = first(params.error)

  return (
    <section className="phase-page admin-submissions">
      <div className="phase-page-heading">
        <p className="eyebrow">HILIG ADMIN</p>
        <h1 className="page-title">Submissions</h1>
        <p>Review contact inquiries and partnership proposals. Only accounts with the admin role can access this page.</p>
      </div>
      {notice === 'saved' && <p className="phase-form-message success" role="status">Submission updated.</p>}
      {errorCode && <p className="phase-form-message error" role="alert">Could not update that submission. Please check the values and try again.</p>}
      {(contactError || partnershipError) && <p className="phase-form-message error" role="alert">Some submissions could not be loaded. Check server logs and Supabase configuration.</p>}

      <section className="admin-submission-section">
        <h2>Contact inquiries ({contacts?.length ?? 0})</h2>
        {!contacts?.length ? <p className="phase-muted">No contact inquiries found.</p> : contacts.map((item: any) => (
          <article className="admin-submission-card" key={item.id}>
            <div className="admin-submission-meta"><span>{item.category}</span><span>{formatDate(item.created_at)}</span><span className="admin-status">{item.status}</span></div>
            <h3>{item.subject}</h3>
            <p><strong>{item.name}</strong> · <a href={`mailto:${item.email}`}>{item.email}</a></p>
            <p className="admin-submission-body">{item.message}</p>
            <form action={updateSubmission} className="admin-update-form">
              <input type="hidden" name="table" value="contact_inquiries" /><input type="hidden" name="id" value={item.id} />
              <label>Status<select name="status" defaultValue={item.status}><option value="pending">Pending</option><option value="in_review">In review</option><option value="responded">Responded</option><option value="closed">Closed</option></select></label>
              <label>Internal/response note<textarea name="admin_response" rows={3} maxLength={10000} defaultValue={item.admin_response ?? ''} placeholder="Add a response or note..." /></label>
              <button className="button button-dark" type="submit">Save changes</button>
            </form>
          </article>
        ))}
      </section>

      <section className="admin-submission-section">
        <h2>Partnership applications ({partnerships?.length ?? 0})</h2>
        {!partnerships?.length ? <p className="phase-muted">No partnership applications found.</p> : partnerships.map((item: any) => (
          <article className="admin-submission-card" key={item.id}>
            <div className="admin-submission-meta"><span>{item.applicant_type.replaceAll('_', ' ')}</span><span>{formatDate(item.created_at)}</span><span className="admin-status">{item.status}</span></div>
            <h3>{item.organization_name}</h3>
            <p><strong>{item.contact_name}</strong> · <a href={`mailto:${item.email}`}>{item.email}</a></p>
            {item.website_url && <p><a href={item.website_url} target="_blank" rel="noreferrer">{item.website_url}</a></p>}
            {item.location && <p>{item.location}</p>}
            <p className="admin-submission-body">{item.proposal}</p>
            <form action={updateSubmission} className="admin-update-form">
              <input type="hidden" name="table" value="partnership_applications" /><input type="hidden" name="id" value={item.id} />
              <label>Status<select name="status" defaultValue={item.status}><option value="pending">Pending</option><option value="in_review">In review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="closed">Closed</option></select></label>
              <label>Response/note<textarea name="admin_response" rows={3} maxLength={10000} defaultValue={item.admin_response ?? ''} placeholder="Add a response or note..." /></label>
              <button className="button button-dark" type="submit">Save changes</button>
            </form>
          </article>
        ))}
      </section>
    </section>
  )
}
