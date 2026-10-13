import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { cn } from '@/lib/cn'
import { useNotesStore } from '@/store/notesStore'
import { NotesNav, type NotesFilter } from '@/components/notes/NotesNav'
import { NoteEditor } from '@/components/notes/NoteEditor'

/** Notes Library — three-column workspace: nav panel + expanded editor. */
export function Notes() {
  const {
    notes,
    notebooks,
    folders,
    selectedNoteId,
    error,
    fetchAll,
    selectNote,
    createNote,
    updateNote,
    moveNoteToNotebook,
    toggleFavorite,
    deleteNote,
    createFolder,
    renameFolder,
    deleteFolder,
    createNotebook,
    renameNotebook,
    deleteNotebook,
    moveNotebook,
    selectedNote,
  } = useNotesStore()

  const [filter, setFilter] = useState<NotesFilter>({ kind: 'all' })
  // On narrow screens we show either the list or the editor, not both.
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list')

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  const current = selectedNote()

  // The notebook a new note should land in, based on the active filter.
  const activeNotebookId = filter.kind === 'notebook' ? filter.notebookId : null

  const handleNewNote = async () => {
    const created = await createNote({
      title: 'Untitled Note',
      content: '',
      tag: null,
      notebookId: activeNotebookId,
    })
    if (created) {
      selectNote(created.id)
      setMobileView('editor')
    }
  }

  const handleSelectNote = (id: number) => {
    selectNote(id)
    setMobileView('editor')
  }

  // Keyboard shortcuts: Cmd/Ctrl+Alt+N new note; Cmd/Ctrl+K focuses search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault()
        void handleNewNote()
      } else if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        const search = document.querySelector<HTMLInputElement>(
          'input[placeholder="Search notes..."]',
        )
        search?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeNotebookId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Folder / notebook prompt helpers (kept simple; styled dialogs are a future pass).
  const promptCreateFolder = () => {
    const name = window.prompt('New folder name')?.trim()
    if (name) void createFolder(name)
  }
  const promptCreateNotebook = (folderId: number | null) => {
    const name = window.prompt('New notebook name')?.trim()
    if (name) void createNotebook(name, folderId)
  }
  const promptRenameFolder = (id: number, currentName: string) => {
    const name = window.prompt('Rename folder', currentName)?.trim()
    if (name) void renameFolder(id, name)
  }
  const confirmDeleteFolder = (id: number, name: string) => {
    if (
      window.confirm(`Delete folder "${name}"? Its notebooks move to Ungrouped; notes are kept.`)
    ) {
      void deleteFolder(id)
    }
  }
  const promptRenameNotebook = (id: number, currentName: string) => {
    const name = window.prompt('Rename notebook', currentName)?.trim()
    if (name) void renameNotebook(id, name)
  }
  const confirmDeleteNotebook = (id: number, name: string, noteCount: number) => {
    const noteNote =
      noteCount > 0
        ? ` Its ${noteCount} ${noteCount === 1 ? 'note' : 'notes'} will be kept and moved to Unfiled.`
        : ''
    if (window.confirm(`Delete notebook "${name}"?${noteNote}`)) {
      // If we're currently viewing this notebook, fall back to All Notes.
      if (filter.kind === 'notebook' && filter.notebookId === id) {
        setFilter({ kind: 'all' })
      }
      void deleteNotebook(id)
    }
  }

  const navPanel = useMemo(
    () => (
      <NotesNav
        notes={notes}
        notebooks={notebooks}
        folders={folders}
        selectedNoteId={selectedNoteId}
        filter={filter}
        onFilterChange={setFilter}
        onSelectNote={handleSelectNote}
        onNewNote={handleNewNote}
        onCreateFolder={promptCreateFolder}
        onCreateNotebook={promptCreateNotebook}
        onRenameFolder={promptRenameFolder}
        onDeleteFolder={confirmDeleteFolder}
        onRenameNotebook={promptRenameNotebook}
        onDeleteNotebook={confirmDeleteNotebook}
        onMoveNoteToNotebook={(noteId, notebookId) => void moveNoteToNotebook(noteId, notebookId)}
        onMoveNotebookToFolder={(notebookId, folderId) => void moveNotebook(notebookId, folderId)}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notes, notebooks, folders, selectedNoteId, filter],
  )

  return (
    <AppLayout
      title="Notes Library"
      subtitle="All your notes, thoughts, and documents in a simple clean space."
      flush
    >
      {error && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex h-full min-h-0">
        {/* Column 2 — Notes navigation */}
        <div
          className={cn(
            'w-full shrink-0 lg:w-[300px]',
            mobileView === 'editor' && 'hidden lg:block',
          )}
        >
          {navPanel}
        </div>

        {/* Column 3 — Editor */}
        <div
          className={cn(
            'min-w-0 flex-1',
            mobileView === 'list' && 'hidden lg:block',
          )}
        >
          {current ? (
            <NoteEditor
              key={current.id}
              note={current}
              notebooks={notebooks}
              onSave={(patch) =>
                updateNote(current.id, {
                  title: patch.title,
                  content: patch.content,
                  tag: current.tag,
                  favorite: current.favorite,
                  notebookId: current.notebookId,
                })
              }
              onToggleFavorite={() => toggleFavorite(current.id)}
              onDelete={() => {
                void deleteNote(current.id)
                setMobileView('list')
              }}
              onMoveToNotebook={(notebookId) =>
                updateNote(current.id, {
                  title: current.title,
                  content: current.content,
                  tag: current.tag,
                  favorite: current.favorite,
                  notebookId,
                })
              }
              onBack={() => setMobileView('list')}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-white">
              <div className="text-center">
                <p className="text-sm text-ink-muted">Select a note to start writing</p>
                <button
                  onClick={handleNewNote}
                  className="mt-3 rounded-btn bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                >
                  New Note
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
