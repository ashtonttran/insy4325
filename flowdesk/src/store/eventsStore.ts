import { create } from 'zustand'
import { eventsApi, type CalendarEvent, type EventInput } from '@/api/eventsApi'
import { todayInCentral } from '@/lib/calendar'

export type CalendarView = 'month' | 'week' | 'day'

interface EventsState {
  events: CalendarEvent[]
  view: CalendarView
  /** ISO date string the calendar is focused on. */
  focusDate: string
  loading: boolean
  error: string | null

  fetchAll: () => Promise<void>
  setView: (view: CalendarView) => void
  setFocusDate: (date: string) => void
  createEvent: (input: EventInput) => Promise<CalendarEvent | null>
  updateEvent: (id: number, input: EventInput) => Promise<CalendarEvent | null>
  deleteEvent: (id: number) => Promise<void>
}

export const useEventsStore = create<EventsState>((set) => ({
  events: [],
  view: 'month',
  // Focus on the real current date in US Central time; recomputed each load.
  focusDate: todayInCentral(),
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null })
    try {
      const events = await eventsApi.listEvents()
      set({ events, loading: false })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to load events' })
    }
  },

  setView: (view) => set({ view }),
  setFocusDate: (date) => set({ focusDate: date }),

  createEvent: async (input) => {
    set({ error: null })
    try {
      const created = await eventsApi.createEvent(input)
      set((state) => ({ events: [...state.events, created] }))
      return created
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create event' })
      return null
    }
  },

  updateEvent: async (id, input) => {
    set({ error: null })
    try {
      const updated = await eventsApi.updateEvent(id, input)
      set((state) => ({ events: state.events.map((e) => (e.id === id ? updated : e)) }))
      return updated
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update event' })
      return null
    }
  },

  deleteEvent: async (id) => {
    set({ error: null })
    try {
      await eventsApi.deleteEvent(id)
      set((state) => ({ events: state.events.filter((e) => e.id !== id) }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete event' })
    }
  },
}))
