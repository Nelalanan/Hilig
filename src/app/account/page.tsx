import type { Metadata } from 'next'
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

  return (
    <section className="page-message">
      <p className="eyebrow">YOUR HILIG ACCOUNT</p>
      <h1 className="page-title">Welcome to Hilig!</h1>
      <p>You are signed in as {data.user.email}.</p>

      <div className="auth-actions">
        <Link className="button button-dark" href="/experiences">
          Explore experiences
        </Link>

        <LogoutButton />
      </div>
    </section>
  )
}