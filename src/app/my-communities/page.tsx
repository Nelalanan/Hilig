
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyCommunityGroups } from '@/lib/community'
import { archiveCommunity, deleteDraftCommunity } from '@/app/community/actions'

export const metadata: Metadata = {
  title: 'My Communities | Hilig',
}

type Props = {
  searchParams: Promise<{ notice?: string; error?: string }>
}

export default async function MyCommunitiesPage({ searchParams }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=%2Fmy-communities')
  }

  const { notice, error } = await searchParams
  const groups = await getMyCommunityGroups()

  const messages: Record<string, string> = {
    draft: 'Your community draft has been saved.',
    published: 'Your community has been published.',
    updated: 'Your community has been updated.',
    archived: 'Your community has been archived.',
    deleted: 'Your draft has been deleted.',
  }

  return (
    <main className="event-detail">
      <div className="event-detail-inner">
        <div className="community-dashboard-heading">
          <div>
            <p className="eyebrow">YOUR SPACE ON HILIG</p>
            <h1 className="page-title">My Communities</h1>
            <p>Manage your communities, drafts, and published spaces.</p>
          </div>

          <Link className="button button-dark" href="/community/create">
            Create community
          </Link>
        </div>

        {notice && messages[notice] && (
          <p role="status" className="community-notice">
            {messages[notice]}
          </p>
        )}

        {error && (
          <p role="alert" className="auth-error">
            That action couldn’t be completed. Please refresh and try again.
          </p>
        )}

        {groups.length === 0 ? (
          <div className="empty-state">
            <h2>You haven't created a community yet</h2>
            <p>Create a community around a hobby, skill, or shared interest.</p>
            <Link className="button button-dark" href="/community/create">
              Create your first community
            </Link>
          </div>
        ) : (
          <div className="experience-grid community-managed-grid">
            {groups.map((group) => (
              <article className="event-card" key={group.id}>
                {group.imageUrl ? (
                  <img
                    className="event-card-image"
                    src={group.imageUrl}
                    alt=""
                  />
                ) : (
                  <div className="event-card-image event-card-placeholder">
                    Hilig Community
                  </div>
                )}

                <div className="event-card-content">
                  <span className={`community-status community-status-${group.status}`}>
                    {group.status}
                  </span>
                  <h2>{group.name}</h2>
                  <p>{group.description}</p>

                  {group.location && (
                    <p className="event-card-location">{group.location}</p>
                  )}

                  <div className="community-card-actions">
                    <Link
                      className="button button-dark"
                      href={`/community/${encodeURIComponent(group.slug)}/edit`}
                    >
                      Edit
                    </Link>

                    {group.status === 'published' && (
                      <Link
                        className="button"
                        href={`/community/${encodeURIComponent(group.slug)}`}
                      >
                        View
                      </Link>
                    )}

                    {group.status !== 'archived' && (
                      <form action={archiveCommunity}>
                        <input type="hidden" name="id" value={group.id} />
                        <button className="button" type="submit">
                          Archive
                        </button>
                      </form>
                    )}

                    {group.status === 'draft' && (
                      <form action={deleteDraftCommunity}>
                        <input type="hidden" name="id" value={group.id} />
                        <button className="button button-cancel" type="submit">
                          Delete draft
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
