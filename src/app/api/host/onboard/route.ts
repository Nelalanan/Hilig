
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type HostRegistrationBody = {
  name?: unknown
  bio?: unknown
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Verify the real authenticated session on the server.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return errorResponse('Please sign in before becoming a host.', 401)
    }

    let body: HostRegistrationBody

    try {
      body = (await request.json()) as HostRegistrationBody
    } catch {
      return errorResponse('Please submit a valid form.', 400)
    }

    if (typeof body.name !== 'string') {
      return errorResponse('Please enter a host or business name.', 400)
    }

    const name = body.name.trim()
    const bio = typeof body.bio === 'string' ? body.bio.trim() : ''

    if (name.length < 2 || name.length > 100) {
      return errorResponse(
        'Your host name must be between 2 and 100 characters.',
        400,
      )
    }

    if (typeof body.bio !== 'undefined' && typeof body.bio !== 'string') {
      return errorResponse('Please enter a valid bio.', 400)
    }

    if (bio.length > 1000) {
      return errorResponse('Your bio cannot exceed 1000 characters.', 400)
    }

    // The database function uses auth.uid() to determine ownership.
    // Never accept owner_id or role from the browser.
    const { data, error } = await supabase.rpc('become_a_host', {
      p_name: name,
      p_bio: bio || null,
    })

    if (error) {
      console.error('Host registration failed:', error.message)

      if (
        error.message.includes('Administrator accounts') ||
        error.message.includes('user profile could not be found')
      ) {
        return errorResponse(error.message, 403)
      }

      if (
        error.message.includes('Host name must') ||
        error.message.includes('Host bio cannot') ||
        error.message.includes('must be signed in')
      ) {
        return errorResponse(error.message, 400)
      }

      return errorResponse(
        'We could not create your host profile. Please try again.',
        500,
      )
    }

    const host = Array.isArray(data) ? data[0] : data

    if (!host?.host_id || !host?.host_name) {
      console.error('Host registration returned an unexpected result.')
      return errorResponse('Your host profile could not be verified.', 500)
    }

    return NextResponse.json({
      message: 'Your host profile is ready!',
      host: {
        id: host.host_id,
        name: host.host_name,
      },
    })
  } catch (error) {
    console.error('Unexpected host registration error:', error)

    return errorResponse(
      'An unexpected error occurred. Please try again.',
      500,
    )
  }
}
