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
  Clock,
  FileText,
  Folder as FolderIcon,
  FolderPlus,
  MoreHorizontal,
  Plus,
  Search,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { shortDate, timeAgo } from '@/lib/time'
import type { Folder, Note, Notebook } from '@/api/notesApi'

export type NotesFilter =
  | { kind: 'all' }
  | { kind: 'recent' }
  | { kind: 'favorites' }
  | { kind: 'notebook'; notebookId: number }

export interface NotesNavProps {
  notes: Note[]
  notebooks: Notebook[]
  folders: Folder[]
  selectedNoteId: number | null
  filter: NotesFilter
  onFilterChange: (f: NotesFilter) => void
  onSelectNote: (id: number) => void
  onNewNote: () => void
  onCreateFolder: () => void
  onCreateNotebook: (folderId: number | null) => void
  onRenameFolder: (id: number, current: string) => void
  onDeleteFolder: (id: number, name: string) => void
  onRenameNotebook: (id: number, current: string) => void
  onDeleteNotebook: (id: number, name: string, noteCount: number) => void
  onMoveNoteToNotebook: (noteId: number, notebookId: number | null) => void
  onMoveNotebookToFolder: (notebookId: number, folderId: number | null) => void
}

function previewText(content: string | null): string {
  if (!content) return 'No additional text'
  const plain = content
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/[*_`>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return plain || 'No additional text'
}

/** Unified notes navigation: top filters + a Folder → Notebook → Notes tree. */
export function NotesNav(props: NotesNavProps) {
  const {
    notes,
    notebooks,
    folders,
    selectedNoteId,
    filter,
    onFilterChange,
    onSelectNote,
    onNewNote,
    onCreateFolder,
    onCreateNotebook,
    onRenameFolder,
    onDeleteFolder,
    onRenameNotebook,
    onDeleteNotebook,
    onMoveNoteToNotebook,
    onMoveNotebookToFolder,
  } = props

  const [query, setQuery] = useState('')
  const [collapsedFolders, setCollapsedFolders] = useState<Record<number, boolean>>({})
  const [collapsedNotebooks, setCollapsedNotebooks] = useState<Record<number, boolean>>({})
  const [menuFor, setMenuFor] = useState<number | null>(null)
  const [nbMenuFor, setNbMenuFor] = useState<number | null>(null)

  const toggleFolder = (id: number) =>
    setCollapsedFolders((c) => ({ ...c, [id]: !c[id] }))
  const toggleNotebook = (id: number) =>
    setCollapsedNotebooks((c) => ({ ...c, [id]: !c[id] }))

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  // Handles: note → notebook, note → folder (into the folder's first notebook),
  // and notebook → folder.
  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null
    if (!overId) return

    if (activeId.startsWith('note:') && overId.startsWith('nb:')) {
      const noteId = Number(activeId.slice('note:'.length))
      const target = overId.slice('nb:'.length)
      onMoveNoteToNotebook(noteId, target === 'none' ? null : Number(target))
    } else if (activeId.startsWith('note:') && overId.startsWith('folder:')) {
      // A folder can't hold notes directly, so route the note into the
      // folder's first notebook. If the folder has none, ignore the drop.
      const noteId = Number(activeId.slice('note:'.length))
      const folderId = Number(overId.slice('folder:'.length))
      const target = notebooks.find((nb) => nb.folderId === folderId)
      if (target) onMoveNoteToNotebook(noteId, target.id)
    } else if (activeId.startsWith('nb:') && overId.startsWith('folder:')) {
      const notebookId = Number(activeId.slice('nb:'.length))
      const target = overId.slice('folder:'.length)
      onMoveNotebookToFolder(notebookId, target === 'none' ? null : Number(target))
    }
  }

  const notesForNotebook = (notebookId: number) =>
    notes.filter((n) => n.notebookId === notebookId)

  // The flat list is used for All Notes / Recent / Favorites and for search.
  const flatNotes = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q) {
      return notes.filter(
        (n) =>
          n.title.toLowerCase().includes(q) || (n.content ?? '').toLowerCase().includes(q),
      )
    }
    if (filter.kind === 'favorites') return notes.filter((n) => n.favorite)
    return notes // all / recent (store returns updatedAt desc)
  }, [notes, filter, query])

  const searching = query.trim().length > 0
  const showFlatList = searching || filter.kind !== 'notebook'

  const headerLabel =
    filter.kind === 'all'
      ? 'All Notes'
      : filter.kind === 'recent'
        ? 'Recent'
        : filter.kind === 'favorites'
          ? 'Favorites'
          : (notebooks.find((n) => n.id === filter.notebookId)?.name ?? 'Notebook')

  const ungrouped = notebooks.filter((nb) => nb.folderId == null)

  const topItem = (
    label: string,
    icon: React.ReactNode,
    active: boolean,
    onClick: () => void,
    count?: number,
  ) => (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-btn px-2 py-1.5 text-sm transition-colors',
        active ? 'bg-brand-50 text-brand-700' : 'text-ink hover:bg-canvas',
      )}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      {count != null && <span className="text-xs text-ink-subtle">{count}</span>}
    </button>
  )

  // --- Nested note row (inside a notebook in the tree) ---
  const NoteTreeRow = ({ note }: { note: Note }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: `note:${note.id}`,
    })
    const selected = note.id === selectedNoteId
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={() => onSelectNote(note.id)}
        className={cn(
          'flex cursor-pointer items-center justify-between rounded-btn py-1.5 pl-11 pr-2 text-sm transition-colors',
          selected ? 'bg-brand-50 text-brand-700' : 'text-ink hover:bg-canvas',
          isDragging && 'opacity-50',
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 shrink-0 text-ink-subtle" />
          <span className="truncate">{note.title || 'Untitled'}</span>
        </span>
        <span className="shrink-0 pl-2 text-[11px] text-ink-subtle">
          {shortDate(note.updatedAt)}
        </span>
      </div>
    )
  }

  // --- Notebook row (draggable into folders; droppable for notes; expandable) ---
  const NotebookRow = ({ nb, nested }: { nb: Notebook; nested?: boolean }) => {
    const active = filter.kind === 'notebook' && filter.notebookId === nb.id
    const isCollapsed = collapsedNotebooks[nb.id]
    const nbNotes = notesForNotebook(nb.id)

    const drop = useDroppable({ id: `nb:${nb.id}` })
    const drag = useDraggable({ id: `nb:${nb.id}` })

    return (
      <div>
        <div
          ref={drop.setNodeRef}
          className={cn(
            'group flex items-center rounded-btn',
            drop.isOver && 'ring-2 ring-brand-400',
            active ? 'bg-brand-50' : 'hover:bg-canvas',
            drag.isDragging && 'opacity-50',
          )}
        >
          {/* chevron toggles the notebook's note list */}
          <button
            onClick={() => toggleNotebook(nb.id)}
            className={cn('rounded p-0.5 text-ink-subtle hover:text-ink', nested ? 'ml-5' : 'ml-1')}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          {/* label — draggable handle + selects the notebook */}
          <button
            ref={drag.setNodeRef}
            {...drag.listeners}
            {...drag.attributes}
            onClick={() => onFilterChange({ kind: 'notebook', notebookId: nb.id })}
            className={cn(
              'flex min-w-0 flex-1 cursor-grab items-center gap-1.5 py-1.5 pr-1 text-sm active:cursor-grabbing',
              active ? 'text-brand-700' : 'text-ink',
            )}
          >
            <FolderIcon className="h-4 w-4 shrink-0 text-ink-subtle" />
            <span className="truncate">{nb.name}</span>
          </button>
          <span className="px-1 text-xs text-ink-subtle group-hover:hidden">{nb.noteCount}</span>
          <div className="relative hidden group-hover:block">
            <button
              onClick={() => setNbMenuFor(nbMenuFor === nb.id ? null : nb.id)}
              className="rounded p-1 text-ink-subtle hover:bg-white hover:text-ink"
              title="Notebook actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {nbMenuFor === nb.id && (
              <div className="absolute right-0 z-10 mt-1 w-40 rounded-btn border border-line bg-white py-1 shadow-popover">
                <button
                  onClick={() => {
                    onRenameNotebook(nb.id, nb.name)
                    setNbMenuFor(null)
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-canvas"
                >
                  Rename notebook
                </button>
                <button
                  onClick={() => {
                    onDeleteNotebook(nb.id, nb.name, nb.noteCount)
                    setNbMenuFor(null)
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-canvas"
                >
                  Delete notebook
                </button>
              </div>
            )}
          </div>
        </div>

        {/* nested notes */}
        {!isCollapsed &&
          (nbNotes.length === 0 ? (
            <p className={cn('py-1 text-xs text-ink-subtle', nested ? 'pl-16' : 'pl-11')}>
              No notes
            </p>
          ) : (
            nbNotes.map((note) => <NoteTreeRow key={note.id} note={note} />)
          ))}
      </div>
    )
  }

  // --- Folder row (droppable for notebooks; expandable) ---
  const FolderRow = ({ folder }: { folder: Folder }) => {
    const isCollapsed = collapsedFolders[folder.id]
    const children = notebooks.filter((nb) => nb.folderId === folder.id)
    const { setNodeRef, isOver } = useDroppable({ id: `folder:${folder.id}` })
    return (
      <div>
        <div
          ref={setNodeRef}
          className={cn('group flex items-center rounded-btn', isOver && 'ring-2 ring-brand-400')}
        >
          <button
            onClick={() => toggleFolder(folder.id)}
            className="flex flex-1 items-center gap-1 rounded-btn px-2 py-1.5 text-sm font-medium text-ink hover:bg-canvas"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-ink-subtle" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-ink-subtle" />
            )}
            <FolderIcon className="h-4 w-4 text-ink-subtle" />
            <span className="truncate">{folder.name}</span>
          </button>
          <span className="px-1 text-xs text-ink-subtle group-hover:hidden">
            {children.reduce((sum, nb) => sum + nb.noteCount, 0)}
          </span>
          <div className="relative hidden group-hover:block">
            <button
              onClick={() => setMenuFor(menuFor === folder.id ? null : folder.id)}
              className="rounded p-1 text-ink-subtle hover:bg-canvas hover:text-ink"
              title="Folder actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuFor === folder.id && (
              <div className="absolute right-0 z-10 mt-1 w-40 rounded-btn border border-line bg-white py-1 shadow-popover">
                <button
                  onClick={() => {
                    onCreateNotebook(folder.id)
                    setMenuFor(null)
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-canvas"
                >
                  New notebook
                </button>
                <button
                  onClick={() => {
                    onRenameFolder(folder.id, folder.name)
                    setMenuFor(null)
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-canvas"
                >
                  Rename folder
                </button>
                <button
                  onClick={() => {
                    onDeleteFolder(folder.id, folder.name)
                    setMenuFor(null)
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-canvas"
                >
                  Delete folder
                </button>
              </div>
            )}
          </div>
        </div>
        {!isCollapsed &&
          (children.length === 0 ? (
            <p className="pl-9 text-xs text-ink-subtle">No notebooks</p>
          ) : (
            children.map((nb) => <NotebookRow key={nb.id} nb={nb} nested />)
          ))}
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-full flex-col border-r border-line bg-surface">
        {/* Panel header */}
        <div className="flex items-center justify-between px-3 pb-2 pt-3">
          <h2 className="text-sm font-bold text-ink">{headerLabel}</h2>
          <button
            onClick={onNewNote}
            title="New note (Ctrl/Cmd+Alt+N)"
            className="inline-flex items-center gap-1 rounded-btn bg-brand-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-600"
          >
            <Plus className="h-3.5 w-3.5" /> New Note
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes..."
              className="h-8 w-full rounded-btn border border-line bg-canvas pl-8 pr-2 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>

        {/* Scrollable nav + tree */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {/* Top filters */}
          <div className="space-y-0.5">
            {topItem(
              'All Notes',
              <FileText className="h-4 w-4 text-ink-subtle" />,
              filter.kind === 'all',
              () => onFilterChange({ kind: 'all' }),
              notes.length,
            )}
            {topItem(
              'Recent',
              <Clock className="h-4 w-4 text-ink-subtle" />,
              filter.kind === 'recent',
              () => onFilterChange({ kind: 'recent' }),
            )}
            {topItem(
              'Favorites',
              <Star className="h-4 w-4 text-ink-subtle" />,
              filter.kind === 'favorites',
              () => onFilterChange({ kind: 'favorites' }),
              notes.filter((n) => n.favorite).length,
            )}
          </div>

          {/* Notebook tree */}
          <div className="mt-3 flex items-center justify-between px-2 pb-1">
            <span className="text-xs font-semibold tracking-wide text-ink-subtle">NOTEBOOKS</span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={onCreateFolder}
                title="New folder"
                className="rounded p-0.5 text-ink-subtle hover:bg-canvas hover:text-ink"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onCreateNotebook(null)}
                title="New notebook"
                className="rounded p-0.5 text-ink-subtle hover:bg-canvas hover:text-ink"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {folders.map((folder) => (
            <FolderRow key={folder.id} folder={folder} />
          ))}

          {ungrouped.map((nb) => (
            <NotebookRow key={nb.id} nb={nb} />
          ))}

          {/* Flat note list — only for All Notes / Recent / Favorites or while searching */}
          {showFlatList && (
            <div className="mt-3 border-t border-line pt-2">
              <p className="px-2 pb-1 text-xs font-semibold tracking-wide text-ink-subtle">
                {searching
                  ? `${flatNotes.length} ${flatNotes.length === 1 ? 'RESULT' : 'RESULTS'}`
                  : `${flatNotes.length} ${flatNotes.length === 1 ? 'NOTE' : 'NOTES'}`}
              </p>
              <div className="space-y-0.5">
                {flatNotes.map((note) => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    selected={note.id === selectedNoteId}
                    onSelect={() => onSelectNote(note.id)}
                  />
                ))}
                {flatNotes.length === 0 && (
                  <p className="px-2 py-6 text-center text-sm text-ink-muted">
                    {searching ? 'No matching notes.' : 'No notes here yet.'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DndContext>
  )
}

/** A draggable note card used in the flat list (All Notes / Recent / Favorites / search). */
function NoteListItem({
  note,
  selected,
  onSelect,
}: {
  note: Note
  selected: boolean
  onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `note:${note.id}` })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onSelect}
      className={cn(
        'block w-full cursor-pointer rounded-btn border px-2.5 py-2 text-left transition-colors',
        selected ? 'border-brand-200 bg-brand-50' : 'border-transparent hover:bg-canvas',
        isDragging && 'opacity-50',
      )}
    >
      <div className="flex items-center gap-1.5">
        {note.favorite && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-500" />}
        <span className="truncate text-sm font-medium text-ink">{note.title || 'Untitled'}</span>
      </div>
      <p className="mt-0.5 truncate text-xs text-ink-muted">{previewText(note.content)}</p>
      <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-subtle">
        <span className="shrink-0">{timeAgo(note.updatedAt)}</span>
        {note.notebookName && (
          <>
            <span className="text-ink-subtle">·</span>
            <span className="truncate">{note.notebookName}</span>
          </>
        )}
      </div>
    </div>
  )
}
