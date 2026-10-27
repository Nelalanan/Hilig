
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'

export const metadata: Metadata = {
  title: 'My account',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, role')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Unable to load user profile:', profileError.message)
  }

  const fullName = profile?.full_name?.trim()
  const avatarUrl = profile?.avatar_url
  const role = profile?.role

  return (
    <section className="account-hub page-message">
      <p className="eyebrow">YOUR SPACE • YOUR EXPERIENCES</p>
      <h1 className="page-title">
        {fullName ? `Welcome, ${fullName}!` : 'Welcome to Hilig!'}
      </h1>

      <div className="account-dashboard-grid">
      <div className="account-profile account-profile-card">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`${fullName || 'Your'} profile picture`}
            width={88}
            height={88}
            unoptimized
            className="account-avatar"
          />
        ) : (
          <div className="account-avatar-placeholder" aria-hidden="true">
            {(fullName || data.user.email || 'H')
              .charAt(0)
              .toUpperCase()}
          </div>
        )}

        <div className="account-profile-copy">
          <h2>{fullName || 'Complete your profile'}</h2>
          <p>{data.user.email}</p>
          {role && <p className="account-role">{role}</p>}
          {!fullName && (
            <p className="account-profile-hint">
              Your profile doesn&apos;t have a name yet. Add one in account settings.
            </p>
          )}
        </div>
      </div>

      <div className="auth-actions account-action-grid">
        <Link className="button button-dark" href="/account/bookings">
         My bookings
        </Link>
        
       <Link className="button button-dark" href="/account/settings">
          Account settings
        </Link>

        <Link className="button button-dark" href="/experiences">
          Explore experiences
        </Link>

        <LogoutButton />
      </div>
      </div>
      <div className="account-discovery-strip">
        <div><span className="eyebrow">KEEP EXPLORING</span><h2>Make room for something new.</h2><p>Find a workshop, meet your people, or plan your next experience.</p></div>
        <div className="account-discovery-links"><Link href="/events">Browse events ↗</Link><Link href="/community">Find communities ↗</Link></div>
      </div>
    </section>
  )
}
