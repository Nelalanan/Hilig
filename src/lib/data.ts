import { cache } from 'react'
import { isCategory, type Category } from './categories'
import { seedExperiences } from './seed'
import { getSupabase } from './supabase'
import type { Experience, SortKey } from './types'

// Shape of one row coming back from Supabase (see supabase/schema.sql).
type ExperienceRow = {
  id: string
  slug: string
  title: string
  category: string
  tag: string | null
  description: string
  location: string
  price_php: number
  image_url: string | null
  duration_minutes: number
  includes: string[] | null
  rating_avg: number | string
  review_count: number
  host: { name: string } | null
  sessions: { id: string; starts_at: string; capacity: number; booked: number }[] | null
}

const SELECT = `
  id, slug, title, category, tag, description, location, price_php, image_url,
  duration_minutes, includes, rating_avg, review_count,
  host:hosts(name),
  sessions(id, starts_at, capacity, booked)
`

function compare(a: number, b: number): number {
  return a === b ? 0 : a < b ? -1 : 1
}

function mapRow(row: ExperienceRow): Experience | null {
  const category = row.category
  if (!isCategory(category)) return null

  const now = Date.now()
  const sessions = (row.sessions ?? [])
    .filter((s) => Date.parse(s.starts_at) > now)
    .map((s) => ({ id: s.id, startsAt: s.starts_at, capacity: s.capacity, booked: s.booked }))
    .sort((a, b) => compare(Date.parse(a.startsAt), Date.parse(b.startsAt)))

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category,
    tag: row.tag,
    description: row.description,
    hostName: row.host?.name ?? 'Hilig host',
    location: row.location,
    pricePhp: row.price_php,
    imageUrl: row.image_url,
    durationMinutes: row.duration_minutes,
    includes: row.includes ?? [],
    ratingAvg: Number(row.rating_avg),
    reviewCount: row.review_count,
    sessions,
  }
}

/**
 * Loads every published experience, from Supabase when it is configured and from the
 * built-in sample data when it is not. `cache` makes sure one request only loads once.
 *
 * Filtering and sorting below happen in memory, which is fine for a few hundred listings.
 * When the catalogue grows, move the filters into the query and add pagination.
 */
const loadAll = cache(async (): Promise<Experience[]> => {
  const supabase = getSupabase()
  if (!supabase) return seedExperiences()

  const { data, error } = await supabase.from('experiences').select(SELECT).eq('is_published', true)

  if (error) {
    console.error('[hilig] Could not load experiences from Supabase:', error.message)
    return []
  }

  return (data as unknown as ExperienceRow[])
    .map(mapRow)
    .filter((e): e is Experience => e !== null)
})

function nextStart(e: Experience): number {
  return e.sessions[0] ? Date.parse(e.sessions[0].startsAt) : Infinity
}

function sortExperiences(list: Experience[], sort: SortKey): Experience[] {
  const sorted = [...list]
  switch (sort) {
    case 'popular':
      return sorted.sort(
        (a, b) => compare(b.reviewCount, a.reviewCount) || compare(b.ratingAvg, a.ratingAvg) || compare(nextStart(a), nextStart(b)),
      )
    case 'price-asc':
      return sorted.sort((a, b) => compare(a.pricePhp, b.pricePhp))
    case 'price-desc':
      return sorted.sort((a, b) => compare(b.pricePhp, a.pricePhp))
    case 'soonest':
    default:
      return sorted.sort((a, b) => compare(nextStart(a), nextStart(b)))
  }
}

function searchText(e: Experience): string {
  return `${e.title} ${e.description} ${e.category} ${e.location} ${e.hostName}`.toLowerCase()
}

export async function getExperiences(
  filters: { q?: string; category?: Category; sort?: SortKey } = {},
): Promise<Experience[]> {
  const all = await loadAll()
  const terms = filters.q?.trim().toLowerCase().split(/\s+/).filter(Boolean) ?? []

  const matches = all.filter(
    (e) =>
      (!filters.category || e.category === filters.category) &&
      terms.every((term) => searchText(e).includes(term)),
  )

  return sortExperiences(matches, filters.sort ?? 'soonest')
}

export async function getExperienceBySlug(slug: string): Promise<Experience | null> {
  const all = await loadAll()
  return all.find((e) => e.slug === slug) ?? null
}

export async function getFeaturedExperiences(limit = 3): Promise<Experience[]> {
  const all = await loadAll()

  const available = all.filter((experience) =>
    experience.sessions.some(
      (session) =>
        session.capacity - session.booked > 0 &&
        Date.parse(session.startsAt) > Date.now(),
    ),
  )

  return sortExperiences(available, 'soonest').slice(0, limit)
}

export async function getAllSlugs(): Promise<string[]> {
  const all = await loadAll()
  return all.map((e) => e.slug)
}

export async function getSiteStats(): Promise<{ experiences: number; hosts: number }> {
  const all = await loadAll()
  return { experiences: all.length, hosts: new Set(all.map((e) => e.hostName)).size }
}
