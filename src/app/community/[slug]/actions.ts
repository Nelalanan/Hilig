
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function joinCommunity(formData: FormData) {
  const slug = String(formData.get('slug') ?? '')

  if (!slug) redirect('/community')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/community/${slug}`)}`)
  }

  const { data: group, error: groupError } = await supabase
    .from('community_groups')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (groupError || !group) {
    redirect(`/community/${encodeURIComponent(slug)}?membershipError=1`)
  }

  const { error } = await supabase.from('group_memberships').insert({
    group_id: group.id,
    user_id: user.id,
  })

  // A user who already joined should still see the joined state.
  if (error && error.code !== '23505') {
    redirect(`/community/${encodeURIComponent(slug)}?membershipError=1`)
  }

  revalidatePath(`/community/${slug}`)
  revalidatePath('/community')

  redirect(`/community/${encodeURIComponent(slug)}?membership=joined`)
}

export async function leaveCommunity(formData: FormData) {
  const slug = String(formData.get('slug') ?? '')

  if (!slug) redirect('/community')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/community/${slug}`)}`)
  }

  const { data: group, error: groupError } = await supabase
    .from('community_groups')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (groupError || !group) {
    redirect(`/community/${encodeURIComponent(slug)}?membershipError=1`)
  }

  const { error } = await supabase
    .from('group_memberships')
    .delete()
    .eq('group_id', group.id)
    .eq('user_id', user.id)

  if (error) {
    redirect(`/community/${encodeURIComponent(slug)}?membershipError=1`)
  }

  revalidatePath(`/community/${slug}`)
  revalidatePath('/community')

  redirect(`/community/${encodeURIComponent(slug)}?membership=left`)
}
