import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { Folder } from '@/api/notesApi'

/**
 * Styled dialog for creating a notebook, replacing the old window.prompt flow.
 * In FlowDesk's model a notebook is the note container and an optional *folder*
 * groups notebooks — so the "parent" selector chooses a folder (the spec's
 * "parent notebook"). Keeps its contents on failure so the user can retry.
 */
export function CreateNotebookDialog({
  folders,
  defaultFolderId = null,
  onCancel,
  onCreate,
}: {
  folders: Folder[]
  /** Preselected parent folder (e.g. from a folder's "New subfolder" action). */
  defaultFolderId?: number | null
  onCancel: () => void
  /** Create the notebook; return true on success, false to keep the dialog open. */
  onCreate: (name: string, folderId: number | null) => Promise<boolean>
}) {
  const [name, setName] = useState('')
  const [folderId, setFolderId] = useState<number | null>(defaultFolderId)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please enter a notebook name.')
      return
    }
    setBusy(true)
    setError(null)
    const ok = await onCreate(trimmed, folderId)
    setBusy(false)
    if (!ok) setError('Could not create the notebook. Please try again.')
    // On success the parent closes the dialog.
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onCancel} aria-hidden />
      <div
        role="dialog"
        aria-label="Create new notebook"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-card border border-line bg-white shadow-popover"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="text-base font-semibold text-ink">Create new notebook</h3>
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
            <label className="mb-1 block text-xs font-medium text-ink-subtle">Name</label>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void submit()
                }
              }}
              placeholder="e.g. INSY 4325"
              className="w-full rounded-btn border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-subtle">
              Parent folder (optional)
            </label>
            <select
              value={folderId ?? ''}
              onChange={(e) => setFolderId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-btn border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="">No folder (top level)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-subtle">Leave blank to create at the top level.</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={busy}>
            {busy ? 'Creating…' : 'Create notebook'}
          </Button>
        </div>
      </div>
    </>
  )
}
