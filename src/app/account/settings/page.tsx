
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileSettingsForm from '@/components/ProfileSettingsForm'

export const metadata: Metadata = {
  title: 'Account settings',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

export default async function AccountSettingsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    redirect('/login?next=/account/settings')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Unable to load profile settings:', profileError.message)

    return (
      <section className="page-message auth-page">
        <p className="eyebrow">YOUR HILIG ACCOUNT</p>
        <h1 className="page-title">Account settings</h1>
        <p>We couldn't load your profile. Please try again later.</p>
        <Link className="button button-dark" href="/account">
          Back to account
        </Link>
      </section>
    )
  }

  if (!profile) {
    return (
      <section className="page-message auth-page">
        <p className="eyebrow">YOUR HILIG ACCOUNT</p>
        <h1 className="page-title">Profile unavailable</h1>
        <p>
          Your profile record could not be found. Please contact support
          if this problem continues.
        </p>
        <Link className="button button-dark" href="/account">
          Back to account
        </Link>
      </section>
    )
  }

  return (
    <section className="page-message auth-page">
      <p className="eyebrow">YOUR HILIG ACCOUNT</p>
      <h1 className="page-title">Account settings</h1>
      <p>Update your personal information below.</p>

      <ProfileSettingsForm
        initialFullName={profile.full_name ?? ''}
        initialAvatarUrl={profile.avatar_url ?? ''}
        email={data.user.email ?? ''}
      />

      <p>
        <Link href="/account">Back to account</Link>
      </p>
    </section>
  )
}
