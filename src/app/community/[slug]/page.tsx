
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCommunityGroupBySlug } from '@/lib/community'
import { createClient } from '@/lib/supabase/server'
import { joinCommunity, leaveCommunity } from './actions'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ membership?: string; membershipError?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const group = await getCommunityGroupBySlug(slug)

  if (!group) {
    return { title: 'Community not found | Hilig' }
  }

  return {
    title: `${group.name} | Hilig Community`,
    description: group.description.slice(0, 160),
  }
}

export default async function CommunityGroupPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params
  const query = await searchParams
  const group = await getCommunityGroupBySlug(slug)

  if (!group) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isMember = false

  const { data: relatedEvents } = await supabase
    .from('events')
    .select('slug,title,starts_at,location')
    .eq('group_id', group.id)
    .eq('status', 'published')
    .order('starts_at', { ascending: true })
    .limit(6)

  if (user) {
    const { data: membership, error } = await supabase
      .from('group_memberships')
      .select('group_id')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('[Hilig] Could not check community membership:', error.message)
    } else {
      isMember = Boolean(membership)
    }
  }

  return (
    <main className="event-detail">
      <div className="event-detail-inner">
        <Link href="/community" className="back-link">
          ← Back to community
        </Link>

        {group.imageUrl && (
          <img
            className="event-detail-image"
            src={group.imageUrl}
            alt={group.name}
          />
        )}

        <div className="event-detail-layout">
          <article className="event-detail-main">
            <p className="eyebrow">HILIG COMMUNITY</p>
            <h1 className="page-title">{group.name}</h1>

            {group.location && (
              <p className="event-card-location">{group.location}</p>
            )}

            <section className="event-detail-section">
              <h2>About this community</h2>
              <p className="event-detail-description">{group.description}</p>
            </section>

            {group.interests.length > 0 && (
              <section className="event-detail-section">
                <h2>Shared interests</h2>
                <div className="community-interests">
                  {group.interests.map((interest) => (
                    <span className="chip" key={interest}>
                      {interest}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section className="event-detail-section">
              <h2>Community organizer</h2>
              <p>{group.creatorName}</p>
            </section>
            {group.creatorId && group.creatorId !== user?.id && (
              <section className="event-detail-section">
                <Link className="button button-outline small" href={`/messages/new?to=${encodeURIComponent(group.creatorId)}&subject=${encodeURIComponent(`Question about ${group.name}`)}`}>
                  Message organizer
                </Link>
              </section>
            )}
            <section className="event-detail-section">
              <h2>Related events</h2>
              {!relatedEvents?.length ? <p>There are no published events linked to this community yet.</p> : <ul className="related-event-list">{relatedEvents.map((event) => <li key={event.slug}><Link href={`/events/${encodeURIComponent(event.slug)}`}>{event.title}</Link><span>{new Date(event.starts_at).toLocaleDateString('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' })} · {event.location}</span></li>)}</ul>}
            </section>
          </article>

          <aside className="event-detail-booking">
            <p className="eyebrow">JOIN THE COMMUNITY</p>
            <h2>{group.name}</h2>
            <p>
              Connect with people who share your interests and discover
              future meetups and activities.
            </p>

            {query.membership === 'joined' && (
              <p role="status">You have joined this community.</p>
            )}

            {query.membership === 'left' && (
              <p role="status">You have left this community.</p>
            )}

            {query.membershipError === '1' && (
              <p className="auth-error" role="alert">
                We couldn’t update your membership. Please try again.
              </p>
            )}

            {!user ? (
              <Link
                className="button button-dark"
                href={`/login?next=${encodeURIComponent(`/community/${slug}`)}`}
              >
                Sign in to join
              </Link>
            ) : isMember ? (
              <>
                <p role="status">You’re a member of this community.</p>
                <form action={leaveCommunity}>
                  <input type="hidden" name="slug" value={slug} />
                  <button className="button button-dark" type="submit">
                    Leave community
                  </button>
                </form>
              </>
            ) : (
              <form action={joinCommunity}>
                <input type="hidden" name="slug" value={slug} />
                <button className="button button-dark" type="submit">
                  Join community
                </button>
              </form>
            )}

            <p className="event-booking-note">
              You can leave a community at any time.
            </p>
          </aside>
        </div>
      </div>
    </main>
  )
}
