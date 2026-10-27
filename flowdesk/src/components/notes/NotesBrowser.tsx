import { useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  Clock,
  FileText,
  Folder as FolderIcon,
  LayoutGrid,
  List as ListIcon,
  MoreHorizontal,
  NotebookText,
  Plus,
  Search,
  Star,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/time'
import type { Folder, Note, Notebook } from '@/api/notesApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { FolderTree } from '@/components/notes/FolderTree'

/** Top-level browser view. "folders" shows the explorer; the rest are flat lists. */
export type BrowserView = 'all' | 'folders' | 'favorites' | 'recent'
export type SortKey = 'edited' | 'created' | 'title'
export type ViewMode = 'list' | 'grid'

const VIEWS: { value: BrowserView; label: string; icon: LucideIcon }[] = [
  { value: 'all', label: 'All Notes', icon: FileText },
  { value: 'folders', label: 'Folders', icon: FolderIcon },
  { value: 'favorites', label: 'Favorites', icon: Star },
  { value: 'recent', label: 'Recent', icon: Clock },
]

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'edited', label: 'Last edited' },
  { value: 'created', label: 'Date created' },
  { value: 'title', label: 'Title A–Z' },
]

export interface NotesBrowserProps {
  notes: Note[]
  notebooks: Notebook[]
  folders: Folder[]
  selectedNoteId: number | null
  /** Active destination notebook in Folders view (for context-aware creation). */
  selectedNotebookId: number | null
  onSelectNote: (id: number) => void
  onSelectNotebook: (id: number) => void
  /** Context-aware "New Note": the page decides one-click vs dialog. */
  onNewNote: (ctx: { view: BrowserView; notebookId: number | null }) => void
  /** Open the "create notebook" dialog. */
  onNewNotebook: () => void
  /** Explicit, immediate creation inside a specific notebook/folder. */
  onNewNoteInNotebook: (notebookId: number) => void
  onNewNoteInFolder: (folderId: number) => void
  onToggleFavorite: (id: number) => void
  onOpenMenu: (note: Note, anchor: { x: number; y: number }) => void
  /** Bulk-selection state lifted to the page so the page can run the bulk move. */
  selectionMode: boolean
  selectedIds: Set<number>
  onToggleSelectionMode: () => void
  onToggleSelected: (id: number) => void
  onBulkMove: () => void
  onClearSelection: () => void
  /** Folder/notebook management, reused from the store via the page. */
  onCreateFolder: () => void
  onCreateNotebook: (folderId: number | null) => void
  onRenameFolder: (id: number, current: string) => void
  onDeleteFolder: (id: number, name: string) => void
  onRenameNotebook: (id: number, current: string) => void
  onDeleteNotebook: (id: number, name: string, noteCount: number) => void
  onMoveNoteToNotebook: (noteId: number, notebookId: number | null) => void
  onMoveNotebookToFolder: (notebookId: number, folderId: number | null) => void
}

/**
 * The notes browser: a searchable, sortable collection of all notes with
 * list/grid views and favorites/recent filters — independent of notebook
 * location. This is the primary way to browse notes.
 */
