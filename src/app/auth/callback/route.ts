
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')

  // Only permit safe, local application paths.
  const isSafeLocalPath =
    !!next &&
    next.startsWith('/') &&
    !next.startsWith('//') &&
    !next.startsWith('/\\') &&
    !next.includes('\r') &&
    !next.includes('\n')

  const destination = isSafeLocalPath ? next : '/account'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(
        new URL(destination, requestUrl.origin),
      )
    }
  }

  return NextResponse.redirect(
    new URL('/login?error=confirmation_failed', requestUrl.origin),
  )
}
