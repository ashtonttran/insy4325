import {
  CalendarPlus,
  CheckSquare,
  Link2,
  Star,
  Trash2,
  NotebookPen,
} from 'lucide-react'
import type { Note } from '@/api/notesApi'

export interface NoteMenuActions {
  onToggleFavorite: () => void
  onMove: () => void
  onCreateTask: () => void
  onScheduleStudy: () => void
  onLinkExisting: () => void
  onDelete: () => void
}

/**
 * The per-note actions popover, anchored to the three-dot button. Mirrors the
 * mockup: favorite, move, create task, schedule study session, link, delete.
 */
export function NoteContextMenu({
  note,
  anchor,
  actions,
  onClose,
}: {
  note: Note
  anchor: { x: number; y: number }
  actions: NoteMenuActions
  onClose: () => void
}) {
  const run = (fn: () => void) => () => {
    onClose()
    fn()
  }

  // Keep the menu on-screen: it opens to the left of / below the anchor.
  const style: React.CSSProperties = {
    top: Math.min(anchor.y + 4, window.innerHeight - 280),
    left: Math.min(anchor.x, window.innerWidth - 224) - 200,
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden />
      <div
        role="menu"
        style={style}
        className="fixed z-50 w-52 overflow-hidden rounded-card border border-line bg-white py-1 shadow-popover"
      >
        <Item icon={<Star className="h-4 w-4" />} label={note.favorite ? 'Remove favorite' : 'Add to favorites'} onClick={run(actions.onToggleFavorite)} />
        <Item icon={<NotebookPen className="h-4 w-4" />} label="Move to notebook" onClick={run(actions.onMove)} />
        <div className="my-1 border-t border-line" />
        <Item icon={<CheckSquare className="h-4 w-4" />} label="Create task from note" onClick={run(actions.onCreateTask)} />
        <Item icon={<CalendarPlus className="h-4 w-4" />} label="Schedule study session" onClick={run(actions.onScheduleStudy)} />
        <Item icon={<Link2 className="h-4 w-4" />} label="Link existing item" onClick={run(actions.onLinkExisting)} />
        <div className="my-1 border-t border-line" />
        <Item
          icon={<Trash2 className="h-4 w-4" />}
          label="Delete note"
          destructive
          onClick={run(actions.onDelete)}
        />
      </div>
    </>
  )
}

function Item({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={
        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ' +
        (destructive ? 'text-red-600 hover:bg-red-50' : 'text-ink hover:bg-canvas')
      }
    >
      <span className={destructive ? 'text-red-500' : 'text-ink-muted'}>{icon}</span>
      {label}
    </button>
  )
}
