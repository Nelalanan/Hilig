import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { markAllNotificationsRead, markNotificationRead } from './actions'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=%2Fnotifications')
  const { data: notifications, error } = await supabase.from('in_app_notifications')
    .select('id,title,body,href,notification_type,read_at,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100)
  const unread = (notifications ?? []).filter((item) => !item.read_at).length

  return <section className="page-section"><div className="page-banner"><div className="page-banner-inner"><p className="eyebrow">Your updates</p><h1>Notifications {unread > 0 && <span className="notification-count">{unread} unread</span>}</h1><p className="hero-lead">Messages and updates related to your Hilig activity.</p>{unread > 0 && <form action={markAllNotificationsRead}><button className="button button-gold" type="submit">Mark all as read</button></form>}</div></div><div className="listing">
    {error ? <div className="empty-state"><h2>Notifications couldn't load</h2><p>Please refresh the page or try again later.</p></div> : !notifications?.length ? <div className="empty-state"><h2>You're all caught up</h2><p>New messages and updates will appear here.</p><Link className="button button-gold" href="/messages">Open messages</Link></div> : <div className="notification-list">{notifications.map((item) => <article className={item.read_at ? 'notification-item' : 'notification-item notification-unread'} key={item.id}><div><p className="eyebrow">{item.notification_type.replaceAll('_', ' ')}</p><h2>{item.title}</h2>{item.body && <p>{item.body}</p>}<time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time></div>{!item.read_at && <form action={markNotificationRead}><input type="hidden" name="id" value={item.id} /><button className="button button-outline small" type="submit">{item.href ? 'Open' : 'Mark read'}</button></form>}</article>)}</div>}
  </div></section>
}
