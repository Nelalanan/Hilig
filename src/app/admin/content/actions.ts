'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function reviewHostContent(formData: FormData) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login?next=%2Fadmin%2Fcontent')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') redirect('/?error=forbidden')
  const table = String(formData.get('table') ?? '')
  const id = String(formData.get('id') ?? '')
  const decision = String(formData.get('decision') ?? '')
  const feedback = String(formData.get('feedback') ?? '').trim().slice(0, 2000)
  if (!id || !['experiences', 'events', 'community_groups'].includes(table) || !['approve', 'changes_requested', 'reject'].includes(decision)) redirect('/admin/content?error=invalid')
  const admin = createAdminClient()
  const approval_status = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'changes_requested'
  const payload: Record<string, unknown> = { approval_status, admin_feedback: feedback || null }
  if (table === 'experiences') payload.is_published = decision === 'approve'
  if (table === 'events') payload.status = decision === 'approve' ? 'published' : 'draft'
  if (table === 'community_groups') payload.status = decision === 'approve' ? 'published' : 'draft'
  const { error: updateError } = await admin.from(table).update(payload).eq('id', id)
  if (updateError) { console.error('[Hilig] content review failed:', updateError.code); redirect('/admin/content?error=update') }
  revalidatePath('/admin/content'); revalidatePath('/admin/submissions'); revalidatePath('/experiences'); revalidatePath('/events'); revalidatePath('/community'); revalidatePath('/host/dashboard')
  redirect('/admin/content?notice=saved')
}
