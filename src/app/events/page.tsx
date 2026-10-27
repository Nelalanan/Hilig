
import type { Metadata } from 'next'
import Link from 'next/link'
import Icon from '@/components/Icon'
import EventCard from '@/components/EventCard'
import { getEventCategories, getEvents } from '@/lib/events'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  }).format(new Date(value))
}

function eventHref(event: { slug: string }): string {
  return `/events/${encodeURIComponent(event.slug)}`
}

export const metadata: Metadata = {
  title: 'Events | Hilig',
  description:
    'Discover upcoming local events, creative meetups, and community gatherings on Hilig.',
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const q = (first(sp.q) ?? '').trim().slice(0, 100)
  const requestedCategory = first(sp.category)

  const [events, categories] = await Promise.all([
    getEvents({ q, category: requestedCategory }),
    getEventCategories(),
  ])

  const selectedCategory = categories.includes(requestedCategory ?? '')
    ? requestedCategory
    : undefined

  // Re-run with a validated category so invalid query values are ignored.
  const results = selectedCategory === requestedCategory
    ? events
    : selectedCategory
      ? await getEvents({ q, category: selectedCategory })
      : await getEvents({ q })

  function categoryHref(category?: string) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (category) params.set('category', category)

    const query = params.toString()
    return query ? `/events?${query}` : '/events'
  }

  return (
    <>
      <section className="page-banner">
        <div className="page-banner-inner">
          <p className="eyebrow light">HILIG COMMUNITY</p>
          <h1 className="page-title">Discover events</h1>
          <p className="hero-lead">
            Find something happening near you, meet new people, and share
            experiences together.
          </p>

          <form className="search-box" action="/events" method="get">
            <div className="search-field">
              <Icon name="search" />
              <input
                name="q"
                defaultValue={q}
                aria-label="Search events"
                placeholder="Search events, places, or hosts..."
              />
            </div>

            {selectedCategory && (
              <input
                type="hidden"
                name="category"
                value={selectedCategory}
              />
            )}

            <button
              type="submit"
              className="search-submit"
              aria-label="Search"
            >
              <Icon name="arrow" />
            </button>
          </form>
        </div>
      </section>

      <section className="listing">
        <div className="listing-inner">
          <nav className="chip-row" aria-label="Filter events by category">
            <Link
              href={categoryHref()}
              className={!selectedCategory ? 'chip active' : 'chip'}
            >
              All events
            </Link>

            {categories.map((category) => (
              <Link
                key={category}
                href={categoryHref(category)}
                className={
                  selectedCategory === category ? 'chip active' : 'chip'
                }
              >
                {category}
              </Link>
            ))}
          </nav>

          <div className="results-bar">
            <span>
              {results.length} {results.length === 1 ? 'event' : 'events'}
            </span>
          </div>

          {results.length > 0 ? (
            <div className="experience-grid">
              {results.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>No upcoming events found</h2>
              <p>
                Try another search or category. Check back later for new
                events from the Hilig community.
              </p>
              <Link className="button button-dark" href="/events">
                See all events
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
