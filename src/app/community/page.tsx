
import type { Metadata } from 'next'
import Link from 'next/link'
import Icon from '@/components/Icon'
import CommunityCard from '@/components/CommunityCard'
import {
  getCommunityGroups,
  getCommunityInterests,
} from '@/lib/community'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export const metadata: Metadata = {
  title: 'Community | Hilig',
  description:
    'Find people who share your interests and discover communities on Hilig.',
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const q = (first(params.q) ?? '').trim().slice(0, 100)
  const requestedInterest = first(params.interest)

  const [allInterests, groups] = await Promise.all([
    getCommunityInterests(),
    getCommunityGroups({ q }),
  ])

  const interest = allInterests.includes(requestedInterest ?? '')
    ? requestedInterest
    : undefined

  const results = interest
    ? groups.filter((group) => group.interests.includes(interest))
    : groups

  function filterHref(value?: string) {
    const query = new URLSearchParams()
    if (q) query.set('q', q)
    if (value) query.set('interest', value)
    const suffix = query.toString()
    return suffix ? `/community?${suffix}` : '/community'
  }

  return (
    <>
      <section className="page-banner">
        <div className="page-banner-inner">
          <p className="eyebrow light">FIND YOUR PEOPLE</p>
          <h1 className="page-title">Hilig Community</h1>
          <p className="hero-lead">
            Meet people who share your interests, learn together, and
            turn shared hobbies into real connections.
          </p>

          <div className="community-banner-actions">
            <Link className="button button-light" href="/community/create">
              Create a community
            </Link>

            <Link
              className="button button-light-outline"
              href="/my-communities"
            >
              My communities
            </Link>
          </div>

          <form className="search-box" action="/community" method="get">
            <div className="search-field">
              <Icon name="search" />
              <input
                name="q"
                defaultValue={q}
                aria-label="Search communities"
                placeholder="Search communities or interests..."
              />
            </div>

            {interest && (
              <input type="hidden" name="interest" value={interest} />
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
          <nav className="chip-row" aria-label="Filter by interest">
            <Link
              href={filterHref()}
              className={!interest ? 'chip active' : 'chip'}
            >
              All communities
            </Link>

            {allInterests.map((item) => (
              <Link
                key={item}
                href={filterHref(item)}
                className={interest === item ? 'chip active' : 'chip'}
              >
                {item}
              </Link>
            ))}
          </nav>

          <div className="results-bar">
            <span>
              {results.length}{' '}
              {results.length === 1 ? 'community' : 'communities'}
            </span>
          </div>

          {results.length > 0 ? (
            <div className="experience-grid">
              {results.map((group) => (
                <CommunityCard key={group.id} group={group} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>No communities found yet</h2>
              <p>
                Try a different search or interest. New communities may
                appear as more people join Hilig.
              </p>
              <Link className="button button-dark" href="/community">
                Browse all communities
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
