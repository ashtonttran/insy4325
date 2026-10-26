import { useMemo, useState } from 'react'
import { CalendarDays, CheckSquare, Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Task } from '@/api/tasksApi'
import type { CalendarEvent } from '@/api/eventsApi'
import type { NoteLink } from '@/api/notesApi'

/**
 * A searchable picker for linking an existing task or event to a note. Tasks
 * and events already linked are disabled to prevent duplicate associations.
 */
export function LinkItemDialog({
  tasks,
  events,
  existingLinks,
  onCancel,
  onLink,
}: {
  tasks: Task[]
  events: CalendarEvent[]
  existingLinks: NoteLink[]
  onCancel: () => void
  onLink: (targetType: 'TASK' | 'EVENT', targetId: number) => void
}) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'TASK' | 'EVENT'>('TASK')

  const linkedTaskIds = useMemo(
    () => new Set(existingLinks.filter((l) => l.targetType === 'TASK').map((l) => l.targetId)),
    [existingLinks],
  )
  const linkedEventIds = useMemo(
    () => new Set(existingLinks.filter((l) => l.targetType === 'EVENT').map((l) => l.targetId)),
    [existingLinks],
  )

  const q = query.trim().toLowerCase()
  const taskMatches = tasks.filter((t) => !q || t.title.toLowerCase().includes(q))
  const eventMatches = events.filter((e) => !q || e.title.toLowerCase().includes(q))

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onCancel} aria-hidden />
      <div
        role="dialog"
        aria-label="Link task or event"
        className="fixed left-1/2 top-1/2 z-50 flex max-h-[80vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-card border border-line bg-white shadow-popover"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="text-base font-semibold text-ink">Link task or event</h3>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="rounded p-1 text-ink-subtle hover:bg-canvas hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-1 px-5 pt-3">
          <TabBtn active={tab === 'TASK'} onClick={() => setTab('TASK')} icon={CheckSquare} label="Tasks" />
          <TabBtn active={tab === 'EVENT'} onClick={() => setTab('EVENT')} icon={CalendarDays} label="Events" />
        </div>

        <div className="px-5 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${tab === 'TASK' ? 'tasks' : 'events'}...`}
              autoFocus
              className="h-9 w-full rounded-btn border border-line bg-canvas pl-9 pr-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {tab === 'TASK' ? (
            taskMatches.length === 0 ? (
              <Empty label="No tasks found." />
            ) : (
              <ul className="space-y-1">
                {taskMatches.map((t) => {
                  const linked = linkedTaskIds.has(t.id)
                  return (
                    <li key={t.id}>
                      <button
                        disabled={linked}
                        onClick={() => onLink('TASK', t.id)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-btn px-2.5 py-2 text-left text-sm transition-colors',
                          linked ? 'cursor-default text-ink-subtle' : 'text-ink hover:bg-canvas',
                        )}
                      >
                        <CheckSquare className="h-4 w-4 shrink-0 text-ink-subtle" />
                        <span className="min-w-0 flex-1 truncate">{t.title}</span>
                        {t.dueDate && <span className="shrink-0 text-xs text-ink-subtle">Due {t.dueDate}</span>}
                        {linked && <span className="shrink-0 text-xs text-brand-600">Linked</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )
          ) : eventMatches.length === 0 ? (
            <Empty label="No events found." />
          ) : (
            <ul className="space-y-1">
              {eventMatches.map((e) => {
                const linked = linkedEventIds.has(e.id)
                return (
                  <li key={e.id}>
                    <button
                      disabled={linked}
                      onClick={() => onLink('EVENT', e.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-btn px-2.5 py-2 text-left text-sm transition-colors',
                        linked ? 'cursor-default text-ink-subtle' : 'text-ink hover:bg-canvas',
                      )}
                    >
                      <CalendarDays className="h-4 w-4 shrink-0 text-brand-500" />
                      <span className="min-w-0 flex-1 truncate">{e.title}</span>
                      <span className="shrink-0 text-xs text-ink-subtle">{e.date}</span>
                      {linked && <span className="shrink-0 text-xs text-brand-600">Linked</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}

function TabBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: typeof CheckSquare
  label: string
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-btn px-3 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-brand-50 text-brand-700' : 'text-ink-muted hover:bg-canvas',
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function Empty({ label }: { label: string }) {
  return <p className="px-3 py-8 text-center text-sm text-ink-subtle">{label}</p>
}
