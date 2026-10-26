import { useMemo, useState } from 'react'
import { Check, FolderClosed, NotebookText, Plus, Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import type { Folder, Notebook } from '@/api/notesApi'

/**
 * A searchable notebook picker. Shows notebooks grouped by folder, supports
 * creating a notebook inline, and reports the chosen destination (a notebook
 * id, or null for "Unfiled"). Used by the note context menu, bulk move, and
 * the editor breadcrumb.
 */
export function MoveToNotebookDialog({
  notebooks,
  folders,
  currentNotebookId,
  count,
  onCancel,
  onConfirm,
  onCreateNotebook,
}: {
  notebooks: Notebook[]
  folders: Folder[]
  currentNotebookId: number | null
  /** Number of notes being moved (for the confirm label). */
  count: number
  onCancel: () => void
  onConfirm: (notebookId: number | null) => void
  onCreateNotebook?: (name: string) => Promise<Notebook | null>
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<number | null>(currentNotebookId)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const q = query.trim().toLowerCase()
  const matches = (nb: Notebook) => !q || nb.name.toLowerCase().includes(q)

  // Group notebooks by folder, respecting the hierarchy.
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
    if (!name || !onCreateNotebook) return
    const nb = await onCreateNotebook(name)
    if (nb) {
      setSelected(nb.id)
      setCreating(false)
      setNewName('')
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onCancel} aria-hidden />
      <div
        role="dialog"
        aria-label="Move to notebook"
        className="fixed left-1/2 top-1/2 z-50 flex max-h-[80vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-card border border-line bg-white shadow-popover"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div>
            <h3 className="text-base font-semibold text-ink">Move to notebook</h3>
            {count > 1 && (
              <p className="text-xs text-ink-muted">
                {count} notes selected to move to a different notebook.
              </p>
            )}
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="rounded p-1 text-ink-subtle hover:bg-canvas hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notebooks..."
              autoFocus
              className="h-9 w-full rounded-btn border border-line bg-canvas pl-9 pr-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {/* Unfiled option */}
          <NotebookOption
            label="Unfiled"
            icon={<NotebookText className="h-4 w-4 text-ink-subtle" />}
            selected={selected === null}
            onClick={() => setSelected(null)}
          />

          {folders.map((folder) => {
            const inFolder = grouped.get(folder.id) ?? []
            if (inFolder.length === 0) return null
            return (
              <div key={folder.id} className="mt-1">
                <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                  <FolderClosed className="h-3.5 w-3.5" />
                  {folder.name}
                </div>
                {inFolder.map((nb) => (
                  <NotebookOption
                    key={nb.id}
                    label={nb.name}
                    nested
                    icon={<NotebookText className="h-4 w-4 text-ink-subtle" />}
                    selected={selected === nb.id}
                    onClick={() => setSelected(nb.id)}
                  />
                ))}
              </div>
            )
          })}

          {/* Ungrouped notebooks */}
          {(grouped.get(null) ?? []).map((nb) => (
            <NotebookOption
              key={nb.id}
              label={nb.name}
              icon={<NotebookText className="h-4 w-4 text-ink-subtle" />}
              selected={selected === nb.id}
              onClick={() => setSelected(nb.id)}
            />
          ))}

          {/* Create new notebook */}
          {onCreateNotebook &&
            (creating ? (
              <div className="mt-2 flex items-center gap-2 px-2.5">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void create()}
                  placeholder="Notebook name"
                  autoFocus
                  className="h-8 flex-1 rounded-btn border border-line bg-canvas px-2 text-sm text-ink focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                <Button size="sm" onClick={create}>
                  Add
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="mt-1 flex w-full items-center gap-1.5 rounded-btn px-2.5 py-2 text-left text-sm font-medium text-brand-600 hover:bg-canvas"
              >
                <Plus className="h-4 w-4" />
                Create new notebook
              </button>
            ))}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onConfirm(selected)}>
            {count > 1 ? `Move ${count} notes` : 'Move note'}
          </Button>
        </div>
      </div>
    </>
  )
}

function NotebookOption({
  label,
  icon,
  selected,
  nested,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  selected: boolean
  nested?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-btn px-2.5 py-2 text-left text-sm transition-colors',
        nested && 'pl-7',
        selected ? 'bg-brand-50 text-brand-700' : 'text-ink hover:bg-canvas',
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      {selected && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
    </button>
  )
}
