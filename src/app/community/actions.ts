
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type CommunityStatus = 'draft' | 'published' | 'archived'
type CommunityIntent = 'draft' | 'publish'

function field(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
}

function readCommunity(formData: FormData) {
  const name = field(formData, 'name')
  const description = field(formData, 'description')
  const location = field(formData, 'location')
  const imageUrl = field(formData, 'image_url')
  const rawInterests = field(formData, 'interests')
  const interests = rawInterests
    ? rawInterests.split(',').map((item) => item.trim()).filter(Boolean)
    : []

  if (name.length < 3 || name.length > 80) {
    throw new Error('Name must be between 3 and 80 characters.')
  }

  if (description.length < 10 || description.length > 3000) {
    throw new Error('Description must be between 10 and 3000 characters.')
  }

  if (location.length > 120) {
    throw new Error('Location must be 120 characters or fewer.')
  }

  const slug = slugify(name)
  if (!slug) {
    throw new Error('Choose a name containing letters or numbers.')
  }

  if (imageUrl) {
    let parsed: URL

    try {
      parsed = new URL(imageUrl)
    } catch {
      throw new Error('Enter a valid image URL.')
    }

    if (!['https:', 'http:'].includes(parsed.protocol)) {
      throw new Error('Image URL must use HTTP or HTTPS.')
    }
  }

  if (interests.length > 10) {
    throw new Error('Choose no more than 10 interests.')
  }

  if (interests.some((item) => item.length > 40)) {
    throw new Error('Each interest must be 40 characters or fewer.')
  }

  return {
    name,
    description,
    location: location || null,
    image_url: imageUrl || null,
    interests,
    slug,
  }
}

function readIntent(formData: FormData): CommunityIntent {
  const intent = field(formData, 'intent')

  if (intent !== 'draft' && intent !== 'publish') {
    throw new Error('Choose whether to save a draft or publish.')
  }

  return intent
}

async function requireUser(nextPath = '/my-communities') {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`)
  }

  return { supabase, user }
}

function refreshCommunityPages(slug?: string) {
  revalidatePath('/community')
  revalidatePath('/my-communities')

  if (slug) {
    revalidatePath(`/community/${slug}`)
    revalidatePath(`/community/${slug}/edit`)
  }
}

function validationFailed(path: string): never {
  redirect(`${path}?error=validation`)
}

export async function createCommunity(formData: FormData) {
  const { supabase, user } = await requireUser('/community/create')

  let payload: ReturnType<typeof readCommunity>
  let intent: CommunityIntent

  try {
    payload = readCommunity(formData)
    intent = readIntent(formData)
  } catch {
    validationFailed('/community/create')
  }

  const status: CommunityStatus = 'draft'
  const approvalStatus = intent === 'publish' ? 'pending_review' : 'draft'

  const { data, error } = await supabase
    .from('community_groups')
    .insert({
      ...payload,
      creator_id: user.id,
      status,
      approval_status: approvalStatus,
    })
    .select('slug')
    .single()

  if (error || !data) {
    // Log only a safe, non-sensitive diagnostic.
    console.error('[Hilig] Create community failed:', error?.code)
    redirect(
      `/community/create?error=${
        error?.code === '23505' ? 'slug' : 'create'
      }`,
    )
  }

  refreshCommunityPages(data.slug)

  redirect(
    `/my-communities?notice=${intent === 'publish' ? 'published' : 'draft'}`,
  )
}

export async function updateCommunity(formData: FormData) {
  const id = field(formData, 'id')
  const currentSlug = field(formData, 'current_slug')

  if (!id || !currentSlug) {
    redirect('/my-communities')
  }

  const { supabase, user } = await requireUser(
    `/community/${currentSlug}/edit`,
  )

  const { data: existing, error: existingError } = await supabase
    .from('community_groups')
    .select('id, slug, status')
    .eq('id', id)
    .eq('creator_id', user.id)
    .maybeSingle()

  if (existingError || !existing) {
    redirect('/my-communities?error=not-owner')
  }

  let payload: ReturnType<typeof readCommunity>
  let intent: CommunityIntent | null

  try {
    payload = readCommunity(formData)

    const rawIntent = field(formData, 'intent')
    if (rawIntent === '') {
      intent = null
    } else {
      intent = readIntent(formData)
    }
  } catch {
    validationFailed(`/community/${encodeURIComponent(existing.slug)}/edit`)
  }

  const status: CommunityStatus = intent === 'publish' ? 'draft' : intent === 'draft' ? 'draft' : existing.status
  const approvalStatus = intent === 'publish' ? 'pending_review' : intent === 'draft' ? 'draft' : undefined

  const { data, error } = await supabase
    .from('community_groups')
    .update({ ...payload, status, ...(approvalStatus ? { approval_status: approvalStatus } : {}) })
    .eq('id', id)
    .eq('creator_id', user.id)
    .select('slug')
    .maybeSingle()

  if (error || !data) {
    console.error('[Hilig] Update community failed:', error?.code)
    redirect(
      `/community/${encodeURIComponent(existing.slug)}/edit?error=${
        error?.code === '23505' ? 'slug' : 'update'
      }`,
    )
  }

  refreshCommunityPages(existing.slug)
  refreshCommunityPages(data.slug)

  redirect('/my-communities?notice=updated')
}

export async function archiveCommunity(formData: FormData) {
  const id = field(formData, 'id')

  if (!id) {
    redirect('/my-communities')
  }

  const { supabase, user } = await requireUser()

  const { data, error } = await supabase
    .from('community_groups')
    .update({ status: 'archived' })
    .eq('id', id)
    .eq('creator_id', user.id)
    .in('status', ['draft', 'published'])
    .select('slug')
    .maybeSingle()

  if (error || !data) {
    console.error('[Hilig] Archive community failed:', error?.code)
    redirect('/my-communities?error=archive')
  }

  refreshCommunityPages(data.slug)
  redirect('/my-communities?notice=archived')
}

export async function deleteDraftCommunity(formData: FormData) {
  const id = field(formData, 'id')

  if (!id) {
    redirect('/my-communities')
  }

  const { supabase, user } = await requireUser()

  const { data, error } = await supabase
    .from('community_groups')
    .delete()
    .eq('id', id)
    .eq('creator_id', user.id)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle()

  if (error || !data) {
    console.error('[Hilig] Delete draft failed:', error?.code)
    redirect('/my-communities?error=delete')
  }

  refreshCommunityPages()
  redirect('/my-communities?notice=deleted')
}
