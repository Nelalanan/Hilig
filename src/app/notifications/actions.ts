'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function markNotificationRead(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=%2Fnotifications')
  const id = String(formData.get('id') ?? '')
  const { data: notification } = await supabase.from('in_app_notifications').select('id,href').eq('id', id).eq('user_id', user.id).maybeSingle()
  if (!notification) redirect('/notifications?error=not-found')
  await createAdminClient().from('in_app_notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id)
  revalidatePath('/notifications')
  if (notification.href && notification.href.startsWith('/') && !notification.href.startsWith('//')) redirect(notification.href)
  redirect('/notifications')
}

export async function markAllNotificationsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=%2Fnotifications')
  await createAdminClient().from('in_app_notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null)
  revalidatePath('/notifications')
  redirect('/notifications')
}
