
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEventBySlug } from '@/lib/events'

type Props = {
  params: Promise<{ slug: string }>
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  }).format(new Date(value))
}

function formatPrice(price: number): string {
  return price === 0 ? 'Free' : `₱${price.toLocaleString('en-PH')} per person`
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug)

  if (!event) {
    return { title: 'Event not found | Hilig' }
  }

  return {
    title: `${event.title} | Hilig`,
    description: event.description.slice(0, 160),
  }
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params
  const event = await getEventBySlug(slug)

  if (!event) notFound()

  const spotsLeft =
    event.capacity === null ? null : Math.max(event.capacity, 0)

  return (
    <main className="event-detail">
      <div className="event-detail-inner">
        <Link href="/events" className="back-link">
          ← Back to events
        </Link>

        {event.imageUrl && (
          <img
            className="event-detail-image"
            src={event.imageUrl}
            alt={event.title}
          />
        )}

        <div className="event-detail-layout">
          <article className="event-detail-main">
            {event.category && (
              <p className="eyebrow">{event.category}</p>
            )}

            <h1 className="page-title">{event.title}</h1>

            <p className="event-detail-host">
              Hosted by <strong>{event.hostName}</strong>
            </p>
            {event.hostOwnerId && (
              <Link className="button button-outline small" href={`/messages/new?to=${encodeURIComponent(event.hostOwnerId)}&subject=${encodeURIComponent(`Question about ${event.title}`)}`}>
                Message host
              </Link>
            )}

            <section className="event-detail-section">
              <h2>About this event</h2>
              <p className="event-detail-description">
                {event.description}
              </p>
            </section>

            <section className="event-detail-section">
              <h2>When</h2>
              <p>{formatDate(event.startsAt)}</p>

              {event.endsAt && (
                <p>Ends {formatDate(event.endsAt)}</p>
              )}
            </section>

            <section className="event-detail-section">
              <h2>Where</h2>
              <p>{event.location}</p>
            </section>

            {event.experienceSlug && event.experienceTitle && (
              <section className="event-detail-section">
                <h2>Related experience</h2>
                <p>{event.experienceTitle}</p>
                <Link
                  className="button button-dark"
                  href={`/experiences/${encodeURIComponent(event.experienceSlug)}`}
                >
                  View experience
                </Link>
              </section>
            )}
            {event.groupSlug && event.groupName && (
              <section className="event-detail-section">
                <h2>Community</h2>
                <p>This event is connected to {event.groupName}.</p>
                <Link className="button button-dark" href={`/community/${encodeURIComponent(event.groupSlug)}`}>
                  View community
                </Link>
              </section>
            )}
          </article>

          <aside className="event-detail-booking">
            <p className="eyebrow">EVENT DETAILS</p>

            <p className="event-detail-price">
              {formatPrice(event.pricePhp)}
            </p>

            <p>{formatDate(event.startsAt)}</p>
            <p>{event.location}</p>

            {spotsLeft !== null && (
              <p>
                Capacity: {spotsLeft} {spotsLeft === 1 ? 'person' : 'people'}
              </p>
            )}

            <p className="event-booking-note">
              Online event registration is coming soon. Contact the host
              for participation details.
            </p>

            <Link
              className="button button-dark"
              href="/login"
            >
              Sign in to get started
            </Link>
          </aside>
        </div>
      </div>
    </main>
  )
}
