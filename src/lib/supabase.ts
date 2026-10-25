import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null | undefined

/**
 * Read-only client for public data (uses the anon key, so row level security applies).
 * Returns null when Supabase isn't configured, and the site falls back to sample data.
 * Login-aware clients arrive in the auth step.
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  client =
    url && key
      ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
      : null

  return client
}
