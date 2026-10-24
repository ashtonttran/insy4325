/**
 * The single set of REST calls for calendars that group events and tasks.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export type CalendarTone = 'purple' | 'amber' | 'green' | 'red'

export interface Calendar {
  id: number
  name: string
  description: string | null
  tone: CalendarTone
  createdAt: string
  updatedAt: string
}

/** Shape sent when creating or updating a calendar. */
export interface CalendarInput {
  name: string
  description?: string | null
  tone?: CalendarTone
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

export const calendarsApi = {
  listCalendars: () => request<Calendar[]>('/api/calendars'),
  getCalendar: (id: number) => request<Calendar>(`/api/calendars/${id}`),
  createCalendar: (input: CalendarInput) =>
    request<Calendar>('/api/calendars', { method: 'POST', body: JSON.stringify(input) }),
  updateCalendar: (id: number, input: CalendarInput) =>
    request<Calendar>(`/api/calendars/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteCalendar: (id: number) =>
    request<void>(`/api/calendars/${id}`, { method: 'DELETE' }),
}
