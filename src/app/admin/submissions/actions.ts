'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type TableName = 'contact_inquiries' | 'partnership_applications'
const statuses: Record<TableName, string[]> = {
  contact_inquiries: ['pending', 'in_review', 'responded', 'closed'],
  partnership_applications: ['pending', 'in_review', 'approved', 'rejected', 'closed'],
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login?next=%2Fadmin%2Fsubmissions')
  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profileError || profile?.role !== 'admin') redirect('/?error=forbidden')
  return user
}

export async function updateSubmission(formData: FormData) {
  const user = await requireAdmin()
  const table = String(formData.get('table') ?? '') as TableName
  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  const response = String(formData.get('admin_response') ?? '').trim()

  if (!Object.hasOwn(statuses, table) || !id || !statuses[table].includes(status) || response.length > 10000) {
    redirect('/admin/submissions?error=invalid')
  }

  const isResponded = status === 'responded' || status === 'approved' || status === 'rejected'
  const admin = createAdminClient()
  const { data: prior, error: priorError } = await admin.from(table).select('user_id').eq('id', id).maybeSingle()
  if (priorError || !prior) redirect('/admin/submissions?error=not-found')
  const { error } = await admin.from(table).update({
    status,
    admin_response: response || null,
    responded_at: isResponded ? new Date().toISOString() : null,
    responded_by: isResponded ? user.id : null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) {
    console.error('[Hilig] Admin submission update failed:', error.code)
    redirect('/admin/submissions?error=update')
  }

  if (prior.user_id) {
    const title = table === 'contact_inquiries' ? 'Your contact inquiry was updated' : 'Your partnership application was updated'
    await admin.from('in_app_notifications').insert({
      user_id: prior.user_id,
      actor_id: user.id,
      notification_type: 'submission_updated',
      title,
      body: `Current status: ${status.replaceAll('_', ' ')}${response ? `. Response: ${response.slice(0, 400)}` : ''}`,
      href: '/account',
    })
  }
  revalidatePath('/admin/submissions')
  redirect('/admin/submissions?notice=saved')
}
