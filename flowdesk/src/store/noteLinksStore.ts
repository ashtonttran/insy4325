import { create } from 'zustand'
import { notesApi, type NoteLink, type LinkTargetType } from '@/api/notesApi'

/**
 * Holds the linked tasks/events for the currently open note. Kept separate from
 * notesStore so link fetches don't churn the main notes list. The page drives
 * which note is loaded.
 */
interface NoteLinksState {
  noteId: number | null
  links: NoteLink[]
  loading: boolean
  error: string | null

  /** Load links for a note (clears when id is null). */
  load: (noteId: number | null) => Promise<void>
  /** Link an existing task/event to the current note; ignores duplicates. */
  link: (targetType: LinkTargetType, targetId: number) => Promise<void>
  /** Remove a link from the current note. */
  unlink: (linkId: number) => Promise<void>
}

export const useNoteLinksStore = create<NoteLinksState>((set, get) => ({
  noteId: null,
  links: [],
  loading: false,
  error: null,

  load: async (noteId) => {
    set({ noteId, error: null })
    if (noteId == null) {
      set({ links: [] })
      return
    }
    set({ loading: true })
    try {
      const links = await notesApi.listLinks(noteId)
      // Guard against a stale response if the note changed mid-flight.
      if (get().noteId === noteId) set({ links, loading: false })
      else set({ loading: false })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to load links' })
    }
  },

  link: async (targetType, targetId) => {
    const noteId = get().noteId
    if (noteId == null) return
    // Prevent duplicates client-side too.
    if (get().links.some((l) => l.targetType === targetType && l.targetId === targetId)) return
    try {
      const created = await notesApi.addLink(noteId, targetType, targetId)
      set((state) => ({ links: [...state.links, created] }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to link item' })
    }
  },

  unlink: async (linkId) => {
    const noteId = get().noteId
    if (noteId == null) return
    const prev = get().links
    // Optimistic removal.
    set({ links: prev.filter((l) => l.id !== linkId) })
    try {
      await notesApi.removeLink(noteId, linkId)
    } catch (err) {
      set({ links: prev, error: err instanceof Error ? err.message : 'Failed to unlink item' })
    }
  },
}))
