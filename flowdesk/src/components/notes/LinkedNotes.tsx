import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, FileText } from 'lucide-react'
import { notesApi, type LinkedNote } from '@/api/notesApi'
import { useNotesStore } from '@/store/notesStore'

/**
 * Shows the notes linked to a task or event (reverse of the note's linked
 * items). Clicking a note navigates to the Notes workspace and selects it.
 * Rendered inside the task drawer and the event dialog.
 */
export function LinkedNotes({
  targetType,
  targetId,
}: {
  targetType: 'TASK' | 'EVENT'
  targetId: number
}) {
  const navigate = useNavigate()
  const selectNote = useNotesStore((s) => s.selectNote)
  const [notes, setNotes] = useState<LinkedNote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    const fetcher =
      targetType === 'TASK' ? notesApi.notesForTask(targetId) : notesApi.notesForEvent(targetId)
    fetcher
      .then((list) => {
        if (active) setNotes(list)
      })
      .catch(() => {
        if (active) setNotes([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [targetType, targetId])

  if (loading || notes.length === 0) return null

  const openNote = (id: number) => {
    selectNote(id)
    navigate('/notes')
  }

  return (
    <div className="rounded-btn border border-line p-3">
      <p className="mb-2 text-xs font-medium text-ink-subtle">Linked notes</p>
      <ul className="space-y-1">
        {notes.map((n) => (
          <li key={n.id}>
            <button
              onClick={() => openNote(n.id)}
              className="flex w-full items-center gap-2 rounded-btn px-2 py-1.5 text-left text-sm text-ink transition-colors hover:bg-canvas"
            >
              <FileText className="h-4 w-4 shrink-0 text-ink-subtle" />
              <span className="min-w-0 flex-1 truncate">{n.title}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-ink-subtle" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
