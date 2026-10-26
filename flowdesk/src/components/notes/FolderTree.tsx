import { useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder as FolderIcon,
  FolderPlus,
  MoreHorizontal,
  NotebookText,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { shortDate } from '@/lib/time'
import type { Folder, Note, Notebook } from '@/api/notesApi'

/**
 * A collapsible Folder → Notebook → Note explorer that renders inside the
 * notes browser's "Folders" view. Reuses the project's existing two-level
 * hierarchy (folders group notebooks; notebooks hold notes) and the existing
 * notebook/folder management + drag-and-drop persistence — this component only
 * renders the tree and reports intent via callbacks.
 */
export interface FolderTreeProps {
  notes: Note[]
  notebooks: Notebook[]
  folders: Folder[]
  selectedNoteId: number | null
  /** Optional query: filters notes (and surfaces matching folders/notebooks). */
  query?: string
  onSelectNote: (id: number) => void
  onCreateFolder: () => void
  onCreateNotebook: (folderId: number | null) => void
  onRenameFolder: (id: number, current: string) => void
  onDeleteFolder: (id: number, name: string) => void
  onRenameNotebook: (id: number, current: string) => void
  onDeleteNotebook: (id: number, name: string, noteCount: number) => void
  onMoveNoteToNotebook: (noteId: number, notebookId: number | null) => void
  onMoveNotebookToFolder: (notebookId: number, folderId: number | null) => void
}

export function FolderTree({
  notes,
  notebooks,
  folders,
  selectedNoteId,
  query = '',
  onSelectNote,
  onCreateFolder,
  onCreateNotebook,
  onRenameFolder,
  onDeleteFolder,
  onRenameNotebook,
  onDeleteNotebook,
  onMoveNoteToNotebook,
  onMoveNotebookToFolder,
}: FolderTreeProps) {
  // Expanded state keyed by stable ids; survives note selection changes.
  const [collapsedFolders, setCollapsedFolders] = useState<Record<number, boolean>>({})
  const [collapsedNotebooks, setCollapsedNotebooks] = useState<Record<number, boolean>>({})
  const [folderMenu, setFolderMenu] = useState<number | null>(null)
  const [nbMenu, setNbMenu] = useState<number | null>(null)

  const q = query.trim().toLowerCase()
  const searching = q.length > 0

  const toggleFolder = (id: number) => setCollapsedFolders((c) => ({ ...c, [id]: !c[id] }))
  const toggleNotebook = (id: number) => setCollapsedNotebooks((c) => ({ ...c, [id]: !c[id] }))

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null
    if (!overId) return
    if (activeId.startsWith('note:') && overId.startsWith('nb:')) {
      const noteId = Number(activeId.slice(5))
      const target = overId.slice(3)
      onMoveNoteToNotebook(noteId, target === 'none' ? null : Number(target))
    } else if (activeId.startsWith('note:') && overId.startsWith('folder:')) {
      const noteId = Number(activeId.slice(5))
      const folderId = Number(overId.slice(7))
      const target = notebooks.find((nb) => nb.folderId === folderId)
      if (target) onMoveNoteToNotebook(noteId, target.id)
    } else if (activeId.startsWith('nb:') && overId.startsWith('folder:')) {
      const notebookId = Number(activeId.slice(3))
      const target = overId.slice(7)
      onMoveNotebookToFolder(notebookId, target === 'none' ? null : Number(target))
    }
  }

  const notesForNotebook = (notebookId: number) => {
    const list = notes.filter((n) => n.notebookId === notebookId)
    if (!searching) return list
    return list.filter(
      (n) => n.title.toLowerCase().includes(q) || (n.content ?? '').toLowerCase().includes(q),
    )
  }

  const notebookMatches = (nb: Notebook) => !searching || nb.name.toLowerCase().includes(q)
  const folderNameMatches = (f: Folder) => !searching || f.name.toLowerCase().includes(q)

  // While searching, auto-reveal the tree rather than respecting collapse state.
  const folderOpen = (id: number) => (searching ? true : !collapsedFolders[id])
  const notebookOpen = (id: number) => (searching ? true : !collapsedNotebooks[id])

  /** Direct note count for a notebook. */
  const directCount = (nb: Notebook) => nb.noteCount
  /** Total descendant note count for a folder (sum of its notebooks). */
  const folderCount = (folderId: number) =>
    notebooks
      .filter((nb) => nb.folderId === folderId)
      .reduce((sum, nb) => sum + nb.noteCount, 0)

  const ungrouped = notebooks.filter((nb) => nb.folderId == null)

  // When searching, keep a folder/notebook only if it (or a descendant) matches.
  const folderVisible = (f: Folder) => {
    if (!searching) return true
    if (folderNameMatches(f)) return true
    return notebooks.some(
      (nb) => nb.folderId === f.id && (notebookMatches(nb) || notesForNotebook(nb.id).length > 0),
    )
  }
  const notebookVisible = (nb: Notebook) =>
    !searching || notebookMatches(nb) || notesForNotebook(nb.id).length > 0

  const empty = useMemo(
    () => folders.length === 0 && notebooks.length === 0,
    [folders.length, notebooks.length],
  )

  /* ------------------------------------------------------------ rows */

  const NoteRow = ({ note, depth }: { note: Note; depth: number }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `note:${note.id}` })
    const selected = note.id === selectedNoteId
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={() => onSelectNote(note.id)}
        title={note.title || 'Untitled'}
        style={{ paddingLeft: depth * 16 + 8 }}
        className={cn(
          'flex cursor-pointer items-center justify-between rounded-btn py-1.5 pr-2 text-sm transition-colors',
          selected ? 'bg-brand-50 text-brand-700' : 'text-ink hover:bg-canvas',
          isDragging && 'opacity-50',
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 shrink-0 text-ink-subtle" />
          <span className="truncate">{note.title || 'Untitled'}</span>
        </span>
        <span className="shrink-0 pl-2 text-[11px] text-ink-subtle">{shortDate(note.updatedAt)}</span>
      </div>
    )
  }

  const NotebookRow = ({ nb, depth }: { nb: Notebook; depth: number }) => {
    const open = notebookOpen(nb.id)
    const nbNotes = notesForNotebook(nb.id)
    const drop = useDroppable({ id: `nb:${nb.id}` })
    const drag = useDraggable({ id: `nb:${nb.id}` })
    return (
      <div>
        <div
          ref={drop.setNodeRef}
          style={{ paddingLeft: depth * 16 }}
          className={cn(
            'group flex items-center rounded-btn',
            drop.isOver && 'ring-2 ring-brand-400',
            drag.isDragging && 'opacity-50 hover:bg-canvas',
          )}
        >
          <button
            onClick={() => toggleNotebook(nb.id)}
            className="rounded p-0.5 text-ink-subtle hover:text-ink"
            aria-label={open ? 'Collapse notebook' : 'Expand notebook'}
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          <button
            ref={drag.setNodeRef}
            {...drag.listeners}
            {...drag.attributes}
            onClick={() => toggleNotebook(nb.id)}
            title={nb.name}
            className="flex min-w-0 flex-1 cursor-grab items-center gap-1.5 py-1.5 pr-1 text-sm text-ink active:cursor-grabbing"
          >
            <NotebookText className="h-4 w-4 shrink-0 text-ink-subtle" />
            <span className="truncate">{nb.name}</span>
          </button>
          <span className="px-1 text-xs text-ink-subtle group-hover:hidden" title={`${directCount(nb)} notes`}>
            {directCount(nb)}
          </span>
          <div className="relative hidden group-hover:block">
            <button
              onClick={() => setNbMenu(nbMenu === nb.id ? null : nb.id)}
              className="rounded p-1 text-ink-subtle hover:bg-white hover:text-ink"
              aria-label="Notebook actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {nbMenu === nb.id && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setNbMenu(null)} aria-hidden />
                <div className="absolute right-0 z-20 mt-1 w-40 rounded-btn border border-line bg-white py-1 shadow-popover">
                  <MenuBtn label="Rename notebook" onClick={() => { onRenameNotebook(nb.id, nb.name); setNbMenu(null) }} />
                  <MenuBtn label="Delete notebook" destructive onClick={() => { onDeleteNotebook(nb.id, nb.name, nb.noteCount); setNbMenu(null) }} />
                </div>
              </>
            )}
          </div>
        </div>
        {open &&
          (nbNotes.length === 0 ? (
            <p style={{ paddingLeft: (depth + 1) * 16 + 8 }} className="py-1 text-xs text-ink-subtle">
              No notes
            </p>
          ) : (
            nbNotes.map((note) => <NoteRow key={note.id} note={note} depth={depth + 1} />)
          ))}
      </div>
    )
  }

  const FolderRow = ({ folder }: { folder: Folder }) => {
    const open = folderOpen(folder.id)
    const children = notebooks.filter((nb) => nb.folderId === folder.id && notebookVisible(nb))
    const { setNodeRef, isOver } = useDroppable({ id: `folder:${folder.id}` })
    return (
      <div>
        <div
          ref={setNodeRef}
          className={cn('group flex items-center rounded-btn', isOver && 'ring-2 ring-brand-400')}
        >
          <button
            onClick={() => toggleFolder(folder.id)}
            title={folder.name}
            className="flex min-w-0 flex-1 items-center gap-1 rounded-btn px-2 py-1.5 text-sm font-medium text-ink hover:bg-canvas"
          >
            {open ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-subtle" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-subtle" />
            )}
            <FolderIcon className="h-4 w-4 shrink-0 text-ink-subtle" />
            <span className="truncate">{folder.name}</span>
          </button>
          <span className="px-1 text-xs text-ink-subtle group-hover:hidden" title={`${folderCount(folder.id)} notes`}>
            {folderCount(folder.id)}
          </span>
          <div className="relative hidden group-hover:block">
            <button
              onClick={() => setFolderMenu(folderMenu === folder.id ? null : folder.id)}
              className="rounded p-1 text-ink-subtle hover:bg-canvas hover:text-ink"
              aria-label="Folder actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {folderMenu === folder.id && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setFolderMenu(null)} aria-hidden />
                <div className="absolute right-0 z-20 mt-1 w-44 rounded-btn border border-line bg-white py-1 shadow-popover">
                  <MenuBtn label="New notebook" onClick={() => { onCreateNotebook(folder.id); setFolderMenu(null) }} />
                  <MenuBtn label="Rename folder" onClick={() => { onRenameFolder(folder.id, folder.name); setFolderMenu(null) }} />
                  <MenuBtn label="Delete folder" destructive onClick={() => { onDeleteFolder(folder.id, folder.name); setFolderMenu(null) }} />
                </div>
              </>
            )}
          </div>
        </div>
        {open &&
          (children.length === 0 ? (
            <p className="py-1 pl-9 text-xs text-ink-subtle">No notebooks</p>
          ) : (
            children.map((nb) => <NotebookRow key={nb.id} nb={nb} depth={1} />)
          ))}
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {/* Create actions */}
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
          Notebooks
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onCreateFolder}
            aria-label="New folder"
            title="New folder"
            className="rounded p-1 text-ink-subtle hover:bg-canvas hover:text-ink"
          >
            <FolderPlus className="h-4 w-4" />
          </button>
          <button
            onClick={() => onCreateNotebook(null)}
            aria-label="New notebook"
            title="New notebook"
            className="rounded p-1 text-ink-subtle hover:bg-canvas hover:text-ink"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {empty ? (
        <p className="px-2 py-6 text-center text-sm text-ink-subtle">
          No notebooks yet. Create one to organize your notes.
        </p>
      ) : (
        <div className="space-y-0.5">
          {folders.filter(folderVisible).map((folder) => (
            <FolderRow key={folder.id} folder={folder} />
          ))}
          {/* Ungrouped notebooks (no folder) */}
          {ungrouped.filter(notebookVisible).map((nb) => (
            <NotebookRow key={nb.id} nb={nb} depth={0} />
          ))}
          {searching &&
            folders.filter(folderVisible).length === 0 &&
            ungrouped.filter(notebookVisible).length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-ink-subtle">No matches.</p>
            )}
        </div>
      )}
    </DndContext>
  )
}

function MenuBtn({
  label,
  onClick,
  destructive,
}: {
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'block w-full px-3 py-1.5 text-left text-sm hover:bg-canvas',
        destructive ? 'text-red-600' : 'text-ink',
      )}
    >
      {label}
    </button>
  )
}
