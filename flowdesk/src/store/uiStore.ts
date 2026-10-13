import { create } from 'zustand'

/**
 * Small cross-cutting UI store for coordinating actions that originate in a
 * global component (e.g. the top-bar Quick Add menu) but take effect on a page.
 */
interface UiState {
  /** When true, the Calendar page should open its "new event" dialog on arrival. */
  openNewEventOnCalendar: boolean
  requestNewEvent: () => void
  consumeNewEvent: () => void
}

export const useUiStore = create<UiState>((set) => ({
  openNewEventOnCalendar: false,
  requestNewEvent: () => set({ openNewEventOnCalendar: true }),
  consumeNewEvent: () => set({ openNewEventOnCalendar: false }),
}))
