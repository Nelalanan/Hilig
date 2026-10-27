
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyCommunityGroupBySlug } from '@/lib/community'
import { updateCommunity } from '../../actions'
import CommunityForm from '@/components/CommunityForm'

export const metadata: Metadata = {
  title: 'Edit Community | Hilig',
}

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function EditCommunityPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params
  const { error } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/community/${slug}/edit`)}`)
  }

  const group = await getMyCommunityGroupBySlug(slug)

  if (!group) notFound()

  return (
    <main className="event-detail">
      <div className="event-detail-inner community-editor">
        <Link href="/my-communities" className="back-link">
          ← Back to my communities
        </Link>

        <p className="eyebrow">COMMUNITY MANAGEMENT</p>
        <h1 className="page-title">Edit {group.name}</h1>
        <p>Current status: <strong>{group.status}</strong></p>

        {error && (
          <p className="auth-error" role="alert">
            We couldn’t save those changes. Please try again.
          </p>
        )}

        <CommunityForm
          action={updateCommunity}
          submitLabel="Publish changes"
          initial={group}
        />

        {group.status === 'published' && (
          <form action={updateCommunity} className="community-secondary-action">
            <input type="hidden" name="id" value={group.id} />
            <input type="hidden" name="current_slug" value={group.slug} />
            <input type="hidden" name="name" value={group.name} />
            <input type="hidden" name="description" value={group.description} />
            <input
              type="hidden"
              name="interests"
              value={group.interests.join(', ')}
            />
            <input type="hidden" name="location" value={group.location ?? ''} />
            <input type="hidden" name="image_url" value={group.imageUrl ?? ''} />
            <button className="button" type="submit" name="intent" value="draft">
              Unpublish and save as draft
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
