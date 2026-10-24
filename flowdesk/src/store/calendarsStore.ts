import { create } from 'zustand'
import { calendarsApi, type Calendar, type CalendarInput } from '@/api/calendarsApi'

interface CalendarsState {
  calendars: Calendar[]
  loading: boolean
  error: string | null

  fetchAll: () => Promise<void>
  createCalendar: (input: CalendarInput) => Promise<Calendar | null>
  updateCalendar: (id: number, input: CalendarInput) => Promise<Calendar | null>
  deleteCalendar: (id: number) => Promise<void>
}

export const useCalendarsStore = create<CalendarsState>((set) => ({
  calendars: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null })
    try {
      const calendars = await calendarsApi.listCalendars()
      set({ calendars, loading: false })
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load calendars',
      })
    }
  },

  createCalendar: async (input) => {
    set({ error: null })
    try {
      const created = await calendarsApi.createCalendar(input)
      set((state) => ({ calendars: [...state.calendars, created] }))
      return created
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create calendar' })
      return null
    }
  },

  updateCalendar: async (id, input) => {
    set({ error: null })
    try {
      const updated = await calendarsApi.updateCalendar(id, input)
      set((state) => ({ calendars: state.calendars.map((c) => (c.id === id ? updated : c)) }))
      return updated
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update calendar' })
      return null
    }
  },

  deleteCalendar: async (id) => {
    set({ error: null })
    try {
      await calendarsApi.deleteCalendar(id)
      set((state) => ({ calendars: state.calendars.filter((c) => c.id !== id) }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete calendar' })
    }
  },
}))
