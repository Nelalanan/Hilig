
'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Icon from './Icon'

type UserRole = 'guest' | 'host' | 'admin' | null

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [role, setRole] = useState<UserRole>(null)

  const closeMenu = () => setMenuOpen(false)

  const loadUserState = useCallback(
    async (userId: string | null, supabase: ReturnType<typeof createClient>) => {
      if (!userId) {
        setIsSignedIn(false)
        setRole(null)
        return
      }

      setIsSignedIn(true)

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Could not load user profile role:', error.message)
        setRole(null)
        return
      }

      const userRole = profile?.role

      setRole(
        userRole === 'guest' ||
          userRole === 'host' ||
          userRole === 'admin'
          ? userRole
          : null,
      )
    },
    [],
  )

  useEffect(() => {
    const supabase = createClient()
    let active = true

    const syncUserState = async (userId: string | null) => {
      if (!active) return
      await loadUserState(userId, supabase)
    }

    // Load the current session on first render.
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return

      if (error) {
        // A signed-out visitor is a normal state.
        if (error.name !== 'AuthSessionMissingError') {
          console.error('Could not check authentication:', error.message)
        }

        void syncUserState(null)
        return
      }

      void syncUserState(data.user?.id ?? null)
    })

    // Keep the header updated after login, logout, or token refresh.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncUserState(session?.user?.id ?? null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [loadUserState])

  const accountHref = '/account'
  const authHref = isSignedIn ? accountHref : '/login'
  const authLabel = isSignedIn ? 'My Account' : 'Sign in'

  const hostHref = !isSignedIn
    ? '/login'
    : role === 'host'
      ? '/host/dashboard'
      : '/become-a-host'

  return (
    <header className="site-header">
      <Link
        className="brand"
        href="/"
        aria-label="Hilig home"
        onClick={closeMenu}
      >
        <img className="brand-logo-image" src="/hilig-logo.png" alt="Hilig — find what makes you come alive." />
      </Link>

      <nav
        className={menuOpen ? 'nav open' : 'nav'}
        aria-label="Main navigation"
      >
        <Link href="/experiences" onClick={closeMenu}>
          Explore
        </Link>

        <Link href="/events" onClick={closeMenu}>
          Events
        </Link>

        <Link href="/community" onClick={closeMenu}>
          Communities
        </Link>

        {role !== 'host' && (
          <Link href="/#partner" onClick={closeMenu}>
            For hosts
          </Link>
        )}

        <Link href="/partnerships" onClick={closeMenu}>
          Partnerships
        </Link>

        {isSignedIn && <Link href="/messages" onClick={closeMenu}>Messages</Link>}
        {role === 'admin' && <Link href="/admin/submissions" onClick={closeMenu}>Admin inbox</Link>}

        {role !== 'host' && (
          <Link href={hostHref} onClick={closeMenu}>
            Become a Host
          </Link>
        )}

        {role === 'host' && (
          <Link href="/host/dashboard" onClick={closeMenu}>
            Host Dashboard
          </Link>
        )}

        <Link
          className="nav-signin"
          href={authHref}
          onClick={closeMenu}
        >
          {authLabel}
        </Link>
      </nav>

      <div className="header-actions">
        <Link className="text-button" href={authHref}>
          {authLabel}
        </Link>

        <Link
          className="button button-gold small"
          href="/experiences"
        >
          Find an experience
        </Link>

        <button
          type="button"
          className="menu-button"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} />
        </button>
      </div>
    </header>
  )
}
