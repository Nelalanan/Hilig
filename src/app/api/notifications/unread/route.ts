import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ unread: 0 }, { status: 401 })
  const { count, error } = await supabase.from('in_app_notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null)
  if (error) return NextResponse.json({ unread: 0 }, { status: 500 })
  return NextResponse.json({ unread: count ?? 0 }, { headers: { 'Cache-Control': 'private, no-store' } })
}
