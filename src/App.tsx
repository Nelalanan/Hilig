import { FormEvent, ReactNode, useState } from 'react'

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

const photos = {
  hero: 'https://images.unsplash.com/photo-1560831340-b9679dc9e9f0?auto=format&fit=crop&w=1400&q=85',
  pottery: 'https://images.unsplash.com/photo-1480355781839-51097c7d4f9f?auto=format&fit=crop&w=900&q=85',
  bread: 'https://images.unsplash.com/photo-1613292136906-32a449d4ec7b?auto=format&fit=crop&w=900&q=85',
  painting: 'https://images.unsplash.com/photo-1593382067395-ace3045a1547?auto=format&fit=crop&w=900&q=85',
  host: 'https://images.unsplash.com/photo-1619194999378-762462c38ab4?auto=format&fit=crop&w=1100&q=85',
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const iconPaths: Record<string, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5a5.5 5.5 0 0 0 1-8.9Z" />
  ),
  star: (
    <path d="m12 2.5 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.1l6.2-.9L12 2.5Z" />
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m16 8-2.4 5.6L8 16l2.4-5.6L16 8Z" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const categories = [
  ['Pottery', '◎'],
  ['Painting', '✦'],
  ['Cooking', '⌁'],
  ['Music', '♫'],
  ['Outdoors', '⌂'],
  ['Wellness', '◌'],
]

