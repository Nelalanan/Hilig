
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
    <section className="page-message">
      <p className="eyebrow">YOUR HILIG ACCOUNT</p>
      <h1 className="page-title">
        {fullName ? `Welcome, ${fullName}!` : 'Welcome to Hilig!'}
      </h1>

      <div className="account-profile">
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

        <div>
          <h2>{fullName || 'Complete your profile'}</h2>
          <p>{data.user.email}</p>
          {role && <p className="account-role">{role}</p>}
        </div>
      </div>

      {!fullName && (
        <p>
          Your profile doesn't have a name yet. You can add one in your
          account settings.
        </p>
      )}
      
      <div className="auth-actions">
        
       <Link className="button button-dark" href="/account/settings">
          Account settings
        </Link>

        <Link className="button button-dark" href="/experiences">
          Explore experiences
        </Link>

        <LogoutButton />
      </div>
    </section>
  )
}
