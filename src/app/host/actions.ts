'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isCategory } from '@/lib/categories'

function value(form: FormData, key: string) { return String(form.get(key) ?? '').trim() }
function slugify(input: string) { return input.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) }

async function requireHost() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login?next=%2Fhost%2Fdashboard')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'host') redirect('/become-a-host')
  const admin = createAdminClient()
  const { data: host, error: hostError } = await admin.from('hosts').select('id').eq('owner_id', user.id).maybeSingle()
  if (hostError || !host) redirect('/become-a-host?error=host-profile')
  return { user, host, admin }
}

export async function createHostExperience(formData: FormData) {
  const { host, admin } = await requireHost()
  const title = value(formData, 'title')
  const category = value(formData, 'category')
  const description = value(formData, 'description')
  const location = value(formData, 'location')
  const price = Number(value(formData, 'price_php'))
  const duration = Number(value(formData, 'duration_minutes'))
  const capacity = Number(value(formData, 'capacity'))
  const startsAtRaw = value(formData, 'starts_at')
  const imageUrl = value(formData, 'image_url')
  const includes = value(formData, 'includes').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 20)
  const online = formData.get('online_payment_enabled') === 'on'
  const cash = formData.get('cash_payment_enabled') === 'on'
  const cashInstructions = value(formData, 'cash_payment_instructions')
  const intent = value(formData, 'intent') === 'submit' ? 'pending_review' : 'draft'
  if (title.length < 3 || title.length > 120 || !isCategory(category) || description.length < 20 || description.length > 5000 || !location || location.length > 160 || !Number.isInteger(price) || price < 0 || price > 1000000 || !Number.isInteger(duration) || duration < 15 || duration > 1440 || !Number.isInteger(capacity) || capacity < 1 || capacity > 500 || !startsAtRaw || (price > 0 && !online && !cash)) redirect('/host/experiences/new?error=validation')
  if (imageUrl) { try { if (!['http:', 'https:'].includes(new URL(imageUrl).protocol)) throw new Error() } catch { redirect('/host/experiences/new?error=image') } }
  const slug = `${slugify(title)}-${crypto.randomUUID().slice(0, 8)}`
  const { data: experience, error } = await admin.from('experiences').insert({
    host_id: host.id, slug, title, category, tag: null, description, location,
    price_php: price, image_url: imageUrl || null, duration_minutes: duration, includes,
    is_published: false, approval_status: intent, online_payment_enabled: price > 0 ? online : false,
    cash_payment_enabled: price > 0 ? cash : false, cash_payment_instructions: cashInstructions || null,
  }).select('id').single()
  if (error || !experience) { console.error('[Hilig] host experience insert failed:', error?.code); redirect('/host/experiences/new?error=create') }
  const startsAt = new Date(startsAtRaw)
  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
    await admin.from('experiences').delete().eq('id', experience.id).eq('host_id', host.id)
    redirect('/host/experiences/new?error=date')
  }
  const { error: sessionError } = await admin.from('sessions').insert({ experience_id: experience.id, starts_at: startsAt.toISOString(), capacity, booked: 0 })
  if (sessionError) {
    await admin.from('experiences').delete().eq('id', experience.id).eq('host_id', host.id)
    console.error('[Hilig] host session insert failed:', sessionError.code)
    redirect('/host/experiences/new?error=session')
  }
  revalidatePath('/host/dashboard'); revalidatePath('/experiences')
  redirect(`/host/dashboard?created=experience&status=${intent}`)
}

export async function createHostEvent(formData: FormData) {
  const { host, admin } = await requireHost()
  const title = value(formData, 'title'), description = value(formData, 'description'), location = value(formData, 'location')
  const startsAtRaw = value(formData, 'starts_at'), endsAtRaw = value(formData, 'ends_at'), category = value(formData, 'category')
  const price = Number(value(formData, 'price_php') || '0'), capacityRaw = value(formData, 'capacity'), imageUrl = value(formData, 'image_url')
  const intent = value(formData, 'intent') === 'submit' ? 'pending_review' : 'draft'
  if (title.length < 3 || title.length > 120 || description.length < 20 || !location || !startsAtRaw || !Number.isFinite(price) || price < 0 || (price > 0 && formData.get('online_payment_enabled') !== 'on' && formData.get('cash_payment_enabled') !== 'on')) redirect('/host/events/new?error=validation')
  const startsAt = new Date(startsAtRaw), endsAt = endsAtRaw ? new Date(endsAtRaw) : null
  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date() || (endsAt && endsAt <= startsAt)) redirect('/host/events/new?error=date')
  const { error } = await admin.from('events').insert({ host_id: host.id, slug: `${slugify(title)}-${crypto.randomUUID().slice(0, 8)}`, title, description, category: category || null, location, image_url: imageUrl || null, starts_at: startsAt.toISOString(), ends_at: endsAt?.toISOString() ?? null, capacity: capacityRaw ? Number(capacityRaw) : null, price_php: price, status: 'draft', approval_status: intent, online_payment_enabled: price > 0 && formData.get('online_payment_enabled') === 'on', cash_payment_enabled: price > 0 && formData.get('cash_payment_enabled') === 'on', cash_payment_instructions: value(formData, 'cash_payment_instructions') || null })
  if (error) { console.error('[Hilig] host event insert failed:', error.code); redirect('/host/events/new?error=create') }
  revalidatePath('/host/dashboard'); revalidatePath('/events')
  redirect(`/host/dashboard?created=event&status=${intent}`)
}

export async function createHostCommunity(formData: FormData) {
  const { user, admin } = await requireHost()
  const name = value(formData, 'name'), description = value(formData, 'description'), location = value(formData, 'location'), imageUrl = value(formData, 'image_url')
  const interests = value(formData, 'interests').split(',').map(s => s.trim()).filter(Boolean).slice(0, 10)
  const intent = value(formData, 'intent') === 'submit' ? 'pending_review' : 'draft'
  if (name.length < 3 || name.length > 80 || description.length < 10 || description.length > 3000) redirect('/host/communities/new?error=validation')
  const { error } = await admin.from('community_groups').insert({ creator_id: user.id, slug: `${slugify(name)}-${crypto.randomUUID().slice(0, 8)}`, name, description, location: location || null, image_url: imageUrl || null, interests, status: 'draft', approval_status: intent })
  if (error) { console.error('[Hilig] host community insert failed:', error.code); redirect('/host/communities/new?error=create') }
  revalidatePath('/host/dashboard'); revalidatePath('/community')
  redirect(`/host/dashboard?created=community&status=${intent}`)
}
