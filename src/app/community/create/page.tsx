
import type { Metadata } from 'next'
import Link from 'next/link'
import { createCommunity } from '../actions'
import CommunityForm from '@/components/CommunityForm'

export const metadata: Metadata = {
  title: 'Create a Community | Hilig',
}

type Props = {
  searchParams: Promise<{ error?: string }>
}

export default async function CreateCommunityPage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <main className="event-detail">
      <div className="event-detail-inner community-editor">
        <Link href="/community" className="back-link">
          ← Back to community
        </Link>

        <p className="eyebrow">BRING PEOPLE TOGETHER</p>
        <h1 className="page-title">Create a community</h1>
        <p className="hero-lead">
          Make a space for people to meet, share interests, and discover
          activities together.
        </p>

        {error && (
          <p className="auth-error" role="alert">
            We couldn’t create your community. Check that the name is
            unique and try again.
          </p>
        )}

        <CommunityForm
          action={createCommunity}
          submitLabel="Publish community"
        />
      </div>
    </main>
  )
}
