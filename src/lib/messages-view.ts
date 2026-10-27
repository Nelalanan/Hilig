import type { createClient } from '@/lib/supabase/server'

/**
 * Read-only helper for the messages UI. It uses the signed-in user's own
 * Supabase client, so the same row-level security as the old inbox applies.
 * No writes, no service-role client.
 */

type Supa = Awaited<ReturnType<typeof createClient>>

export type InboxItem = {
  id: string
  subject: string
  updatedAt: string
  otherName: string
  hostId: string | null
  preview: string | null
  previewMine: boolean
  unread: boolean
}

type MembershipRow = { conversation_id: string; last_read_at: string | null }
type ConversationRow = { id: string; subject: string; updated_at: string }
type OtherMemberRow = { conversation_id: string; user_id: string }
type MessageRow = {
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
}
type HostRow = { id: string; name: string; owner_id: string | null }

export async function getInbox(
  supabase: Supa,
  userId: string,
): Promise<InboxItem[]> {
  const { data: membershipData } = await supabase
    .from('conversation_members')
    .select('conversation_id,last_read_at')
    .eq('user_id', userId)

  const memberships = (membershipData ?? []) as MembershipRow[]
  const ids = memberships.map((item) => item.conversation_id)
  if (!ids.length) return []

  const [conversationResult, othersResult, messagesResult] = await Promise.all([
    supabase
      .from('conversations')
      .select('id,subject,updated_at')
      .in('id', ids)
      .order('updated_at', { ascending: false }),
    supabase
      .from('conversation_members')
      .select('conversation_id,user_id')
      .in('conversation_id', ids)
      .neq('user_id', userId),
    supabase
      .from('messages')
      .select('conversation_id,sender_id,body,created_at')
      .in('conversation_id', ids)
      .order('created_at', { ascending: false })
      .limit(300),
  ])

  const conversations = (conversationResult.data ?? []) as ConversationRow[]
  const others = (othersResult.data ?? []) as OtherMemberRow[]
  const recent = (messagesResult.data ?? []) as MessageRow[]

  // Names: hosts are the only members whose display name is readable here.
  const ownerIds = [...new Set(others.map((member) => member.user_id))]
  let hosts: HostRow[] = []
  if (ownerIds.length) {
    const { data } = await supabase
      .from('hosts')
      .select('id,name,owner_id')
      .in('owner_id', ownerIds)
    hosts = (data ?? []) as HostRow[]
  }

  const hostByOwner = new Map<string, HostRow>()
  for (const host of hosts) {
    if (host.owner_id && !hostByOwner.has(host.owner_id)) {
      hostByOwner.set(host.owner_id, host)
    }
  }

  const otherByConversation = new Map<string, string>()
  for (const member of others) {
    if (!otherByConversation.has(member.conversation_id)) {
      otherByConversation.set(member.conversation_id, member.user_id)
    }
  }

  // `recent` is newest first, so the first hit per conversation is the latest.
  const lastMessage = new Map<string, MessageRow>()
  for (const message of recent) {
    if (!lastMessage.has(message.conversation_id)) {
      lastMessage.set(message.conversation_id, message)
    }
  }

  const lastRead = new Map<string, string | null>(
    memberships.map((item) => [item.conversation_id, item.last_read_at]),
  )

  return conversations.map((conversation) => {
    const otherId = otherByConversation.get(conversation.id)
    const host = otherId ? hostByOwner.get(otherId) : undefined
    const latest = lastMessage.get(conversation.id)
    const readAt = lastRead.get(conversation.id)

    const updatedAfterRead =
      !readAt ||
      new Date(conversation.updated_at).getTime() > new Date(readAt).getTime()

    return {
      id: conversation.id,
      subject: conversation.subject,
      updatedAt: conversation.updated_at,
      otherName: host?.name || 'Hilig member',
      hostId: host?.id ?? null,
      preview: latest ? latest.body : null,
      previewMine: latest ? latest.sender_id === userId : false,
      unread: updatedAfterRead && (latest ? latest.sender_id !== userId : true),
    }
  })
}
