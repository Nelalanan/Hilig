
import { cache } from 'react'
import { getSupabase } from './supabase'

export type CommunityGroup = {
  id: string
  slug: string
  name: string
  description: string
  interests: string[]
  imageUrl: string | null
  location: string | null
  creatorId: string
  creatorName: string
  createdAt: string
}

type GroupRow = {
  id: string
  slug: string
  name: string
  description: string
  interests: string[] | null
  image_url: string | null
  location: string | null
  creator_id: string
  created_at: string
  creator: { full_name: string | null } | null
}

const GROUP_SELECT = `
  id, slug, name, description, interests, image_url, location,
  creator_id, created_at,
  creator:profiles!community_groups_creator_id_fkey(full_name)
`

function mapGroup(row: GroupRow): CommunityGroup {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    interests: row.interests ?? [],
    imageUrl: row.image_url,
    location: row.location,
    creatorId: row.creator_id,
    creatorName: row.creator?.full_name?.trim() || 'Community member',
    createdAt: row.created_at,
  }
}

const loadPublishedGroups = cache(async (): Promise<CommunityGroup[]> => {
  const supabase = getSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('community_groups')
    .select(GROUP_SELECT)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[hilig] Could not load community groups:', error.message)
    return []
  }

  return ((data ?? []) as unknown as GroupRow[]).map(mapGroup)
})

export async function getCommunityGroups(filters: {
  q?: string
  interest?: string
} = {}): Promise<CommunityGroup[]> {
  const groups = await loadPublishedGroups()
  const query = filters.q?.trim().toLowerCase().slice(0, 100) ?? ''

  return groups.filter((group) => {
    const text = [
      group.name,
      group.description,
      group.location ?? '',
      group.creatorName,
      ...group.interests,
    ].join(' ').toLowerCase()

    return (
      (!query || query.split(/\s+/).filter(Boolean).every((term) => text.includes(term))) &&
      (!filters.interest || group.interests.includes(filters.interest))
    )
  })
}

export async function getCommunityGroupBySlug(
  slug: string,
): Promise<CommunityGroup | null> {
  const groups = await loadPublishedGroups()
  return groups.find((group) => group.slug === slug) ?? null
}

export async function getCommunityInterests(): Promise<string[]> {
  const groups = await getCommunityGroups()
  return [...new Set(groups.flatMap((group) => group.interests))]
    .sort((a, b) => a.localeCompare(b))
}


import { createClient } from '@/lib/supabase/server'

export type ManagedCommunityGroup = CommunityGroup & {
  status: 'draft' | 'published' | 'archived'
}

export async function getMyCommunityGroups(): Promise<ManagedCommunityGroup[]> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('community_groups')
    .select(GROUP_SELECT + ', status')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Hilig] Could not load your communities:', error.message)
    return []
  }

  return ((data ?? []) as unknown as (GroupRow & {
    status: ManagedCommunityGroup['status']
  })[]).map((row) => ({
    ...mapGroup(row),
    status: row.status,
  }))
}

export async function getMyCommunityGroupBySlug(
  slug: string,
): Promise<ManagedCommunityGroup | null> {
  const groups = await getMyCommunityGroups()
  return groups.find((group) => group.slug === slug) ?? null
}
