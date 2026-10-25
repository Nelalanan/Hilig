// Everything is shown in Philippine time, whatever the server's timezone is.
const TIME_ZONE = 'Asia/Manila'

export function formatPrice(php: number): string {
  return `₱${php.toLocaleString('en-PH')}`
}

function dateParts(iso: string, options: Intl.DateTimeFormatOptions): Record<string, string> {
  const out: Record<string, string> = {}
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour12: true, ...options })
  for (const part of formatter.formatToParts(new Date(iso))) {
    out[part.type] = part.value
  }
  return out
}

/** "Sat, 10:00 AM" */
export function formatSessionShort(iso: string): string {
  const p = dateParts(iso, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
  return `${p.weekday}, ${p.hour}:${p.minute} ${p.dayPeriod}`
}

/** { day: "Saturday, Nov 1", time: "10:00 AM" } */
export function formatSessionLong(iso: string): { day: string; time: string } {
  const p = dateParts(iso, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  return { day: `${p.weekday}, ${p.month} ${p.day}`, time: `${p.hour}:${p.minute} ${p.dayPeriod}` }
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = minutes / 60
  if (Number.isInteger(hours)) return hours === 1 ? '1 hour' : `${hours} hours`
  return `${hours.toFixed(1)} hours`
}

export function spotsLeft(session: { capacity: number; booked: number }): number {
  return Math.max(0, session.capacity - session.booked)
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  return `${cut.slice(0, cut.lastIndexOf(' ')).trimEnd()}…`
}
