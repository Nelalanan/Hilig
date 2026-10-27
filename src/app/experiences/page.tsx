import type { Metadata } from 'next'
import Link from 'next/link'
import ExperienceCard from '@/components/ExperienceCard'
import Icon from '@/components/Icon'
import { CATEGORIES, isCategory, type Category } from '@/lib/categories'
import { getExperiences } from '@/lib/data'
import { isSortKey, SORT_OPTIONS, type SortKey } from '@/lib/types'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const DEFAULT_SORT: SortKey = 'soonest'

// A query-string value can be repeated (?q=a&q=b), so always take the first.
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

async function readFilters(searchParams: SearchParams) {
  const sp = await searchParams
  const q = (first(sp.q) ?? '').trim().slice(0, 100)
  const categoryParam = first(sp.category)
  const sortParam = first(sp.sort)

  return {
    q,
    category: isCategory(categoryParam) ? categoryParam : undefined,
    sort: isSortKey(sortParam) ? sortParam : DEFAULT_SORT,
  }
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { q, category } = await readFilters(searchParams)

  return {
    title: category ? `${category} experiences` : 'Explore experiences',
    description: category
      ? `Book small-group ${category.toLowerCase()} experiences hosted by locals.`
      : 'Browse hobby experiences hosted by locals: pottery, painting, cooking, music and more.',
    // Every possible search phrase is its own URL; keep those out of Google.
    robots: q ? { index: false, follow: true } : undefined,
  }
}

export default async function ExperiencesPage({ searchParams }: { searchParams: SearchParams }) {
  const { q, category, sort } = await readFilters(searchParams)
  const results = await getExperiences({ q, category, sort })

  // Builds a link to this page with some filters changed and the rest kept.
  const hrefWith = (changes: { category?: Category | null; sort?: SortKey }) => {
    const next = {
      q,
      category: changes.category === undefined ? category : (changes.category ?? undefined),
      sort: changes.sort ?? sort,
    }
    const params = new URLSearchParams()
    if (next.q) params.set('q', next.q)
    if (next.category) params.set('category', next.category)
    if (next.sort !== DEFAULT_SORT) params.set('sort', next.sort)
    const query = params.toString()
    return query ? `/experiences?${query}` : '/experiences'
  }

  const heading = category ? `${category} experiences` : 'Explore experiences'

  return (
    <>
      <section className="page-banner">
        <div className="page-banner-inner">
          <h1 className="page-title">{heading}</h1>
          <p className="hero-lead">
            {q ? (
              <>
                Results for “{q}”
              </>
            ) : (
              'Small-group classes and meetups hosted by people who love what they do.'
            )}
          </p>

          <form className="search-box" action="/experiences" method="get">
            <div className="search-field">
              <Icon name="search" />
              <input
                name="q"
                defaultValue={q}
                aria-label="Search experiences"
                placeholder="What would you like to try?"
              />
            </div>

            {category && <input type="hidden" name="category" value={category} />}
            {sort !== DEFAULT_SORT && <input type="hidden" name="sort" value={sort} />}

            <button type="submit" className="search-submit" aria-label="Search">
              <Icon name="arrow" />
            </button>
          </form>
        </div>
      </section>

      <section className="listing">
        <div className="listing-inner">
          <div className="chip-row" aria-label="Filter by category">
            <Link href={hrefWith({ category: null })} className={category ? 'chip' : 'chip active'}>
              All
            </Link>
            {CATEGORIES.map((c) => (
              <Link
                key={c.name}
                href={hrefWith({ category: c.name })}
                className={category === c.name ? 'chip active' : 'chip'}
              >
                {c.name}
              </Link>
            ))}
          </div>

          <div className="results-bar">
            <span>
              {results.length} {results.length === 1 ? 'experience' : 'experiences'}
            </span>

            <div className="sort-links" aria-label="Sort results">
              <span>Sort by</span>
              {SORT_OPTIONS.map((option) => (
                <Link
                  key={option.key}
                  href={hrefWith({ sort: option.key })}
                  className={sort === option.key ? 'active' : undefined}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>

          {results.length > 0 ? (
            <div className="experience-grid">
              {results.map((experience, index) => (
                <ExperienceCard key={experience.id} experience={experience} priority={index < 3} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>Nothing matched yet</h2>
              <p>Try a different word, or browse everything.</p>
              <Link className="button button-dark" href="/experiences">
                See all experiences
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
