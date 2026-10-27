import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { reviewHostContent } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminContentPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
 const params = await searchParams
 const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser()
 if (!user) redirect('/login?next=%2Fadmin%2Fcontent')
 const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
 if (profile?.role !== 'admin') redirect('/?error=forbidden')
 const admin = createAdminClient()
 const [{ data: experiences }, { data: events }, { data: communities }] = await Promise.all([
  admin.from('experiences').select('id,title,description,location,price_php,approval_status,admin_feedback,created_at,hosts(name)').eq('approval_status','pending_review').order('created_at',{ascending:true}),
  admin.from('events').select('id,title,description,location,price_php,approval_status,admin_feedback,starts_at,hosts(name)').eq('approval_status','pending_review').order('starts_at',{ascending:true}),
  admin.from('community_groups').select('id,name,description,location,approval_status,admin_feedback,created_at').eq('approval_status','pending_review').order('created_at',{ascending:true}),
 ])
 const items = [
  ...(experiences ?? []).map((x:any) => ({ table:'experiences', id:x.id, title:x.title, type:'Experience', description:x.description, location:x.location, extra:`₱${x.price_php} per person`, host:x.host?.name ?? 'Host' })),
  ...(events ?? []).map((x:any) => ({ table:'events', id:x.id, title:x.title, type:'Event', description:x.description, location:x.location, extra:`₱${x.price_php} · ${new Date(x.starts_at).toLocaleString('en-PH',{timeZone:'Asia/Manila'})}`, host:x.host?.name ?? 'Host' })),
  ...(communities ?? []).map((x:any) => ({ table:'community_groups', id:x.id, title:x.name, type:'Community', description:x.description, location:x.location ?? 'Not specified', extra:'Community listing', host:'Community creator' })),
 ]
 return <main className="event-detail"><div className="event-detail-inner"><p className="eyebrow">ADMIN STUDIO</p><h1 className="page-title">Content review</h1><p className="hero-lead">Review host submissions before they become public.</p>{params.notice && <p className="auth-success">Review decision saved.</p>}{params.error && <p className="auth-error">Could not save the decision. Please try again.</p>}<p>{items.length} submission{items.length === 1 ? '' : 's'} awaiting review.</p>
 {items.length === 0 ? <section className="empty-state"><h2>You’re all caught up</h2><p>New host submissions will appear here.</p></section> : <div className="review-list">{items.map(item => <article className="review-card" key={`${item.table}-${item.id}`}><p className="eyebrow">{item.type.toUpperCase()} · {item.host}</p><h2>{item.title}</h2><p>{item.description}</p><p><strong>Location:</strong> {item.location}</p><p>{item.extra}</p><form action={reviewHostContent} className="auth-form"><input type="hidden" name="table" value={item.table}/><input type="hidden" name="id" value={item.id}/><label>Feedback for host (optional)<textarea name="feedback" rows={2} maxLength={2000} placeholder="Explain requested changes or rejection reason"/></label><div className="button-row"><button className="button button-dark" name="decision" value="approve">Approve and publish</button><button className="button button-light" name="decision" value="changes_requested">Request changes</button><button className="button button-light" name="decision" value="reject">Reject</button></div></form></article>)}</div>}
 </div></main>
}
