import Image from 'next/image'
import Link from 'next/link'
import ExperienceCard from '@/components/ExperienceCard'
import EventCard from '@/components/EventCard'
import Icon from '@/components/Icon'
import Reveal from '@/components/Reveal'
import { CATEGORIES } from '@/lib/categories'
import { getFeaturedExperiences, getSiteStats } from '@/lib/data'
import { getEvents } from '@/lib/events'
import { createClient } from '@/lib/supabase/server'
import { PHOTOS } from '@/lib/site'
import './home-motion.css'

const STEPS = [
  {
    title: 'Browse',
    text: 'Explore small-group experiences hosted by people who love what they do.',
  },
  {
    title: 'Pick a session',
    text: 'Choose a date that fits your schedule and reserve your spot.',
  },
  {
    title: 'Show up',
    text: 'Beginners welcome. Just bring your curiosity.',
  },
  {
    title: 'Belong',
    text: 'Join a community and keep the inspiration going between sessions.',
  },
]

export default async function HomePage() {
  const [featured, stats, supabase, upcomingEvents] = await Promise.all([
    getFeaturedExperiences(3),
    getSiteStats(),
    createClient(),
    getEvents(),
  ])

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let hostRole: string | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    hostRole = profile?.role ?? null
  }

  const hostHref = !user
    ? '/login'
    : hostRole === 'host'
      ? '/host/dashboard'
      : '/become-a-host'

  const hostButtonLabel = !user
    ? 'Become a Hilig host'
    : hostRole === 'host'
      ? 'Manage your hosting'
      : 'Become a Hilig host'

  return (
    <>
      {/* ------------------------------- Hero ------------------------------- */}
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow light">
            DISCOVER SOMETHING THAT FEELS LIKE YOU
          </p>

          <h1>
            Find your <em>hilig.</em>
          </h1>

          <p className="hero-lead">
            Try something new, meet your people, and make space for more of
            what you love.
          </p>

          <form className="search-box" action="/experiences" method="get">
            <div className="search-field">
              <Icon name="search" />
              <input
                name="q"
                aria-label="Search hobbies"
                placeholder="What would you like to try?"
              />
            </div>


            <button
              type="submit"
              className="search-submit"
              aria-label="Search"
            >
              <Icon name="arrow" />
            </button>
          </form>

          {stats.experiences > 0 && (
            <div className="hero-meta">
              <span>
                <b>{stats.experiences}</b>{' '}
                {stats.experiences === 1 ? 'experience' : 'experiences'}
              </span>
              <i />
              <span>
                <b>{stats.hosts}</b> local{' '}
                {stats.hosts === 1 ? 'host' : 'hosts'}
              </span>
            </div>
          )}
        </div>

        <div className="hero-visual">
          <Image
            src={PHOTOS.hero}
            alt="Friends enjoying a creative workshop together"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 50vw"
          />

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

      {/* ---------------------------- Hobby ticker -------------------------- */}
      <div className="hobby-ticker" aria-hidden="true">
        <div className="hobby-ticker-track">
          {[0, 1].map((group) => (
            <ul key={group}>
              {[...CATEGORIES, ...CATEGORIES].map(({ name }, index) => (
                <li key={`${name}-${index}`}>{name}</li>
              ))}
            </ul>
          ))}
        </div>
      </div>

      {/* ---------------------------- Categories ---------------------------- */}
      <section className="category-section">
        <Reveal className="section-heading compact">
          <div>
            <p className="eyebrow">START EXPLORING</p>
            <h2>What are you curious about?</h2>
          </div>

          <Link href="/experiences">
            Browse all hobbies <Icon name="arrow" size={17} />
          </Link>
        </Reveal>

        <Reveal className="category-grid" stagger>
          {CATEGORIES.map(({ name, glyph }) => (
            <Link
              key={name}
              className="category-card"
              href={`/experiences?category=${encodeURIComponent(name)}`}
            >
              <span>{glyph}</span>
              <b>{name}</b>
            </Link>
          ))}
        </Reveal>
      </section>

      {/* ------------------------ Coming up soon ---------------------------- */}
      <section className="experiences-section" id="experiences">
        <Reveal className="section-heading">
          <div>
            <p className="eyebrow">COMING UP</p>
            <h2>Happening soon</h2>
            <p>
              Small-group experiences hosted by people who love what they do.
            </p>
          </div>

          <Link href="/experiences">
            View all experiences <Icon name="arrow" size={17} />
          </Link>
        </Reveal>

        {featured.length > 0 ? (
          <Reveal className="experience-grid" stagger>
            {featured.map((experience, index) => (
              <ExperienceCard
                key={experience.id}
                experience={experience}
                priority={index === 0}
              />
            ))}
          </Reveal>
        ) : (
          <p className="empty-note">
            New experiences are on their way. Check back soon.
          </p>
        )}
      </section>

      {/* ---------------------------- How it works -------------------------- */}
      <section className="how-section" id="how-it-works">
        <Reveal className="section-heading">
          <div>
            <p className="eyebrow">HOW IT WORKS</p>
            <h2>From curious to hooked, in four steps</h2>
          </div>
        </Reveal>

        <Reveal className="steps-grid" stagger>
          {STEPS.map((step, index) => (
            <article key={step.title} className="step-card">
              <span className="step-number">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </Reveal>
      </section>

      {/* ------------------------------ Events ------------------------------ */}
      <section className="experiences-section homepage-events" id="events">
        <Reveal className="section-heading">
          <div>
            <p className="eyebrow">MAKE PLANS</p>
            <h2>Events worth showing up for</h2>
            <p>Discover upcoming gatherings, meetups, and local happenings.</p>
          </div>
          <Link href="/events">Explore all events <Icon name="arrow" size={17} /></Link>
        </Reveal>
        {upcomingEvents.length > 0 ? (
          <Reveal className="experience-grid" stagger>
            {upcomingEvents.slice(0, 3).map((event) => <EventCard key={event.id} event={event} />)}
          </Reveal>
        ) : (
          <div className="homepage-events-empty">
            <p>New gatherings are being planned. Explore the events page for updates.</p>
            <Link className="button button-dark" href="/events">Explore events <Icon name="arrow" size={16} /></Link>
          </div>
        )}
      </section>

      {/* --------------------------- Communities ---------------------------- */}
      <section className="community-section" id="communities">
        <Reveal className="community-copy">
          <p className="eyebrow light">MORE FUN, TOGETHER</p>

          <h2>
            There’s a community
            <br />
            for your kind of curious.
          </h2>

          <p>
            Find your people in local hobby groups. Swap tips, join meetups,
            and keep the inspiration going between sessions.
          </p>

          <Link className="button button-gold" href="/community">
            Explore communities <Icon name="arrow" size={17} />
          </Link>
        </Reveal>

        <Reveal className="group-stack" stagger delay={120}>
          <div className="group-card rotate-left">
            <div className="group-icon">♫</div>
            <div>
              <small>MUSIC</small>
              <b>Manila Weekend Jammers</b>
              <span>Jam sessions, gigs &amp; good company</span>
            </div>
          </div>

          <div className="group-card">
            <div className="group-icon">◎</div>
            <div>
              <small>CRAFTS</small>
              <b>Clay &amp; Coffee Club</b>
              <span>For potters at every stage</span>
            </div>
          </div>

          <div className="group-card rotate-right">
            <div className="group-icon">⌁</div>
            <div>
              <small>OUTDOORS</small>
              <b>Sunday Trail Society</b>
              <span>Slow hikes &amp; new friends</span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ------------------------------- Hosts ------------------------------ */}
      <section className="host-section" id="partner">
        <Reveal className="host-image">
          <Image
            src={PHOTOS.host}
            alt="Local creative preparing a workshop"
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
          />
          <span>Built for local dreamers.</span>
        </Reveal>

        <Reveal className="host-copy" delay={120}>
          <p className="eyebrow">SHARE WHAT YOU LOVE</p>
          <h2>Your passion deserves a bigger table.</h2>

          <p>
            Teach a skill, host a gathering, or bring your creative idea to
            life. Hilig gives local hosts the tools and community to grow.
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

          <Link className="button button-dark" href={hostHref}>
            {hostButtonLabel} <Icon name="arrow" size={18} />
          </Link>
        </Reveal>
      </section>
    </>
  )
}
