/** Date helpers for the calendar views. All work in local time on ISO date strings. */

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Parse an ISO date ("YYYY-MM-DD") into a local Date at midnight. */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Format a Date as an ISO date string ("YYYY-MM-DD") in local time. */
export function toISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Today's date as an ISO string in US Central time (America/Chicago).
 * Uses Intl so CST/CDT is handled automatically and the value tracks the real
 * day on every call. Falls back to local time if the time zone is unavailable.
 */
export function todayInCentral(): string {
  try {
    // en-CA formats as YYYY-MM-DD, which is exactly the ISO date we want.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  } catch {
    return toISO(new Date())
  }
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Sunday-based weekday index (Sun=0 … Sat=6). Matches WEEKDAY_LABELS order. */
export function weekdayIndex(date: Date): number {
  return date.getDay()
}

/** The Sunday that starts the week containing `date`. */
export function startOfWeek(date: Date): Date {
  return addDays(date, -weekdayIndex(date))
}

/**
 * The 42-cell grid (6 weeks) for a month view, starting on the Sunday
 * on or before the 1st of the month.
 */
export function monthGrid(focus: Date): Date[] {
  const first = new Date(focus.getFullYear(), focus.getMonth(), 1)
  const gridStart = startOfWeek(first)
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
}

/** The 7 days (Sun–Sat) of the week containing `focus`. */
export function weekDays(focus: Date): Date[] {
  const start = startOfWeek(focus)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** Format a "HH:mm[:ss]" time string as "9:30 AM". */
export function formatTime(time: string | null): string {
  if (!time) return ''
  const [hStr, mStr] = time.split(':')
  let h = Number(hStr)
  const m = mStr ?? '00'
  const period = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m} ${period}`
}

/** Hours as fractional number for timeline positioning (e.g. "09:30" -> 9.5). */
export function timeToHours(time: string | null): number {
  if (!time) return 0
  const [h, m] = time.split(':').map(Number)
  return h + (m || 0) / 60
}

export type Recurrence =
  | 'NONE'
  | 'DAILY'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'YEARLY'
  | 'EVERY_N_DAYS'

/** Advance a date by one recurrence step (mirrors the backend logic). */
function stepRecurrence(date: Date, recurrence: Recurrence, interval: number): Date {
  switch (recurrence) {
    case 'DAILY':
      return addDays(date, 1)
    case 'WEEKLY':
      return addDays(date, 7)
    case 'BIWEEKLY':
      return addDays(date, 14)
    case 'MONTHLY':
      return addMonths(date, 1)
    case 'YEARLY': {
      const d = new Date(date)
      d.setFullYear(d.getFullYear() + 1)
      return d
    }
    case 'EVERY_N_DAYS':
      return addDays(date, Math.max(1, interval))
    default:
      return addDays(date, 1)
  }
}

/**
 * Expand a recurring item's occurrences within [rangeStartISO, rangeEndISO]
 * (inclusive), starting from its due date. Returns ISO date strings.
 * Non-recurring items yield just their due date if it falls in range.
 * When `untilISO` is provided, no occurrence after that date is produced
 * (the series stops repeating on/after it).
 * Bounded by a hard cap so a tight interval can't loop unexpectedly.
 */
export function expandRecurrence(
  startISO: string,
  recurrence: Recurrence,
  interval: number,
  rangeStartISO: string,
  rangeEndISO: string,
  untilISO?: string | null,
): string[] {
  const out: string[] = []
  if (!startISO) return out

  const rangeEnd = parseISO(rangeEndISO)
  // Cap expansion at the earlier of the visible range end and the "until" date.
  const limit = untilISO && untilISO < rangeEndISO ? parseISO(untilISO) : rangeEnd

  // Non-recurring: single occurrence on the due date.
  if (recurrence === 'NONE') {
    if (startISO >= rangeStartISO && startISO <= rangeEndISO) out.push(startISO)
    return out
  }

  let cursor = parseISO(startISO)
  let guard = 0
  const MAX = 1000
  // Walk forward from the due date, collecting occurrences up to the limit.
  while (cursor <= limit && guard < MAX) {
    const iso = toISO(cursor)
    if (iso >= rangeStartISO && iso <= rangeEndISO) out.push(iso)
    cursor = stepRecurrence(cursor, recurrence, interval)
    guard++
  }
  return out
}
