/**
 * The single set of REST calls for calendar events.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export type EventTone = 'purple' | 'amber' | 'green' | 'red'
export type EventRecurrence =
  | 'NONE'
  | 'DAILY'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'YEARLY'
  | 'EVERY_N_DAYS'

export interface CalendarEvent {
  id: number
  title: string
  location: string | null
  date: string // ISO date, e.g. "2026-02-18"
  startTime: string | null // "HH:mm:ss" or "HH:mm"
  endTime: string | null
  tone: EventTone
  recurrence: EventRecurrence
  recurrenceInterval: number
  notebookId: number | null
  notebookName: string | null
}

/** Shape sent when creating or updating an event. */
export interface EventInput {
  title: string
  location?: string | null
  date: string
  startTime?: string | null // "HH:mm"
  endTime?: string | null
  tone?: EventTone
  recurrence?: EventRecurrence
  recurrenceInterval?: number
  notebookId?: number | null
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    let message = `Request failed with ${res.status}`
    try {
      const body = await res.json()
      if (body?.message) message = body.message
    } catch {
      // no JSON body
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const eventsApi = {
  listEvents: () => request<CalendarEvent[]>('/api/events'),
  listRange: (from: string, to: string) =>
    request<CalendarEvent[]>(`/api/events?from=${from}&to=${to}`),
  createEvent: (input: EventInput) =>
    request<CalendarEvent>('/api/events', { method: 'POST', body: JSON.stringify(input) }),
  updateEvent: (id: number, input: EventInput) =>
    request<CalendarEvent>(`/api/events/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteEvent: (id: number) =>
    request<void>(`/api/events/${id}`, { method: 'DELETE' }),
}