const experiences = [
  {
    title: 'Wheel-Thrown Pottery for Beginners',
    type: 'CRAFTS',
    host: 'Clay House Studio',
    place: 'Makati',
    date: 'Sat, 10:00 AM',
    price: '₱1,250',
    rating: '4.9',
    reviews: '86',
    img: photos.pottery,
    tag: 'Materials included',
  },
  {
    title: 'Sourdough from Scratch',
    type: 'COOKING',
    host: 'The Daily Knead',
    place: 'Quezon City',
    date: 'Sun, 2:00 PM',
    price: '₱980',
    rating: '4.8',
    reviews: '54',
    img: photos.bread,
    tag: 'Beginner friendly',
  },
  {
    title: 'Paint Your Own Botanicals',
    type: 'ART',
    host: 'Common Room',
    place: 'Pasig',
    date: 'Fri, 6:30 PM',
    price: '₱750',
    rating: '4.9',
    reviews: '112',
    img: photos.painting,
    tag: 'No experience needed',
  },
]

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [saved, setSaved] = useState<number[]>([])
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')

  const submitSearch = (e: FormEvent) => {
    e.preventDefault()

    const term = query.trim()
    setNotice(term ? `Showing ideas for “${term}”` : 'Explore all hobbies near you')

    document.querySelector('#experiences')?.scrollIntoView({ behavior: 'smooth' })
  }

  const toggleSaved = (index: number) => {
    setSaved((current) =>
      current.includes(index)
        ? current.filter((i) => i !== index)
        : [...current, index]
    )
  }

  const pickCategory = (name: string) => {
    setQuery(name)
    setNotice(`Showing ideas for “${name}”`)
  }

  return (
    <main>
      {/* ------------------------------ Header ------------------------------ */}
      <header className="site-header">
        <a className="brand" href="#" aria-label="Hilig home">
          <span className="brand-mark">h</span>
          <span>hilig.</span>
        </a>

        <nav className={menuOpen ? 'nav open' : 'nav'} aria-label="Main navigation">
          <a href="#experiences">Explore</a>
          <a href="#communities">Communities</a>
          <a href="#events">Events</a>
          <a href="#partner">For hosts</a>
        </nav>

        <div className="header-actions">
          <button
            className="text-button"
            onClick={() => setNotice('Welcome back! Sign in is coming soon.')}
          >
            Sign in
          </button>

          <a className="button button-gold small" href="#experiences">
            Find an experience
          </a>

          <button
            className="menu-button"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </header>

      {/* ------------------------------- Hero ------------------------------- */}
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow light">DISCOVER SOMETHING THAT FEELS LIKE YOU</p>

          <h1>
            Find your <em>hilig.</em>
          </h1>

          <p className="hero-lead">
            Try something new, meet your people, and make space for more of what you love.
          </p>

          <form className="search-box" onSubmit={submitSearch}>
            <div className="search-field">
              <Icon name="search" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search hobbies"
                placeholder="What would you like to try?"
              />
            </div>

            <div className="search-field location">
              <Icon name="pin" />
              <span>Metro Manila</span>
            </div>

            <button type="submit" className="search-submit" aria-label="Search">
              <Icon name="arrow" />
            </button>
          </form>

          <div className="hero-meta">
            <span>
              <b>4.9</b> average rating
            </span>
            <i />
            <span>
              <b>2,000+</b> local experiences
            </span>
          </div>
        </div>

        <div className="hero-visual">
          <img src={photos.hero} alt="Friends enjoying a creative workshop together" />

          <div className="floating-card">
            <span className="float-icon">✦</span>
            <div>
              <b>Made for beginners</b>
              <small>No experience needed</small>
            </div>
          </div>

          <div className="scribble">
            your next
            <br />
            favorite thing
          </div>
        </div>
      </section>

      {/* ---------------------------- Categories ---------------------------- */}
      <section className="category-section">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">START EXPLORING</p>
            <h2>What are you curious about?</h2>
          </div>

          <a href="#experiences">
            Browse all hobbies <Icon name="arrow" size={17} />
          </a>
        </div>

        <div className="category-grid">
          {categories.map(([name, icon]) => (
            <button
              key={name}
              className="category-card"
              onClick={() => pickCategory(name)}
            >
              <span>{icon}</span>
              <b>{name}</b>
            </button>
          ))}
        </div>
      </section>

      {/* --------------------------- Experiences ---------------------------- */}
      <section className="experiences-section" id="experiences">
        <div className="section-heading">
          <div>
            <p className="eyebrow">HANDPICKED NEAR YOU</p>
            <h2>Popular this week</h2>
            <p>{notice || 'Small-group experiences hosted by people who love what they do.'}</p>
          </div>

          <a href="#">
            View all experiences <Icon name="arrow" size={17} />
          </a>
        </div>

        <div className="experience-grid">
          {experiences.map((item, index) => (
            <article className="experience-card" key={item.title}>
              <div className="card-image">
                <img src={item.img} alt="" />
                <span className="tag">{item.tag}</span>

                <button
                  className={saved.includes(index) ? 'save saved' : 'save'}
                  aria-label="Save experience"
                  onClick={() => toggleSaved(index)}
                >
                  <Icon name="heart" size={19} />
                </button>
              </div>

              <div className="card-content">
                <p className="card-type">{item.type}</p>
                <h3>{item.title}</h3>
                <p className="host">with {item.host}</p>

                <div className="detail-row">
                  <span>
                    <Icon name="calendar" size={16} />
                    {item.date}
                  </span>
                  <span>
                    <Icon name="pin" size={16} />
                    {item.place}
                  </span>
                </div>

                <div className="card-footer">
                  <span>
                    <b>{item.price}</b> / person
                  </span>
                  <span className="rating">
                    <Icon name="star" size={15} /> {item.rating} <small>({item.reviews})</small>
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* --------------------------- Communities ---------------------------- */}
      <section className="community-section" id="communities">
        <div className="community-copy">
          <p className="eyebrow light">MORE FUN, TOGETHER</p>

          <h2>
            There’s a community
            <br />
            for your kind of curious.
          </h2>

          <p>
            Find your people in local hobby groups. Swap tips, join meetups, and keep the
            inspiration going between sessions.
          </p>

          <a className="button button-gold" href="#">
            Explore communities <Icon name="arrow" size={18} />
          </a>
        </div>

        <div className="group-stack">
          <div className="group-card rotate-left">
            <div className="group-icon">♫</div>
            <div>
              <small>MUSIC · 1.2K MEMBERS</small>
              <b>Manila Weekend Jammers</b>
              <span>Jam sessions, gigs & good company</span>
            </div>
          </div>

          <div className="group-card">
            <div className="group-icon">◎</div>
            <div>
              <small>CRAFTS · 840 MEMBERS</small>
              <b>Clay & Coffee Club</b>
              <span>For potters at every stage</span>
            </div>
          </div>

          <div className="group-card rotate-right">
            <div className="group-icon">⌁</div>
            <div>
              <small>OUTDOORS · 2.4K MEMBERS</small>
              <b>Sunday Trail Society</b>
              <span>Slow hikes & new friends</span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------- Hosts ------------------------------ */}
      <section className="host-section" id="partner">
        <div className="host-image">
          <img src={photos.host} alt="Local creative preparing a workshop" />
          <span>Built for local dreamers.</span>
        </div>

        <div className="host-copy">
          <p className="eyebrow">SHARE WHAT YOU LOVE</p>
          <h2>Your passion deserves a bigger table.</h2>

          <p>
            Teach a skill, host a gathering, or bring your creative idea to life. Hilig gives
            local hosts the tools and community to grow.
          </p>

          <ul>
            <li>
              <Icon name="compass" />
              Reach curious people nearby
            </li>
            <li>
              <Icon name="calendar" />
              Manage schedules and bookings
            </li>
            <li>
              <Icon name="users" />
              Grow a loyal community
            </li>
          </ul>

          <a className="button button-dark" href="#">
            Become a Hilig host <Icon name="arrow" size={18} />
          </a>
        </div>
      </section>

      {/* ------------------------------ Footer ------------------------------ */}
      <footer>
        <a className="brand footer-brand" href="#">
          <span className="brand-mark">h</span>
          <span>hilig.</span>
        </a>

        <p>Discover. Learn. Belong.</p>

        <div>
          <a href="#">Instagram</a>
          <a href="#">About</a>
          <a href="#">Help</a>
        </div>

        <small>© 2025 Hilig. Made with care in the Philippines.</small>
      </footer>
    </main>
  )
}