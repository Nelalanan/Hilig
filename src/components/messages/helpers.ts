/** Small pure helpers shared by the messages UI. */

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'H'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

/** Picks one of four avatar colours so the same person always looks the same. */
export function toneOf(name: string): number {
  let sum = 0
  for (const char of name) sum += char.charCodeAt(0)
  return sum % 4
}

export function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Whole calendar days between `date` and `now` (0 = today). */
export function dayDiff(date: Date, now: Date): number {
  return Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)
}

/** Short stamp for the conversation list: 3:14 PM, Yesterday, Mon, Oct 24. */
export function formatListTime(date: Date, now: Date): string {
  const diff = dayDiff(date, now)
  if (diff <= 0) return formatClock(date)
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return date.toLocaleDateString([], { weekday: 'short' })
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

/** Divider label inside a thread: Today, Yesterday, Mon, Oct 26. */
export function dayLabel(date: Date, now: Date): string {
  const diff = dayDiff(date, now)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  })
}
