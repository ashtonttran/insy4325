import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/cn'
import { useNotesStore } from '@/store/notesStore'
import { useNoteLinksStore } from '@/store/noteLinksStore'
import { useTasksStore } from '@/store/tasksStore'
import { useEventsStore } from '@/store/eventsStore'
import { NotesBrowser } from '@/components/notes/NotesBrowser'
import { NoteEditor } from '@/components/notes/NoteEditor'
import { NoteContextMenu } from '@/components/notes/NoteContextMenu'
import { MoveToNotebookDialog } from '@/components/notes/MoveToNotebookDialog'
import { CreateNoteDialog } from '@/components/notes/CreateNoteDialog'
import { CreateNotebookDialog } from '@/components/notes/CreateNotebookDialog'
import { LinkItemDialog } from '@/components/notes/LinkItemDialog'
import { LinkedItems } from '@/components/notes/LinkedItems'
import { TaskDrawer } from '@/components/tasks/TaskDrawer'
import { EventDialog } from '@/components/calendar/EventDialog'
import type { BrowserView } from '@/components/notes/NotesBrowser'
import type { Note, NoteLink, Notebook } from '@/api/notesApi'
import { todayInCentral } from '@/lib/calendar'

/** Notes workspace — a notes browser plus a focused editor with linked items. */
export function Notes() {
  const navigate = useNavigate()
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

  // Tasks/events are needed for the "link existing item" picker.
  const tasks = useTasksStore((s) => s.tasks)
  const fetchTasks = useTasksStore((s) => s.fetchAll)
  const createTask = useTasksStore((s) => s.createTask)
  const selectTask = useTasksStore((s) => s.selectTask)
  const events = useEventsStore((s) => s.events)
  const fetchEvents = useEventsStore((s) => s.fetchAll)

  const lastNotebookId = useNotesStore((s) => s.lastNotebookId)

  // Linked items for the open note.
  const links = useNoteLinksStore((s) => s.links)
  const linksLoading = useNoteLinksStore((s) => s.loading)
  const loadLinks = useNoteLinksStore((s) => s.load)
  const linkItem = useNoteLinksStore((s) => s.link)
  const unlinkItem = useNoteLinksStore((s) => s.unlink)

  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list')
  const [focusMode, setFocusMode] = useState(false)
  // The active destination notebook chosen in the Folders explorer.
  const [selectedNotebookId, setSelectedNotebookId] = useState<number | null>(null)

  // Dialog + menu state
  const [menu, setMenu] = useState<{ note: Note; anchor: { x: number; y: number } } | null>(null)
  const [moveTarget, setMoveTarget] = useState<{ noteIds: number[]; current: number | null } | null>(null)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [eventDraft, setEventDraft] = useState<{ title: string; noteId: number } | null>(null)
  // Create-note dialog (Scenario B); carries the suggested default notebook.
  const [createNoteOpen, setCreateNoteOpen] = useState<{ defaultNotebookId: number | null } | null>(null)
  // Create-notebook dialog; carries an optional preselected parent folder.
  const [createNotebookOpen, setCreateNotebookOpen] = useState<{ defaultFolderId: number | null } | null>(null)

  // Bulk selection
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    void fetchAll()
    void fetchTasks()
    void fetchEvents()
  }, [fetchAll, fetchTasks, fetchEvents])

  const current = selectedNote()

  // Keep the linked-items panel in sync with the open note.
  useEffect(() => {
    void loadLinks(current?.id ?? null)
  }, [current?.id, loadLinks])

  const handleSelectNote = (id: number) => {
    selectNote(id)
    setMobileView('editor')
  }

  /* --------------------------------------------- context-aware creation */

  // Create a note in a specific notebook and open it immediately for editing.
  const createNoteIn = async (title: string, notebookId: number | null): Promise<Note | null> => {
    const created = await createNote({
      title: title.trim() || 'Untitled Note',
      content: '',
      tag: null,
      notebookId,
    })
    if (created) {
      selectNote(created.id)
      setMobileView('editor')
    }
    return created
  }

  /**
   * Context-aware "New Note" from the unified menu:
   *  - Folders view with a notebook selected → one-click create in it.
   *  - Otherwise → open the dialog with the last-used notebook suggested.
   * (We deliberately never infer from the currently open note's notebook.)
   */
  const handleNewNote = (ctx: { view: BrowserView; notebookId: number | null }) => {
    if (ctx.view === 'folders' && ctx.notebookId != null) {
      void createNoteIn('', ctx.notebookId)
    } else {
      setCreateNoteOpen({ defaultNotebookId: lastNotebookId })
    }
  }

  // Explicit "New note here" on a notebook — immediate create, no dialog.
  const handleNewNoteInNotebook = (notebookId: number) => {
    setSelectedNotebookId(notebookId)
    void createNoteIn('', notebookId)
  }

  // "New note here" on a folder — create in the folder's first notebook.
  const handleNewNoteInFolder = (folderId: number) => {
    const target = notebooks.find((nb) => nb.folderId === folderId)
    if (target) {
      setSelectedNotebookId(target.id)
      void createNoteIn('', target.id)
    } else {
      // Folder has no notebooks yet — fall back to the dialog to pick/create one.
      setCreateNoteOpen({ defaultNotebookId: null })
    }
  }

  // Keyboard shortcut: Cmd/Ctrl+Alt+N — mirrors the New-menu behavior.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault()
        if (selectedNotebookId != null) void createNoteIn('', selectedNotebookId)
        else setCreateNoteOpen({ defaultNotebookId: lastNotebookId })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedNotebookId, lastNotebookId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Create a notebook via the store, returning the new Notebook (for selection).
  const createNotebookReturning = async (
    name: string,
    folderId: number | null,
  ): Promise<Notebook | null> => {
    await createNotebook(name, folderId)
    // The store refreshes the list; find the newly created notebook by name.
    const match = useNotesStore
      .getState()
      .notebooks.filter((nb) => nb.name === name && nb.folderId === (folderId ?? null))
    return match[match.length - 1] ?? null
  }

  /* ----------------------------------------------------- integrations */

  // Create a task from a note, link it, and open the task editor.
  const createTaskFromNote = async (note: Note) => {
    const created = await createTask({
      title: `Review ${note.title}`.slice(0, 120),
      status: 'TODO',
      priority: 'MEDIUM',
      subtasks: [],
    })
    if (created) {
      // Ensure links are loaded for this note, then link + open the drawer.
      await loadLinks(note.id)
      await linkItem('TASK', created.id)
      selectTask(created.id)
    }
  }

  // Open the event dialog prefilled to schedule a study session for a note.
  const scheduleStudySession = async (note: Note) => {
    await loadLinks(note.id)
    setEventDraft({ title: `Study: ${note.title}`.slice(0, 120), noteId: note.id })
  }

  /* -------------------------------------------------------- bulk move */

  const clearSelection = () => {
    setSelectedIds(new Set())
    setSelectionMode(false)
  }
  const toggleSelected = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const doMove = async (noteIds: number[], notebookId: number | null) => {
    for (const id of noteIds) {
      await moveNoteToNotebook(id, notebookId)
    }
  }

  /* -------- folder / notebook management (reuses the notes store) -------- */
  // Lightweight prompts keep management in one place without new dialogs.
  const promptCreateFolder = () => {
    const name = window.prompt('New folder name')?.trim()
    if (name) void createFolder(name)
  }
  const promptRenameFolder = (id: number, current: string) => {
    const name = window.prompt('Rename folder', current)?.trim()
    if (name) void renameFolder(id, name)
  }
  const confirmDeleteFolder = (id: number, name: string) => {
    if (window.confirm(`Delete folder "${name}"? Its notebooks move to Ungrouped; notes are kept.`)) {
      void deleteFolder(id)
    }
  }
  const promptRenameNotebook = (id: number, current: string) => {
    const name = window.prompt('Rename notebook', current)?.trim()
    if (name) void renameNotebook(id, name)
  }
  const confirmDeleteNotebook = (id: number, name: string, noteCount: number) => {
    const suffix =
      noteCount > 0
        ? ` Its ${noteCount} ${noteCount === 1 ? 'note' : 'notes'} will be kept and moved to Unfiled.`
        : ''
    if (window.confirm(`Delete notebook "${name}"?${suffix}`)) {
      void deleteNotebook(id)
    }
  }

  return (
    <AppLayout title="Notes" subtitle="All your notes, thoughts, and documents in one place." flush>
      {error && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex h-full min-h-0">
        {/* Notes browser */}
        <div
          className={cn(
            'w-full shrink-0 lg:w-[340px]',
            mobileView === 'editor' && 'hidden lg:block',
            focusMode && 'lg:hidden',
          )}
        >
          <NotesBrowser
            notes={notes}
            notebooks={notebooks}
            folders={folders}
            selectedNoteId={selectedNoteId}
            selectedNotebookId={selectedNotebookId}
            onSelectNote={handleSelectNote}
            onSelectNotebook={setSelectedNotebookId}
            onNewNote={handleNewNote}
            onNewNotebook={() => setCreateNotebookOpen({ defaultFolderId: null })}
            onNewNoteInNotebook={handleNewNoteInNotebook}
            onNewNoteInFolder={handleNewNoteInFolder}
            onToggleFavorite={(id) => void toggleFavorite(id)}
            onOpenMenu={(note, anchor) => setMenu({ note, anchor })}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelectionMode={() => {
              setSelectionMode((v) => !v)
              setSelectedIds(new Set())
            }}
            onToggleSelected={toggleSelected}
            onBulkMove={() =>
              setMoveTarget({ noteIds: Array.from(selectedIds), current: null })
            }
            onClearSelection={clearSelection}
            onCreateFolder={promptCreateFolder}
            onCreateNotebook={(folderId) => setCreateNotebookOpen({ defaultFolderId: folderId })}
            onRenameFolder={promptRenameFolder}
            onDeleteFolder={confirmDeleteFolder}
            onRenameNotebook={promptRenameNotebook}
            onDeleteNotebook={confirmDeleteNotebook}
            onMoveNoteToNotebook={(noteId, notebookId) => void moveNoteToNotebook(noteId, notebookId)}
            onMoveNotebookToFolder={(notebookId, folderId) => void moveNotebook(notebookId, folderId)}
          />
        </div>

        {/* Editor */}
        <div className={cn('min-w-0 flex-1', mobileView === 'list' && 'hidden lg:block')}>
          {current ? (
            <NoteEditor
              key={current.id}
              note={current}
              notebooks={notebooks}
              focusMode={focusMode}
              onToggleFocus={() => setFocusMode((v) => !v)}
              onBreadcrumbClick={() =>
                setMoveTarget({ noteIds: [current.id], current: current.notebookId })
              }
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
              onMoveToNotebook={(notebookId) => void moveNoteToNotebook(current.id, notebookId)}
              onBack={() => setMobileView('list')}
              belowContent={
                <LinkedItems
                  links={links}
                  loading={linksLoading}
                  onOpen={openLinkedItem}
                  onUnlink={(l) => void unlinkItem(l.id)}
                  onLinkExisting={() => setLinkDialogOpen(true)}
                />
              }
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-white">
              <EmptyState
                icon={FileText}
                title="Select a note to start writing"
                description="Choose a note from the list, or create a new one."
                action={
                  <Button
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => setCreateNoteOpen({ defaultNotebookId: lastNotebookId })}
                  >
                    New Note
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Per-note context menu */}
      {menu && (
        <NoteContextMenu
          note={menu.note}
          anchor={menu.anchor}
          onClose={() => setMenu(null)}
          actions={{
            onToggleFavorite: () => void toggleFavorite(menu.note.id),
            onMove: () =>
              setMoveTarget({ noteIds: [menu.note.id], current: menu.note.notebookId }),
            onCreateTask: () => void createTaskFromNote(menu.note),
            onScheduleStudy: () => void scheduleStudySession(menu.note),
            onLinkExisting: () => {
              selectNote(menu.note.id)
              setLinkDialogOpen(true)
            },
            onDelete: () => {
              if (window.confirm(`Delete "${menu.note.title}"? This cannot be undone.`)) {
                void deleteNote(menu.note.id)
              }
            },
          }}
        />
      )}

      {/* Move to notebook (single or bulk) */}
      {moveTarget && (
        <MoveToNotebookDialog
          notebooks={notebooks}
          folders={folders}
          currentNotebookId={moveTarget.current}
          count={moveTarget.noteIds.length}
          onCancel={() => setMoveTarget(null)}
          onConfirm={async (notebookId) => {
            await doMove(moveTarget.noteIds, notebookId)
            setMoveTarget(null)
            clearSelection()
          }}
          onCreateNotebook={async (name) => createNotebookReturning(name, null)}
        />
      )}

      {/* Create note (title + searchable notebook destination) */}
      {createNoteOpen && (
        <CreateNoteDialog
          notebooks={notebooks}
          folders={folders}
          defaultNotebookId={createNoteOpen.defaultNotebookId}
          onCancel={() => setCreateNoteOpen(null)}
          onCreate={async (title, notebookId) => {
            const created = await createNoteIn(title, notebookId)
            if (created) {
              setSelectedNotebookId(notebookId)
              setCreateNoteOpen(null)
              return true
            }
            return false
          }}
          onCreateNotebook={createNotebookReturning}
        />
      )}

      {/* Create notebook (styled dialog replacing window.prompt) */}
      {createNotebookOpen && (
        <CreateNotebookDialog
          folders={folders}
          defaultFolderId={createNotebookOpen.defaultFolderId}
          onCancel={() => setCreateNotebookOpen(null)}
          onCreate={async (name, folderId) => {
            const nb = await createNotebookReturning(name, folderId)
            if (nb) {
              setSelectedNotebookId(nb.id)
              setCreateNotebookOpen(null)
              return true
            }
            return false
          }}
        />
      )}

      {/* Link an existing task/event to the current note */}
      {linkDialogOpen && current && (
        <LinkItemDialog
          tasks={tasks}
          events={events}
          existingLinks={links}
          onCancel={() => setLinkDialogOpen(false)}
          onLink={(type, id) => {
            void linkItem(type, id)
            setLinkDialogOpen(false)
          }}
        />
      )}

      {/* Schedule study session — create an event, then link it */}
      {eventDraft && (
        <EventDialog
          event={null}
          defaultDate={todayInCentral()}
          defaultTitle={eventDraft.title}
          onClose={() => setEventDraft(null)}
          onCreated={(created) => {
            void (async () => {
              await loadLinks(eventDraft.noteId)
              await linkItem('EVENT', created.id)
            })()
          }}
        />
      )}

      {/* Task editor opens in place when a linked task is opened */}
      <TaskDrawer />
    </AppLayout>
  )

  // Open a linked item in its own workspace.
  function openLinkedItem(link: NoteLink) {
    if (link.targetType === 'TASK') {
      selectTask(link.targetId)
    } else {
      navigate('/calendar')
    }
  }
}
