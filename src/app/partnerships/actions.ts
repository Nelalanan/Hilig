'use server'

import { createClient } from '@/lib/supabase/server'
import type { SubmissionState } from '@/app/contact/actions'

function value(formData: FormData, key: string) {
  const item = formData.get(key)
  return typeof item === 'string' ? item.trim() : ''
}
function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

export async function submitPartnership(
  _previous: SubmissionState,
  formData: FormData,
): Promise<SubmissionState> {
  if (value(formData, 'website')) return { status: 'success', message: 'Thanks. Your application has been submitted.' }

  const contactName = value(formData, 'contact_name')
  const email = value(formData, 'email').toLowerCase()
  const organizationName = value(formData, 'organization_name')
  const applicantType = value(formData, 'applicant_type')
  const websiteUrl = value(formData, 'website_url')
  const location = value(formData, 'location')
  const proposal = value(formData, 'proposal')
  const allowed = ['business', 'creator', 'event_organizer', 'host', 'community', 'other']

  if (contactName.length < 2 || contactName.length > 120) return { status: 'error', message: 'Contact name must be between 2 and 120 characters.' }
  if (!validEmail(email)) return { status: 'error', message: 'Enter a valid email address.' }
  if (organizationName.length < 2 || organizationName.length > 200) return { status: 'error', message: 'Organization or project name must be between 2 and 200 characters.' }
  if (!allowed.includes(applicantType)) return { status: 'error', message: 'Choose a valid partnership type.' }
  if (location.length > 200) return { status: 'error', message: 'Location must be 200 characters or fewer.' }
  if (proposal.length < 20 || proposal.length > 10000) return { status: 'error', message: 'Proposal must be between 20 and 10,000 characters.' }

  let normalizedWebsite: string | null = null
  if (websiteUrl) {
    try {
      const parsed = new URL(websiteUrl)
      if (!['https:', 'http:'].includes(parsed.protocol) || websiteUrl.length > 2048) throw new Error()
      normalizedWebsite = parsed.toString()
    } catch {
      return { status: 'error', message: 'Enter a valid website URL starting with https:// or http://.' }
    }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('partnership_applications').insert({
      user_id: user?.id ?? null,
      contact_name: contactName,
      email,
      organization_name: organizationName,
      applicant_type: applicantType,
      website_url: normalizedWebsite,
      location: location || null,
      proposal,
    })
    if (error) {
      console.error('[Hilig] Partnership submission failed:', error.code)
      return { status: 'error', message: 'We could not submit your application. Please try again shortly.' }
    }
    return { status: 'success', message: 'Thanks for your interest in partnering with Hilig. Your application has been received.' }
  } catch {
    return { status: 'error', message: 'The partnership form is temporarily unavailable. Please try again later.' }
  }
}
