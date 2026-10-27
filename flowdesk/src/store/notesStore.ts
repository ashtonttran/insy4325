import { create } from 'zustand'
import {
  notesApi,
  type Note,
  type Notebook,
  type Folder,
  type NoteInput,
} from '@/api/notesApi'

/**
 * The single React state store for notes.
 * Owns all notes/notebooks/folders state and is the only caller of notesApi.
 */
interface NotesState {
  notes: Note[]
  notebooks: Notebook[]
  folders: Folder[]
  selectedNoteId: number | null
  /** The last notebook a note was successfully created in (a suggested default). */
  lastNotebookId: number | null
  loading: boolean
  error: string | null

  // note actions
  fetchAll: () => Promise<void>
  selectNote: (id: number | null) => void
  createNote: (input: NoteInput) => Promise<Note | null>
  updateNote: (id: number, input: NoteInput) => Promise<Note | null>
  moveNoteToNotebook: (id: number, notebookId: number | null) => Promise<void>
  toggleFavorite: (id: number) => Promise<void>
  deleteNote: (id: number) => Promise<void>

  // folder actions
  createFolder: (name: string) => Promise<void>
  renameFolder: (id: number, name: string) => Promise<void>
  deleteFolder: (id: number) => Promise<void>

  // notebook actions
  createNotebook: (name: string, folderId: number | null) => Promise<void>
  moveNotebook: (id: number, folderId: number | null) => Promise<void>
  renameNotebook: (id: number, name: string) => Promise<void>
  deleteNotebook: (id: number) => Promise<void>

  // selectors (derived)
  selectedNote: () => Note | undefined

  // internal helpers
  fetchNotebooksSilently: () => Promise<void>
  refreshFoldersAndNotebooks: () => Promise<void>
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  notebooks: [],
  folders: [],
  selectedNoteId: null,
  lastNotebookId: null,
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null })
    try {
      const [notes, notebooks, folders] = await Promise.all([
        notesApi.listNotes(),
        notesApi.listNotebooks(),
        notesApi.listFolders(),
      ])
      set((state) => ({
        notes,
        notebooks,
        folders,
        loading: false,
        // keep selection if still present, else select first note
        selectedNoteId:
          state.selectedNoteId && notes.some((n) => n.id === state.selectedNoteId)
            ? state.selectedNoteId
            : (notes[0]?.id ?? null),
      }))
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to load notes' })
    }
  },

  selectNote: (id) => set({ selectedNoteId: id }),

  createNote: async (input) => {
    set({ error: null })
    try {
      const created = await notesApi.createNote(input)
      set((state) => ({
        notes: [created, ...state.notes],
        selectedNoteId: created.id,
        // Remember the destination as the suggested default for next time.
        lastNotebookId: created.notebookId ?? state.lastNotebookId,
      }))
      // refresh notebook counts
      void get().fetchNotebooksSilently()
      return created
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create note' })
      return null
    }
  },

  updateNote: async (id, input) => {
    set({ error: null })
    try {
      const updated = await notesApi.updateNote(id, input)
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? updated : n)),
      }))
      void get().fetchNotebooksSilently()
      return updated
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update note' })
      return null
    }
  },

  moveNoteToNotebook: async (id, notebookId) => {
    const note = get().notes.find((n) => n.id === id)
    if (!note || note.notebookId === notebookId) return
    try {
      const updated = await notesApi.updateNote(id, {
        title: note.title,
        content: note.content,
        tag: note.tag,
        favorite: note.favorite,
        notebookId,
      })
      set((state) => ({ notes: state.notes.map((n) => (n.id === id ? updated : n)) }))
      void get().fetchNotebooksSilently()
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to move note' })
    }
  },

  toggleFavorite: async (id) => {
    const note = get().notes.find((n) => n.id === id)
    if (!note) return
    const next = !note.favorite
    // Optimistic flip; revert on failure.
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? { ...n, favorite: next } : n)),
      error: null,
    }))
    try {
      const updated = await notesApi.setFavorite(id, next)
      set((state) => ({ notes: state.notes.map((n) => (n.id === id ? updated : n)) }))
    } catch (err) {
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? { ...n, favorite: !next } : n)),
        error: err instanceof Error ? err.message : 'Failed to update favorite',
      }))
    }
  },

  deleteNote: async (id) => {
    set({ error: null })
    try {
      await notesApi.deleteNote(id)
      set((state) => {
        const notes = state.notes.filter((n) => n.id !== id)
        return {
          notes,
          selectedNoteId:
            state.selectedNoteId === id ? (notes[0]?.id ?? null) : state.selectedNoteId,
        }
      })
      void get().fetchNotebooksSilently()
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete note' })
    }
  },

  createFolder: async (name) => {
    set({ error: null })
    try {
      await notesApi.createFolder(name)
      await get().refreshFoldersAndNotebooks()
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create folder' })
    }
  },

  renameFolder: async (id, name) => {
    set({ error: null })
    try {
      await notesApi.renameFolder(id, name)
      await get().refreshFoldersAndNotebooks()
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to rename folder' })
    }
  },

  deleteFolder: async (id) => {
    set({ error: null })
    try {
      await notesApi.deleteFolder(id)
      await get().refreshFoldersAndNotebooks()
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete folder' })
    }
  },

  createNotebook: async (name, folderId) => {
    set({ error: null })
    try {
      await notesApi.createNotebook({ name, folderId })
      await get().refreshFoldersAndNotebooks()
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create notebook' })
    }
  },

  moveNotebook: async (id, folderId) => {
    set({ error: null })
    const notebook = get().notebooks.find((nb) => nb.id === id)
    if (!notebook) return
    try {
      await notesApi.updateNotebook(id, { name: notebook.name, folderId })
      await get().refreshFoldersAndNotebooks()
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to move notebook' })
    }
  },

  renameNotebook: async (id, name) => {
    set({ error: null })
    const notebook = get().notebooks.find((nb) => nb.id === id)
    if (!notebook) return
    try {
      await notesApi.updateNotebook(id, { name, folderId: notebook.folderId })
      await get().refreshFoldersAndNotebooks()
      // Notes carry notebookName; refresh them so the new name shows everywhere.
      const notes = await notesApi.listNotes()
      set({ notes })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to rename notebook' })
    }
  },

  deleteNotebook: async (id) => {
    set({ error: null })
    try {
      await notesApi.deleteNotebook(id)
      await get().refreshFoldersAndNotebooks()
      // Deleted notebook's notes become Unfiled; refresh to reflect that.
      const notes = await notesApi.listNotes()
      set({ notes })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete notebook' })
    }
  },

  selectedNote: () => {
    const { notes, selectedNoteId } = get()
    return notes.find((n) => n.id === selectedNoteId)
  },

  fetchNotebooksSilently: async () => {
    try {
      const notebooks = await notesApi.listNotebooks()
      set({ notebooks })
    } catch {
      // non-critical; leave existing counts in place
    }
  },

  refreshFoldersAndNotebooks: async () => {
    try {
      const [notebooks, folders] = await Promise.all([
        notesApi.listNotebooks(),
        notesApi.listFolders(),
      ])
      set({ notebooks, folders })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to refresh folders' })
    }
  },
}))
