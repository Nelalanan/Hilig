
import { cache } from 'react'
import { getSupabase } from './supabase'

export type HiligEvent = {
  id: string
  slug: string
  title: string
  description: string
  category: string | null
  location: string
  imageUrl: string | null
  startsAt: string
  endsAt: string | null
  capacity: number | null
  pricePhp: number
  status: 'draft' | 'published' | 'cancelled' | 'completed'
  hostId: string
  hostName: string
  hostOwnerId: string | null
  experienceSlug: string | null
  experienceTitle: string | null
  groupSlug: string | null
  groupName: string | null
}

type EventRow = {
  id: string
  slug: string
  title: string
  description: string
  category: string | null
  location: string
  image_url: string | null
  starts_at: string
  ends_at: string | null
  capacity: number | null
  price_php: number
  status: HiligEvent['status']
  host_id: string
  host: { name: string; owner_id: string | null } | null
  experience: { slug: string; title: string } | null
  group: { slug: string; name: string } | null
}

const EVENT_SELECT = `
  id, slug, title, description, category, location, image_url,
  starts_at, ends_at, capacity, price_php, status, host_id,
  host:hosts(name, owner_id),
  experience:experiences(slug, title),
  group:community_groups(slug, name)
`

function mapEvent(row: EventRow): HiligEvent {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category,
    location: row.location,
    imageUrl: row.image_url,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    capacity: row.capacity,
    pricePhp: row.price_php,
    status: row.status,
    hostId: row.host_id,
    hostName: row.host?.name ?? 'Hilig host',
    hostOwnerId: row.host?.owner_id ?? null,
    experienceSlug: row.experience?.slug ?? null,
    experienceTitle: row.experience?.title ?? null,
    groupSlug: row.group?.slug ?? null,
    groupName: row.group?.name ?? null,
  }
}

const loadPublishedEvents = cache(async (): Promise<HiligEvent[]> => {
  const supabase = getSupabase()

  if (!supabase) return []

  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('status', 'published')
    .eq('approval_status', 'approved')
    .order('starts_at', { ascending: true })

  if (error) {
    console.error('[hilig] Could not load events from Supabase:', error.message)
    return []
  }

  return ((data ?? []) as unknown as EventRow[]).map(mapEvent)
})

function matchesSearch(event: HiligEvent, query: string): boolean {
  const searchable = [
    event.title,
    event.description,
    event.category ?? '',
    event.location,
    event.hostName,
    event.experienceTitle ?? '',
  ]
    .join(' ')
    .toLowerCase()

  return query
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => searchable.includes(term))
}

export async function getEvents(filters: {
  q?: string
  category?: string
} = {}): Promise<HiligEvent[]> {
  const events = await loadPublishedEvents()
  const now = Date.now()
  const query = filters.q?.trim().toLowerCase().slice(0, 100) ?? ''

  return events.filter((event) => {
    const isUpcoming = Date.parse(event.startsAt) > now

    return (
      isUpcoming &&
      (!filters.category || event.category === filters.category) &&
      (!query || matchesSearch(event, query))
    )
  })
}

export async function getEventBySlug(
  slug: string,
): Promise<HiligEvent | null> {
  const events = await loadPublishedEvents()
  const event = events.find((item) => item.slug === slug)

  if (!event || Date.parse(event.startsAt) <= Date.now()) {
    return null
  }

  return event
}

export async function getEventCategories(): Promise<string[]> {
  const events = await getEvents()

  return [...new Set(
    events
      .map((event) => event.category)
      .filter((category): category is string => Boolean(category)),
  )].sort((a, b) => a.localeCompare(b))
}
