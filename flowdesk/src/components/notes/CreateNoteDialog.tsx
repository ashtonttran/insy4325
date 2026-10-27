import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, FolderClosed, NotebookText, Plus, Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import type { Folder, Notebook } from '@/api/notesApi'

/**
 * Lightweight note-creation dialog: a title plus a searchable notebook
 * destination (with inline notebook creation). Reuses the existing note and
 * notebook creation logic via the callbacks the page passes in. Keeps its
 * contents on failure; Escape cancels; Enter in the title submits.
 */
export function CreateNoteDialog({
  notebooks,
  folders,
  defaultNotebookId = null,
  onCancel,
  onCreate,
  onCreateNotebook,
}: {
  notebooks: Notebook[]
  folders: Folder[]
  /** Preselected destination (from context: selected notebook / last used). */
  defaultNotebookId?: number | null
  onCancel: () => void
  /** Create the note; return true on success (parent then closes + opens it). */
  onCreate: (title: string, notebookId: number | null) => Promise<boolean>
  /** Create a notebook inline; return the new notebook (or null on failure). */
  onCreateNotebook: (name: string, folderId: number | null) => Promise<Notebook | null>
}) {
  const [title, setTitle] = useState('')
  const [notebookId, setNotebookId] = useState<number | null>(defaultNotebookId)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const selectedNotebook = notebooks.find((nb) => nb.id === notebookId) ?? null
  const destinationLabel = selectedNotebook ? selectedNotebook.name : 'Unfiled'

  const submit = async () => {
    setBusy(true)
    setError(null)
    const ok = await onCreate(title.trim(), notebookId)
    setBusy(false)
    if (!ok) setError('Could not create the note. Please try again.')
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onCancel} aria-hidden />
      <div
        role="dialog"
        aria-label="Create new note"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-card border border-line bg-white shadow-popover"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="text-base font-semibold text-ink">Create new note</h3>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="rounded p-1 text-ink-subtle hover:bg-canvas hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {error && (
            <div className="rounded-btn border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-subtle">Title</label>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void submit()
                }
              }}
              placeholder="Untitled Note"
              className="w-full rounded-btn border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-subtle">Notebook</label>
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-btn border border-line bg-white px-3 py-2 text-sm text-ink hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <span className="flex min-w-0 items-center gap-2">
                <NotebookText className="h-4 w-4 shrink-0 text-ink-subtle" />
                <span className="truncate">{destinationLabel}</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-ink-subtle" />
            </button>

            {pickerOpen && (
              <NotebookPicker
                notebooks={notebooks}
                folders={folders}
                selectedId={notebookId}
                onSelect={(id) => {
                  setNotebookId(id)
                  setPickerOpen(false)
                }}
                onCreateNotebook={async (name, folderId) => {
                  const nb = await onCreateNotebook(name, folderId)
                  if (nb) {
                    setNotebookId(nb.id)
                    setPickerOpen(false)
                  }
                  return nb
                }}
              />
            )}

            {/* Contextual "save to" hint so the destination is always clear. */}
            <p className="mt-1.5 text-xs text-ink-subtle">
              Save to: <span className="font-medium text-ink-muted">{destinationLabel}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={busy}>
            {busy ? 'Creating…' : 'Create note'}
          </Button>
        </div>
      </div>
    </>
  )
}

/** Inline searchable notebook list (grouped by folder) with inline creation. */
function NotebookPicker({
  notebooks,
  folders,
  selectedId,
  onSelect,
  onCreateNotebook,
}: {
  notebooks: Notebook[]
  folders: Folder[]
  selectedId: number | null
  onSelect: (id: number | null) => void
  onCreateNotebook: (name: string, folderId: number | null) => Promise<Notebook | null>
}) {
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newFolderId, setNewFolderId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const q = query.trim().toLowerCase()
  const matches = (nb: Notebook) => !q || nb.name.toLowerCase().includes(q)

  const grouped = useMemo(() => {
    const byFolder = new Map<number | null, Notebook[]>()
    for (const nb of notebooks) {
      if (!matches(nb)) continue
      const key = nb.folderId ?? null
      const list = byFolder.get(key) ?? []
      list.push(nb)
      byFolder.set(key, list)
    }
    return byFolder
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notebooks, q])

  const create = async () => {
    const name = newName.trim()
    if (!name) return
    setBusy(true)
    const nb = await onCreateNotebook(name, newFolderId)
    setBusy(false)
    if (nb) {
      setCreating(false)
      setNewName('')
    }
  }

  return (
    <div className="mt-1 overflow-hidden rounded-btn border border-line bg-white shadow-popover">
      <div className="border-b border-line p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notebooks..."
            autoFocus
            className="h-8 w-full rounded-btn border border-line bg-canvas pl-8 pr-2 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      <div className="max-h-56 overflow-y-auto p-1">
        <PickerOption
          label="Unfiled"
          selected={selectedId === null}
          onClick={() => onSelect(null)}
        />
        {folders.map((folder) => {
          const inFolder = grouped.get(folder.id) ?? []
          if (inFolder.length === 0) return null
          return (
            <div key={folder.id} className="mt-1">
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                <FolderClosed className="h-3.5 w-3.5" />
                {folder.name}
              </div>
              {inFolder.map((nb) => (
                <PickerOption
                  key={nb.id}
                  label={nb.name}
                  nested
                  selected={selectedId === nb.id}
                  onClick={() => onSelect(nb.id)}
                />
              ))}
            </div>
          )
        })}
        {(grouped.get(null) ?? []).map((nb) => (
          <PickerOption
            key={nb.id}
            label={nb.name}
            selected={selectedId === nb.id}
            onClick={() => onSelect(nb.id)}
          />
        ))}
      </div>

      {/* Inline create new notebook */}
      <div className="border-t border-line p-1">
        {creating ? (
          <div className="space-y-2 p-1.5">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void create()}
              placeholder="New notebook name"
              autoFocus
              className="h-8 w-full rounded-btn border border-line bg-canvas px-2 text-sm text-ink focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <select
              value={newFolderId ?? ''}
              onChange={(e) => setNewFolderId(e.target.value ? Number(e.target.value) : null)}
              className="h-8 w-full rounded-btn border border-line bg-white px-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="">No folder (top level)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setCreating(false)} disabled={busy}>
                Cancel
              </Button>
              <Button size="sm" onClick={create} disabled={busy}>
                {busy ? 'Adding…' : 'Add'}
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-1.5 rounded-btn px-2 py-2 text-left text-sm font-medium text-brand-600 hover:bg-canvas"
          >
            <Plus className="h-4 w-4" />
            Create new notebook
          </button>
        )}
      </div>
    </div>
  )
}

function PickerOption({
  label,
  selected,
  nested,
  onClick,
}: {
  label: string
  selected: boolean
  nested?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-btn px-2 py-1.5 text-left text-sm transition-colors',
        nested && 'pl-7',
        selected ? 'bg-brand-50 text-brand-700' : 'text-ink hover:bg-canvas',
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <NotebookText className="h-4 w-4 shrink-0 text-ink-subtle" />
        <span className="truncate">{label}</span>
      </span>
      {selected && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
    </button>
  )
}
