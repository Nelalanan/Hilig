import type { Category } from './categories'

export type Session = {
  id: string
  startsAt: string // ISO timestamp
  capacity: number
  booked: number
}

export type Experience = {
  id: string
  slug: string
  title: string
  category: Category
  tag: string | null
  description: string
  hostName: string
  location: string
  pricePhp: number // whole pesos. Multiply by 100 for PayMongo (it expects centavos).
  imageUrl: string | null
  durationMinutes: number
  includes: string[]
  ratingAvg: number
  reviewCount: number
  sessions: Session[] // upcoming only, soonest first
}

export type SortKey = 'soonest' | 'popular' | 'price-asc' | 'price-desc'

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'soonest', label: 'Soonest' },
  { key: 'popular', label: 'Most reviewed' },
  { key: 'price-asc', label: 'Price: low to high' },
  { key: 'price-desc', label: 'Price: high to low' },
]

export function isSortKey(value: string | undefined): value is SortKey {
  return SORT_OPTIONS.some((o) => o.key === value)
}
