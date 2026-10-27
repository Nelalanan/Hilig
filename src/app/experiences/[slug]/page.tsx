import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ExperiencePhoto from '@/components/ExperiencePhoto'
import BookingForm from '@/components/BookingForm'
import Icon from '@/components/Icon'
import { getAllSlugs, getExperienceBySlug } from '@/lib/data'
import {
  formatDuration,
  formatPrice,
  formatSessionLong,
  spotsLeft,
  truncate,
} from '@/lib/format'

// Pages for known experiences are built ahead of time, then refreshed in the
// background at most once a minute. A brand-new experience is built on first visit.
export const revalidate = 60

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const slugs = await getAllSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const experience = await getExperienceBySlug(slug)

  if (!experience) return { title: 'Experience not found' }

  const description = truncate(experience.description, 155)
  const images = experience.imageUrl ? [{ url: experience.imageUrl, alt: experience.title }] : undefined

  return {
    title: `${experience.title} in ${experience.location}`,
    description,
    openGraph: { title: experience.title, description, type: 'website', images },
    twitter: { card: images ? 'summary_large_image' : 'summary', title: experience.title, description },
  }
}

export default async function ExperienceDetailPage({ params }: Props) {
  const { slug } = await params
  const experience = await getExperienceBySlug(slug)

  if (!experience) notFound()

  const nextSession = experience.sessions[0]
  const next = nextSession ? formatSessionLong(nextSession.startsAt) : null

  return (
    <div className="detail">
      <div className="detail-inner">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/experiences">Explore</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/experiences?category=${experience.category}`}>{experience.category}</Link>
        </nav>

        <div className="detail-layout">
          <div>
            <div className="detail-photo">
              <ExperiencePhoto experience={experience} priority sizes="(max-width: 900px) 100vw, 780px" />
            </div>

            <p className="card-type">{experience.category.toUpperCase()}</p>
            <h1 className="detail-title">{experience.title}</h1>

            <div className="detail-meta">
<span>
  <Icon name="users" size={17} />
  Hosted by{' '}
  {experience.hostId ? (
    <Link
      href={`/hosts/${experience.hostId}`}
      className="host-name-link"
    >
      {experience.hostName}
    </Link>
  ) : (
    experience.hostName
  )}
</span>
              <span>
                <Icon name="pin" size={17} />
                {experience.location}
              </span>
              <span>
                <Icon name="clock" size={17} />
                {formatDuration(experience.durationMinutes)}
              </span>
              {experience.reviewCount > 0 && (
                <span>
                  <Icon name="star" size={17} />
                  {experience.ratingAvg.toFixed(1)} ({experience.reviewCount} reviews)
                </span>
              )}
            </div>

            <section className="detail-section">
              <h2>About this experience</h2>
              <p>{experience.description}</p>
            </section>

            {experience.includes.length > 0 && (
              <section className="detail-section">
                <h2>What’s included</h2>
                <ul className="included-list">
                  {experience.includes.map((item) => (
                    <li key={item}>
                      <Icon name="check" size={18} />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="detail-section" id="sessions">
              <h2>Upcoming sessions</h2>

              {experience.sessions.length > 0 ? (
                <div className="session-list">
                  {experience.sessions.map((session) => {
                    const when = formatSessionLong(session.startsAt)
                    const left = spotsLeft(session)

                    return (
                      <div className="session-row" key={session.id}>
                        <div>
                          <b>{when.day}</b>
                          <small>{when.time}</small>
                        </div>

                        <span className={left === 0 ? 'spots full' : left <= 3 ? 'spots low' : 'spots'}>
                          {left === 0 ? 'Sold out' : left <= 3 ? `Only ${left} left` : `${left} spots left`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p>No dates are scheduled yet. Check back soon.</p>
              )}
            </section>
          </div>
            <aside className="booking-panel">
              <BookingForm
              sessions={experience.sessions}
              pricePhp={experience.pricePhp}
              onlinePaymentEnabled={experience.onlinePaymentEnabled}
              cashPaymentEnabled={experience.cashPaymentEnabled}
              cashPaymentInstructions={experience.cashPaymentInstructions}
              />
        </aside>
        </div>
      </div>
    </div>
  )
}
