import { CalendarDays, CheckSquare, ExternalLink, Link2, Plus, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/calendar'
import type { NoteLink } from '@/api/notesApi'

/**
 * The editor's "Linked items" section: compact rows for tasks/events linked to
 * the current note, each openable in its own workspace, plus controls to link a
 * new item. Deleted targets are already filtered out by the backend resolver.
 */
export function LinkedItems({
  links,
  loading,
  onOpen,
  onUnlink,
  onLinkExisting,
}: {
  links: NoteLink[]
  loading: boolean
  onOpen: (link: NoteLink) => void
  onUnlink: (link: NoteLink) => void
  onLinkExisting: () => void
}) {
  return (
    <section className="mt-8 border-t border-line pt-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Link2 className="h-4 w-4 text-ink-muted" />
          Linked items
        </h3>
        <button
          onClick={onLinkExisting}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          <Plus className="h-3.5 w-3.5" /> Link task or event
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-ink-subtle">Loading…</p>
      ) : links.length === 0 ? (
        <p className="text-sm text-ink-subtle">
          No linked tasks or events yet. Use the note menu to create one, or link an existing item.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {links.map((link) => (
            <LinkRow key={link.id} link={link} onOpen={() => onOpen(link)} onUnlink={() => onUnlink(link)} />
          ))}
        </div>
      )}
    </section>
  )
}

function LinkRow({
  link,
  onOpen,
  onUnlink,
}: {
  link: NoteLink
  onOpen: () => void
  onUnlink: () => void
}) {
  const isTask = link.targetType === 'TASK'
  const done = isTask && link.status === 'DONE'

  const meta = isTask
    ? link.dueDate
      ? `Task · Due ${link.dueDate}`
      : 'Task'
    : `Event · ${link.date ?? ''}${link.startTime ? `, ${formatTime(link.startTime)}` : ''}`

  return (
    <div
      className={cn(
        'group flex items-center gap-2.5 rounded-btn border p-2.5 transition-colors',
        isTask ? 'border-line bg-white hover:bg-canvas' : 'border-brand-100 bg-brand-50/60 hover:bg-brand-50',
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
          isTask ? 'bg-canvas text-ink-muted' : 'bg-brand-100 text-brand-600',
        )}
      >
        {isTask ? <CheckSquare className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
      </span>
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className={cn('block truncate text-sm font-medium text-ink', done && 'text-ink-subtle line-through')}>
          {link.title}
        </span>
        <span className="block truncate text-xs text-ink-subtle">{meta}</span>
      </button>
      <button
        onClick={onOpen}
        aria-label="Open"
        className="rounded p-1 text-ink-subtle hover:bg-white hover:text-brand-600"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onUnlink}
        aria-label="Unlink"
        className="rounded p-1 text-ink-subtle opacity-0 transition-opacity hover:bg-white hover:text-red-600 group-hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
