'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function requireUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login?next=%2Fmessages')
  return { supabase, user }
}

export async function startConversation(formData: FormData) {
  const { user } = await requireUser()
  const recipientId = String(formData.get('recipient_id') ?? '').trim()
  const subject = String(formData.get('subject') ?? 'Conversation').trim().slice(0, 160) || 'Conversation'
  if (!UUID.test(recipientId) || recipientId === user.id) redirect('/messages/new?error=recipient')

  const admin = createAdminClient()
  const [{ data: hostRecipient, error: hostError }, { data: communityRecipient, error: communityError }] = await Promise.all([
    admin.from('hosts').select('owner_id').eq('owner_id', recipientId).limit(1).maybeSingle(),
    admin.from('community_groups').select('creator_id').eq('creator_id', recipientId).eq('status', 'published').limit(1).maybeSingle(),
  ])
  // Recipients must be linked hosts or organizers of a published community;
  // a query-string UUID alone must not enable arbitrary unsolicited messaging.
  if (hostError || communityError || (!hostRecipient && !communityRecipient)) redirect('/messages/new?error=recipient')

  const { data: conversation, error } = await admin.from('conversations').insert({ created_by: user.id, subject }).select('id').single()
  if (error || !conversation) {
    console.error('[Hilig] Conversation creation failed:', error?.code)
    redirect('/messages/new?error=create')
  }

  const { error: memberError } = await admin.from('conversation_members').insert([
    { conversation_id: conversation.id, user_id: user.id, last_read_at: new Date().toISOString() },
    { conversation_id: conversation.id, user_id: recipientId },
  ])
  if (memberError) {
    await admin.from('conversations').delete().eq('id', conversation.id)
    console.error('[Hilig] Conversation membership creation failed:', memberError.code)
    redirect('/messages/new?error=create')
  }

  await admin.from('in_app_notifications').insert({
    user_id: recipientId,
    actor_id: user.id,
    notification_type: 'new_message',
    title: 'New conversation',
    body: subject,
    href: `/messages/${conversation.id}`,
  })
  revalidatePath('/messages')
  redirect(`/messages/${conversation.id}`)
}

export async function sendMessage(formData: FormData) {
  const { supabase, user } = await requireUser()
  const conversationId = String(formData.get('conversation_id') ?? '')
  const body = String(formData.get('body') ?? '').trim()
  if (!UUID.test(conversationId) || body.length < 1 || body.length > 5000) redirect(`/messages/${conversationId}?error=invalid`)

  const { data: membership, error: membershipError } = await supabase.from('conversation_members')
    .select('conversation_id').eq('conversation_id', conversationId).eq('user_id', user.id).maybeSingle()
  if (membershipError || !membership) redirect('/messages?error=forbidden')

  const admin = createAdminClient()
  const { error } = await admin.from('messages').insert({ conversation_id: conversationId, sender_id: user.id, body })
  if (error) {
    console.error('[Hilig] Message send failed:', error.code)
    redirect(`/messages/${conversationId}?error=send`)
  }

  const { data: otherMembers } = await admin.from('conversation_members').select('user_id')
    .eq('conversation_id', conversationId).neq('user_id', user.id)
  const now = new Date().toISOString()
  await admin.from('conversations').update({ updated_at: now }).eq('id', conversationId)
  if (otherMembers?.length) {
    await admin.from('in_app_notifications').insert(otherMembers.map((member) => ({
      user_id: member.user_id,
      actor_id: user.id,
      notification_type: 'new_message',
      title: 'New message',
      body: body.slice(0, 180),
      href: `/messages/${conversationId}`,
    })))
  }
  revalidatePath('/messages')
  revalidatePath(`/messages/${conversationId}`)
  revalidatePath('/notifications')
  redirect(`/messages/${conversationId}`)
}
