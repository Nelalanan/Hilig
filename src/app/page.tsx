import Image from 'next/image'
import Link from 'next/link'
import ExperienceCard from '@/components/ExperienceCard'
import Icon from '@/components/Icon'
import { CATEGORIES } from '@/lib/categories'
import { getFeaturedExperiences, getSiteStats } from '@/lib/data'
import { PHOTOS } from '@/lib/site'

// Rebuild this page in the background at most once a minute.
export const revalidate = 60

export default async function HomePage() {
  const [featured, stats] = await Promise.all([getFeaturedExperiences(3), getSiteStats()])

  return (
    <>
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

          {/* A plain GET form: works without JavaScript and lands on /experiences?q=... */}
          <form className="search-box" action="/experiences" method="get">
            <div className="search-field">
              <Icon name="search" />
              <input name="q" aria-label="Search hobbies" placeholder="What would you like to try?" />
            </div>

            <div className="search-field location">
              <Icon name="pin" />
              <span>Metro Manila</span>
            </div>

            <button type="submit" className="search-submit" aria-label="Search">
              <Icon name="arrow" />
            </button>
          </form>

          {stats.experiences > 0 && (
            <div className="hero-meta">
              <span>
                <b>{stats.experiences}</b> {stats.experiences === 1 ? 'experience' : 'experiences'}
              </span>
              <i />
              <span>
                <b>{stats.hosts}</b> local {stats.hosts === 1 ? 'host' : 'hosts'}
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

      {/* ---------------------------- Categories ---------------------------- */}
      <section className="category-section">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">START EXPLORING</p>
            <h2>What are you curious about?</h2>
          </div>

          <Link href="/experiences">
            Browse all hobbies <Icon name="arrow" size={17} />
          </Link>
        </div>

        <div className="category-grid">
          {CATEGORIES.map(({ name, glyph }) => (
            <Link key={name} className="category-card" href={`/experiences?category=${name}`}>
              <span>{glyph}</span>
              <b>{name}</b>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------ Coming up soon ---------------------------- */}
      <section className="experiences-section" id="experiences">
        <div className="section-heading">
          <div>
            <p className="eyebrow">COMING UP</p>
            <h2>Happening soon</h2>
            <p>Small-group experiences hosted by people who love what they do.</p>
          </div>

          <Link href="/experiences">
            View all experiences <Icon name="arrow" size={17} />
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="experience-grid">
            {featured.map((experience, index) => (
              <ExperienceCard key={experience.id} experience={experience} priority={index === 0} />
            ))}
          </div>
        ) : (
          <p className="empty-note">New experiences are on their way. Check back soon.</p>
        )}
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

          <span className="button button-gold" aria-label="Community feature coming soon">
          Communities coming soon
          </span>
        </div>

        <div className="group-stack">
          <div className="group-card rotate-left">
            <div className="group-icon">♫</div>
            <div>
              <small>MUSIC</small>
              <b>Manila Weekend Jammers</b>
              <span>Jam sessions, gigs & good company</span>
            </div>
          </div>

          <div className="group-card">
            <div className="group-icon">◎</div>
            <div>
              <small>CRAFTS</small>
              <b>Clay & Coffee Club</b>
              <span>For potters at every stage</span>
            </div>
          </div>

          <div className="group-card rotate-right">
            <div className="group-icon">⌁</div>
            <div>
              <small>OUTDOORS</small>
              <b>Sunday Trail Society</b>
              <span>Slow hikes & new friends</span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------- Hosts ------------------------------ */}
      <section className="host-section" id="partner">
        <div className="host-image">
          <Image
            src={PHOTOS.host}
            alt="Local creative preparing a workshop"
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
          />
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

          <Link className="button button-dark" href="/login">
            Become a Hilig host <Icon name="arrow" size={18} />
          </Link>
        </div>
      </section>
    </>
  )
}
