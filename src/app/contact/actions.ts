'use server'

import { createClient } from '@/lib/supabase/server'

export type SubmissionState = { status: 'idle' | 'success' | 'error'; message: string }
const idle: SubmissionState = { status: 'idle', message: '' }

function value(formData: FormData, key: string) {
  const item = formData.get(key)
  return typeof item === 'string' ? item.trim() : ''
}
function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

export async function submitContact(
  _previous: SubmissionState = idle,
  formData: FormData,
): Promise<SubmissionState> {
  // Honeypot field: humans should leave this blank.
  if (value(formData, 'website')) return { status: 'success', message: 'Thanks. Your message has been submitted.' }

  const name = value(formData, 'name')
  const email = value(formData, 'email').toLowerCase()
  const category = value(formData, 'category')
  const subject = value(formData, 'subject')
  const message = value(formData, 'message')
  const allowed = ['general', 'support', 'feedback', 'booking', 'other']

  if (name.length < 2 || name.length > 120) return { status: 'error', message: 'Name must be between 2 and 120 characters.' }
  if (!validEmail(email)) return { status: 'error', message: 'Enter a valid email address.' }
  if (!allowed.includes(category)) return { status: 'error', message: 'Choose a valid inquiry category.' }
  if (subject.length < 3 || subject.length > 200) return { status: 'error', message: 'Subject must be between 3 and 200 characters.' }
  if (message.length < 10 || message.length > 10000) return { status: 'error', message: 'Message must be between 10 and 10,000 characters.' }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('contact_inquiries').insert({
      user_id: user?.id ?? null, name, email, category, subject, message,
    })
    if (error) {
      console.error('[Hilig] Contact submission failed:', error.code)
      return { status: 'error', message: 'We could not submit your message. Please try again shortly.' }
    }
    return { status: 'success', message: 'Thanks for reaching out. Your message has been received.' }
  } catch {
    return { status: 'error', message: 'The contact form is temporarily unavailable. Please try again later.' }
  }
}
