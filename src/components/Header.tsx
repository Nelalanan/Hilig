'use client'

import Link from 'next/link'
import { useState } from 'react'
import Icon from './Icon'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Hilig home" onClick={closeMenu}>
        <span className="brand-mark">h</span>
        <span>hilig.</span>
      </Link>

      <nav className={menuOpen ? 'nav open' : 'nav'} aria-label="Main navigation">
        <Link href="/experiences" onClick={closeMenu}>
          Explore
        </Link>
        <Link href="/#communities" onClick={closeMenu}>
          Communities
        </Link>
        <Link href="/#partner" onClick={closeMenu}>
          For hosts
        </Link>
        {/* The header's own Sign in link is hidden on small screens, so it lives in the menu too. */}
        <Link className="nav-signin" href="/login" onClick={closeMenu}>
          Sign in
        </Link>
      </nav>

      <div className="header-actions">
        <Link className="text-button" href="/login">
          Sign in
        </Link>

        <Link className="button button-gold small" href="/experiences">
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