export function NotesBrowser({
  notes,
  notebooks,
  folders,
  selectedNoteId,
  selectedNotebookId,
  onSelectNote,
  onSelectNotebook,
  onNewNote,
  onNewNotebook,
  onNewNoteInNotebook,
  onNewNoteInFolder,
  onToggleFavorite,
  onOpenMenu,
  selectionMode,
  selectedIds,
  onToggleSelectionMode,
  onToggleSelected,
  onBulkMove,
  onClearSelection,
  onCreateFolder,
  onCreateNotebook,
  onRenameFolder,
  onDeleteFolder,
  onRenameNotebook,
  onDeleteNotebook,
  onMoveNoteToNotebook,
  onMoveNotebookToFolder,
}: NotesBrowserProps) {
  const [topView, setTopView] = useState<BrowserView>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('edited')
  const [view, setView] = useState<ViewMode>('list')
  const [newMenuOpen, setNewMenuOpen] = useState(false)

  const isFolders = topView === 'folders'

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = notes.slice()

    if (topView === 'favorites') list = list.filter((n) => n.favorite)
    if (topView === 'recent') {
      list = list
        .slice()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 10)
    }

    if (q) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.content ?? '').toLowerCase().includes(q),
      )
    }

    const sorted = list.slice()
    if (sort === 'edited') sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    else if (sort === 'created') sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    else sorted.sort((a, b) => a.title.localeCompare(b.title))
    return sorted
  }, [notes, topView, query, sort])

  return (
    <div className="flex h-full flex-col border-r border-line bg-surface">
      {/* Row 1 — heading + unified New menu */}
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <h2 className="text-sm font-bold text-ink">My Notes</h2>
        <div className="relative">
          <button
            onClick={() => setNewMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={newMenuOpen}
            className="inline-flex shrink-0 items-center gap-1 rounded-btn bg-brand-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <Plus className="h-3.5 w-3.5" /> New
            <ChevronDown className="h-3 w-3" />
          </button>
          {newMenuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setNewMenuOpen(false)} aria-hidden />
              <div
                role="menu"
                className="absolute right-0 z-40 mt-1 w-56 overflow-hidden rounded-card border border-line bg-white py-1 shadow-popover"
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    setNewMenuOpen(false)
                    onNewNote({ view: topView, notebookId: isFolders ? selectedNotebookId : null })
                  }}
                  className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-canvas"
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                  <span>
                    <span className="block text-sm font-medium text-ink">New note</span>
                    <span className="block text-xs text-ink-subtle">
                      Create a new note in a selected notebook
                    </span>
                  </span>
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setNewMenuOpen(false)
                    onNewNotebook()
                  }}
                  className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-canvas"
                >
                  <NotebookText className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                  <span>
                    <span className="block text-sm font-medium text-ink">New notebook</span>
                    <span className="block text-xs text-ink-subtle">
                      Create a new folder to organize notes
                    </span>
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 2 — four equal-width navigation options (icon over label) */}
      <nav className="mt-2.5 grid grid-cols-4 gap-1 px-3" aria-label="Notes views">
        {VIEWS.map((v) => {
          const active = topView === v.value
          const Icon = v.icon
          return (
            <button
              key={v.value}
              onClick={() => setTopView(v.value)}
              aria-pressed={active}
              className={cn(
                'flex flex-col items-center gap-1 rounded-btn px-1 py-2 text-[11px] font-medium transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-ink-muted hover:bg-canvas hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="w-full truncate text-center">{v.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Search */}
      <div className="px-3 pt-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isFolders ? 'Search notes and folders...' : 'Search notes...'}
            className="h-9 w-full rounded-btn border border-line bg-canvas pl-9 pr-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      {/* Sort + view toggle + select — hidden in the Folders explorer */}
      {!isFolders && (
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <SortMenu value={sort} onChange={setSort} />
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleSelectionMode}
            aria-pressed={selectionMode}
            className={cn(
              'rounded-btn border px-2 py-1 text-xs font-medium transition-colors',
              selectionMode
                ? 'border-brand-200 bg-brand-50 text-brand-700'
                : 'border-line bg-white text-ink-muted hover:bg-canvas',
            )}
          >
            Select
          </button>
          <div className="flex rounded-btn border border-line bg-white p-0.5">
            <button
              onClick={() => setView('list')}
              aria-label="List view"
              aria-pressed={view === 'list'}
              className={cn(
                'rounded px-2 py-1 transition-colors',
                view === 'list' ? 'bg-brand-50 text-brand-700' : 'text-ink-subtle hover:bg-canvas',
              )}
            >
              <ListIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('grid')}
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
              className={cn(
                'rounded px-2 py-1 transition-colors',
                view === 'grid' ? 'bg-brand-50 text-brand-700' : 'text-ink-subtle hover:bg-canvas',
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Bulk selection bar */}
      {!isFolders && selectionMode && (
        <div className="mx-3 mb-1 flex items-center justify-between rounded-btn border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm">
          <span className="font-medium text-brand-700">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onBulkMove}
              disabled={selectedIds.size === 0}
              className="rounded-btn bg-brand-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              Move
            </button>
            <button
              onClick={onClearSelection}
              aria-label="Cancel selection"
              className="rounded p-1 text-ink-subtle hover:bg-white hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Folders explorer */}
      {isFolders ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-1">
          <FolderTree
            notes={notes}
            notebooks={notebooks}
            folders={folders}
            selectedNoteId={selectedNoteId}
            selectedNotebookId={selectedNotebookId}
            query={query}
            onSelectNote={onSelectNote}
            onSelectNotebook={onSelectNotebook}
            onCreateFolder={onCreateFolder}
            onCreateNotebook={onCreateNotebook}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
            onRenameNotebook={onRenameNotebook}
            onDeleteNotebook={onDeleteNotebook}
            onMoveNoteToNotebook={onMoveNoteToNotebook}
            onMoveNotebookToFolder={onMoveNotebookToFolder}
            onNewNoteInNotebook={onNewNoteInNotebook}
            onNewNoteInFolder={onNewNoteInFolder}
          />
        </div>
      ) : (
      /* Note list / grid */
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {visible.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={query.trim() ? 'No matching notes' : 'No notes yet'}
            description={
              query.trim()
                ? 'Try a different search term.'
                : 'Create your first note to get started.'
            }
          />
        ) : view === 'list' ? (
          <ul className="space-y-1">
            {visible.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                selected={note.id === selectedNoteId}
                selectionMode={selectionMode}
                checked={selectedIds.has(note.id)}
                onSelect={() => (selectionMode ? onToggleSelected(note.id) : onSelectNote(note.id))}
                onToggleFavorite={() => onToggleFavorite(note.id)}
                onOpenMenu={(anchor) => onOpenMenu(note, anchor)}
              />
            ))}
          </ul>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {visible.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                selected={note.id === selectedNoteId}
                selectionMode={selectionMode}
                checked={selectedIds.has(note.id)}
                onSelect={() => (selectionMode ? onToggleSelected(note.id) : onSelectNote(note.id))}
                onToggleFavorite={() => onToggleFavorite(note.id)}
                onOpenMenu={(anchor) => onOpenMenu(note, anchor)}
              />
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  )
}

function SortMenu({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  const [open, setOpen] = useState(false)
  const label = SORTS.find((s) => s.value === value)?.label ?? 'Sort'
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-btn border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-canvas"
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 top-8 z-40 w-40 overflow-hidden rounded-card border border-line bg-white py-1 shadow-popover">
            {SORTS.map((s) => (
              <button
                key={s.value}
                onClick={() => {
                  onChange(s.value)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-canvas',
                  s.value === value ? 'text-brand-700' : 'text-ink',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface RowProps {
  note: Note
  selected: boolean
  selectionMode: boolean
  checked: boolean
  onSelect: () => void
  onToggleFavorite: () => void
  onOpenMenu: (anchor: { x: number; y: number }) => void
}

function NoteRow({
  note,
  selected,
  selectionMode,
  checked,
  onSelect,
  onToggleFavorite,
  onOpenMenu,
}: RowProps) {
  const menuBtn = useRef<HTMLButtonElement>(null)
  return (
    <li
      onClick={onSelect}
      className={cn(
        'group flex cursor-pointer items-start gap-2 rounded-btn px-2.5 py-2 transition-colors',
        selected ? 'bg-brand-50' : 'hover:bg-canvas',
      )}
    >
      {selectionMode ? (
        <input
          type="checkbox"
          checked={checked}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand-500 focus:ring-brand-400"
        />
      ) : (
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'truncate text-sm font-medium',
              selected ? 'text-brand-700' : 'text-ink',
            )}
          >
            {note.title || 'Untitled'}
          </span>
          {note.favorite && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-subtle">
          <span className="truncate">{note.notebookName ?? 'Unfiled'}</span>
          <span>·</span>
          <span className="shrink-0">Edited {timeAgo(note.updatedAt)}</span>
        </div>
      </div>
      {!selectionMode && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite()
            }}
            aria-label={note.favorite ? 'Unfavorite' : 'Favorite'}
            className="rounded p-1 text-ink-subtle hover:bg-white hover:text-amber-500"
          >
            <Star className={cn('h-3.5 w-3.5', note.favorite && 'fill-amber-400 text-amber-400')} />
          </button>
          <button
            ref={menuBtn}
            onClick={(e) => {
              e.stopPropagation()
              const r = menuBtn.current!.getBoundingClientRect()
              onOpenMenu({ x: r.right, y: r.bottom })
            }}
            aria-label="Note actions"
            className="rounded p-1 text-ink-subtle hover:bg-white hover:text-ink"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </li>
  )
}

function NoteCard({
  note,
  selected,
  selectionMode,
  checked,
  onSelect,
  onOpenMenu,
}: RowProps) {
  const menuBtn = useRef<HTMLButtonElement>(null)
  return (
    <div
      onClick={onSelect}
      className={cn(
        'group flex cursor-pointer flex-col gap-2 rounded-card border p-3 transition-colors',
        selected ? 'border-brand-300 bg-brand-50' : 'border-line bg-white hover:border-brand-200',
      )}
    >
      <div className="flex items-start justify-between">
        {selectionMode ? (
          <input
            type="checkbox"
            checked={checked}
            onChange={onSelect}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-line text-brand-500 focus:ring-brand-400"
          />
        ) : (
          <FileText className="h-4 w-4 text-ink-subtle" />
        )}
        {!selectionMode && (
          <button
            ref={menuBtn}
            onClick={(e) => {
              e.stopPropagation()
              const r = menuBtn.current!.getBoundingClientRect()
              onOpenMenu({ x: r.right, y: r.bottom })
            }}
            aria-label="Note actions"
            className="rounded p-0.5 text-ink-subtle opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <div className="flex items-start gap-1">
          <span
            className={cn(
              'line-clamp-2 text-sm font-medium',
              selected ? 'text-brand-700' : 'text-ink',
            )}
          >
            {note.title || 'Untitled'}
          </span>
          {note.favorite && (
            <Star className="mt-0.5 h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
          )}
        </div>
        <p className="mt-1 truncate text-xs text-ink-subtle">{note.notebookName ?? 'Unfiled'}</p>
      </div>
      <p className="text-xs text-ink-subtle">Edited {timeAgo(note.updatedAt)}</p>
    </div>
  )
}
