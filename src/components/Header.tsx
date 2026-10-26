 'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Icon from './Icon'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    const supabase = createClient()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session?.user)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const accountHref = '/account'
  const authHref = isSignedIn ? accountHref : '/login'
  const authLabel = isSignedIn ? 'My Account' : 'Sign in'

  return (
    <header className="site-header">
      <Link
        className="brand"
        href="/"
        aria-label="Hilig home"
        onClick={closeMenu}
      >
        <span className="brand-mark">h</span>
        <span>hilig.</span>
      </Link>

      <nav
        className={menuOpen ? 'nav open' : 'nav'}
        aria-label="Main navigation"
      >
        <Link href="/experiences" onClick={closeMenu}>
          Explore
        </Link>

        <Link href="/#communities" onClick={closeMenu}>
          Communities
        </Link>

        <Link href="/#partner" onClick={closeMenu}>
          For hosts
        </Link>

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