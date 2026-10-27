import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function HostDashboardPage({ searchParams }: { searchParams: Promise<{ created?: string; status?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=%2Fhost%2Fdashboard')
  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'host') redirect('/become-a-host')
  const admin = createAdminClient()
  const { data: host } = await admin.from('hosts').select('id, name').eq('owner_id', user.id).maybeSingle()
  if (!host) redirect('/become-a-host?error=host-profile')
  const [{ data: experiences }, { data: events }, { data: communities }] = await Promise.all([
    admin.from('experiences').select('id,title,approval_status,is_published').eq('host_id', host.id).order('created_at', { ascending: false }),
    admin.from('events').select('id,title,approval_status,status').eq('host_id', host.id).order('starts_at', { ascending: false }),
    admin.from('community_groups').select('id,name,approval_status,status').eq('creator_id', user.id).order('created_at', { ascending: false }),
  ])
  const content = [
    ...(experiences ?? []).map((x) => ({ title: x.title, type: 'Experience', status: x.approval_status, public: x.is_published })),
    ...(events ?? []).map((x) => ({ title: x.title, type: 'Event', status: x.approval_status, public: x.status === 'published' })),
    ...(communities ?? []).map((x) => ({ title: x.name, type: 'Community', status: x.approval_status, public: x.status === 'published' })),
  ]
  const count = (status: string) => content.filter((item) => item.status === status).length
  return <main className="host-studio"><div className="host-studio-inner">
    <p className="eyebrow">HOST STUDIO</p><h1 className="page-title">Welcome, {host.name}</h1>
    <p className="hero-lead">Create experiences, bring people together, and manage your listings from one place.</p>
    <div className="host-dashboard-quick-links"><Link className="button button-dark" href="/host/bookings">Manage bookings →</Link><Link className="host-dashboard-text-link" href="/#partner">Learn about hosting on Hilig ↗</Link></div>
    {params.created && <p className="auth-success">Your {params.created} was saved{params.status === 'pending_review' ? ' and submitted for admin review' : ' as a draft'}.</p>}
    <div className="stats-grid">
      {[['All listings', String(content.length)], ['Pending review', String(count('pending_review'))], ['Changes requested', String(count('changes_requested'))], ['Published', String(content.filter(x => x.public && x.status === 'approved').length)]].map(([label, val]) => <section className="stat-card" key={label}><p>{label}</p><strong>{val}</strong></section>)}
    </div>
    <h2 className="section-title">Create something</h2>
    <div className="card-grid">
      <Link className="experience-card" href="/host/experiences/new"><div className="experience-card-body"><p className="eyebrow">EXPERIENCES</p><h3>Create an experience</h3><p>Set a price, payment methods, session date, and capacity.</p><span className="button button-dark">Create experience →</span></div></Link>
      <Link className="experience-card" href="/host/events/new"><div className="experience-card-body"><p className="eyebrow">EVENTS</p><h3>Create an event</h3><p>Publish a gathering, workshop, or special event after review.</p><span className="button button-dark">Create event →</span></div></Link>
      <Link className="experience-card" href="/host/communities/new"><div className="experience-card-body"><p className="eyebrow">COMMUNITIES</p><h3>Create a community</h3><p>Build a space for people with shared interests.</p><span className="button button-dark">Create community →</span></div></Link>
    </div>
    <h2 className="section-title">Your content</h2>
    {content.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Listing</th><th>Type</th><th>Review status</th><th>Visibility</th></tr></thead><tbody>{content.map((item, i) => <tr key={`${item.type}-${item.title}-${i}`}><td>{item.title}</td><td>{item.type}</td><td><span className="status-pill">{item.status.replaceAll('_', ' ')}</span></td><td>{item.public && item.status === 'approved' ? 'Public' : 'Private'}</td></tr>)}</tbody></table></div> : <p>You haven’t created any listings yet. Start with an experience, event, or community above.</p>}
    <p className="booking-note">New content stays private until an administrator approves and publishes it. Drafts are never public.</p>
  </div></main>
}
