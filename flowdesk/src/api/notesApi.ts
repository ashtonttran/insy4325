/**
 * The single set of REST calls to the Spring Boot API.
 * Every network interaction with the backend lives here.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export interface Note {
  id: number
  title: string
  content: string | null
  tag: string | null
  favorite: boolean
  notebookId: number | null
  notebookName: string | null
  createdAt: string
  updatedAt: string
}

export interface Notebook {
  id: number
  name: string
  noteCount: number
  folderId: number | null
  folderName: string | null
}

export interface Folder {
  id: number
  name: string
}

/** Shape sent when creating or updating a note. */
export interface NoteInput {
  title: string
  content?: string | null
  tag?: string | null
  favorite?: boolean
  notebookId?: number | null
}

/** Shape sent when creating or updating a notebook. */
export interface NotebookInput {
  name: string
  folderId?: number | null
}

export type LinkTargetType = 'TASK' | 'EVENT'

/** A task/event linked to a note, with the target's resolved display fields. */
export interface NoteLink {
  id: number
  targetType: LinkTargetType
  targetId: number
  title: string
  // Task-only
  status: string | null
  dueDate: string | null
  // Event-only
  date: string | null
  startTime: string | null
  endTime: string | null
}

/** A note summary returned when asking a task/event which notes link to it. */
export interface LinkedNote {
  id: number
  title: string
  notebookId: number | null
  notebookName: string | null
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
      // response had no JSON body; keep the default message
    }
    throw new Error(message)
  }

  // 204 No Content (e.g. DELETE) has no body to parse.
  if (res.status === 204) {
    return undefined as T
  }
  return res.json() as Promise<T>
}

export const notesApi = {
  listNotes: () => request<Note[]>('/api/notes'),
  getNote: (id: number) => request<Note>(`/api/notes/${id}`),
  createNote: (input: NoteInput) =>
    request<Note>('/api/notes', { method: 'POST', body: JSON.stringify(input) }),
  updateNote: (id: number, input: NoteInput) =>
    request<Note>(`/api/notes/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  setFavorite: (id: number, favorite: boolean) =>
    request<Note>(`/api/notes/${id}/favorite`, {
      method: 'PATCH',
      body: JSON.stringify({ favorite }),
    }),
  deleteNote: (id: number) =>
    request<void>(`/api/notes/${id}`, { method: 'DELETE' }),

  // notebooks
  listNotebooks: () => request<Notebook[]>('/api/notebooks'),
  createNotebook: (input: NotebookInput) =>
    request<Notebook>('/api/notebooks', { method: 'POST', body: JSON.stringify(input) }),
  updateNotebook: (id: number, input: NotebookInput) =>
    request<Notebook>(`/api/notebooks/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteNotebook: (id: number) =>
    request<void>(`/api/notebooks/${id}`, { method: 'DELETE' }),

  // folders
  listFolders: () => request<Folder[]>('/api/folders'),
  createFolder: (name: string) =>
    request<Folder>('/api/folders', { method: 'POST', body: JSON.stringify({ name }) }),
  renameFolder: (id: number, name: string) =>
    request<Folder>(`/api/folders/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteFolder: (id: number) =>
    request<void>(`/api/folders/${id}`, { method: 'DELETE' }),

  // note <-> task/event links
  listLinks: (noteId: number) => request<NoteLink[]>(`/api/notes/${noteId}/links`),
  addLink: (noteId: number, targetType: LinkTargetType, targetId: number) =>
    request<NoteLink>(`/api/notes/${noteId}/links`, {
      method: 'POST',
      body: JSON.stringify({ targetType, targetId }),
    }),
  removeLink: (noteId: number, linkId: number) =>
    request<void>(`/api/notes/${noteId}/links/${linkId}`, { method: 'DELETE' }),

  // reverse lookups for task/event detail views
  notesForTask: (taskId: number) => request<LinkedNote[]>(`/api/tasks/${taskId}/notes`),
  notesForEvent: (eventId: number) => request<LinkedNote[]>(`/api/events/${eventId}/notes`),
}
