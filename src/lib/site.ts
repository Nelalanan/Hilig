export const SITE_NAME = 'Hilig'

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

// Marketing photos used outside the database.
export const PHOTOS = {
  hero: 'https://images.unsplash.com/photo-1560831340-b9679dc9e9f0?auto=format&fit=crop&w=1400&q=80',
  host: 'https://images.unsplash.com/photo-1619194999378-762462c38ab4?auto=format&fit=crop&w=1100&q=80',
}
