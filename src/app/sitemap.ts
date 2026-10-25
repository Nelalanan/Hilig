import type { MetadataRoute } from 'next'
import { getAllSlugs } from '@/lib/data'
import { siteUrl } from '@/lib/site'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const slugs = await getAllSlugs()

  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/experiences`, changeFrequency: 'daily', priority: 0.9 },
    ...slugs.map((slug) => ({
      url: `${base}/experiences/${slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  ]
}
