import { useMemo, useState } from 'react'
import {
  CalendarDays,
  Clock,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  MONTH_NAMES,
  WEEKDAY_LABELS,
  addDays,
  formatTime,
  parseISO,
  timeToHours,
  toISO,
} from '@/lib/calendar'
import type { CalendarEvent } from '@/api/eventsApi'
import type { Task } from '@/api/tasksApi'
import type { CalendarItemFilter } from './CalendarToolbar'
import { TaskCheckbox, priorityDot } from './calendarItems'

const UPCOMING_DAYS = 30
const UPCOMING_LIMIT = 5

/**
 * The daily agenda sidebar (right ~30%). Shows the selected day's events and
 * tasks and a short "Upcoming" list. Everything is driven by the already-
 * expanded by-date maps from the page, so recurrence/filtering stay consistent
 * with the grid.
 */
export function DailyAgendaSidebar({
  selectedISO,
  filter,
  eventsByDate,
  tasksByDate,
  onAddEvent,
  onAddTask,
  onEventClick,
  onEventDelete,
  onTaskClick,
  onTaskToggle,
  onTaskDelete,
  onSelectDay,
}: {
  selectedISO: string
  filter: CalendarItemFilter
  eventsByDate: Map<string, CalendarEvent[]>
  tasksByDate: Map<string, Task[]>
  onAddEvent: (iso: string) => void
  onAddTask: (iso: string) => void
  onEventClick: (e: CalendarEvent) => void
  onEventDelete: (e: CalendarEvent) => void
  onTaskClick: (t: Task) => void
  onTaskToggle: (t: Task) => void
  onTaskDelete: (t: Task) => void
  onSelectDay: (iso: string) => void
}) {
  const selected = parseISO(selectedISO)
  const showEvents = filter === 'all' || filter === 'events'
  const showTasks = filter === 'all' || filter === 'tasks'

  const dayEvents = useMemo(
    () =>
      (eventsByDate.get(selectedISO) ?? [])
        .slice()
        .sort((a, b) => timeToHours(a.startTime) - timeToHours(b.startTime)),
    [eventsByDate, selectedISO],
  )
  const dayTasks = useMemo(() => {
    const list = (tasksByDate.get(selectedISO) ?? []).slice()
    // Incomplete first, then completed; stable within each group.
    return list.sort(
      (a, b) => Number(a.status === 'DONE') - Number(b.status === 'DONE'),
    )
  }, [tasksByDate, selectedISO])

  // Upcoming: the next few occurrences strictly after the selected day.
  const upcoming = useMemo(
    () => collectUpcoming(eventsByDate, tasksByDate, selectedISO, filter),
    [eventsByDate, tasksByDate, selectedISO, filter],
  )

  const dateHeading = `${WEEKDAY_LABELS[selected.getDay()]}, ${
    MONTH_NAMES[selected.getMonth()]
  } ${selected.getDate()}`

  return (
    <aside className="flex h-full min-h-0 flex-col">
      {/* Selected-date header */}
      <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
        <h3 className="text-base font-semibold text-ink">{dateHeading}</h3>
        <AddMenu onAddEvent={() => onAddEvent(selectedISO)} onAddTask={() => onAddTask(selectedISO)} />
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pt-4">
        {/* Events */}
        {showEvents && (
          <section>
            <SectionHeader
              title={`Events${dayEvents.length ? ` (${dayEvents.length})` : ''}`}
              action={
                <AddLink label="Add event" onClick={() => onAddEvent(selectedISO)} />
              }
            />
            {dayEvents.length === 0 ? (
              <EmptyHint text="No events scheduled." />
            ) : (
              <ul className="mt-2 space-y-2">
                {dayEvents.map((e) => (
                  <AgendaEventItem
                    key={e.id}
                    event={e}
                    onClick={() => onEventClick(e)}
                    onDelete={() => onEventDelete(e)}
                  />
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Tasks */}
        {showTasks && (
          <section>
            <SectionHeader
              title={`Tasks${dayTasks.length ? ` (${dayTasks.length})` : ''}`}
              action={<AddLink label="Add task" onClick={() => onAddTask(selectedISO)} />}
            />
            {dayTasks.length === 0 ? (
              <EmptyHint text="No tasks due." />
            ) : (
              <ul className="mt-2 space-y-2">
                {dayTasks.map((t) => (
                  <AgendaTaskItem
                    key={t.id}
                    task={t}
                    onClick={() => onTaskClick(t)}
                    onToggle={() => onTaskToggle(t)}
                    onDelete={() => onTaskDelete(t)}
                  />
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section>
            <SectionHeader title="Upcoming" />
            <ul className="mt-2 space-y-2">
              {upcoming.map((u) => (
                <li key={u.key}>
                  <button
                    onClick={() => onSelectDay(u.iso)}
                    className="flex w-full items-center gap-3 rounded-btn px-1 py-1 text-left transition-colors hover:bg-canvas"
                  >
                    <span className="w-12 shrink-0 text-xs font-medium text-ink-subtle">
                      {MONTH_NAMES[parseISO(u.iso).getMonth()].slice(0, 3)}{' '}
                      {parseISO(u.iso).getDate()}
                    </span>
                    {u.kind === 'event' ? (
                      <CalendarDays className="h-4 w-4 shrink-0 text-brand-500" />
                    ) : (
                      <span
                        className={cn(
                          'h-2.5 w-2.5 shrink-0 rounded-full',
                          priorityDot[u.task!.priority],
                        )}
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{u.title}</span>
                      {u.timeLabel && (
                        <span className="block text-xs text-ink-subtle">{u.timeLabel}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  )
}

/* ------------------------------------------------------------- sub-pieces */

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h4 className="text-sm font-semibold text-ink">{title}</h4>
      {action}
    </div>
  )
}

function AddLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
    >
      <Plus className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

function EmptyHint({ text }: { text: string }) {
  return <p className="mt-2 text-sm text-ink-subtle">{text}</p>
}

/** Add menu in the sidebar header — choose a task or an event. */
function AddMenu({ onAddEvent, onAddTask }: { onAddEvent: () => void; onAddTask: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-btn border border-line bg-white px-2.5 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-canvas"
      >
        <Plus className="h-3.5 w-3.5" />
        Add
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="absolute right-0 top-9 z-40 w-36 overflow-hidden rounded-card border border-line bg-white py-1 shadow-popover"
          >
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onAddEvent()
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-canvas"
            >
              <CalendarDays className="h-4 w-4 text-brand-500" />
              Add event
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onAddTask()
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-canvas"
            >
              <TaskCheckbox done={false} onToggle={() => {}} size="sm" />
              Add task
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** A single event row in the agenda, with edit/delete actions. */
function AgendaEventItem({
  event,
  onClick,
  onDelete,
}: {
  event: CalendarEvent
  onClick: () => void
  onDelete: () => void
}) {
  return (
    <li className="group flex items-start gap-3 rounded-btn border border-brand-100 bg-brand-50/60 p-3 transition-colors hover:bg-brand-50">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-100 text-brand-600">
        <CalendarDays className="h-4 w-4" />
      </span>
      <button onClick={onClick} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-semibold text-ink">{event.title}</span>
        <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
          <Clock className="h-3 w-3" />
          {event.startTime ? formatTime(event.startTime) : 'All day'}
          {event.endTime ? ` – ${formatTime(event.endTime)}` : ''}
        </span>
        {event.location && (
          <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-subtle">
            <MapPin className="h-3 w-3" />
            {event.location}
          </span>
        )}
      </button>
      <RowActions onEdit={onClick} onDelete={onDelete} />
    </li>
  )
}

/** A single task row in the agenda, with a completion checkbox and actions. */
function AgendaTaskItem({
  task,
  onClick,
  onToggle,
  onDelete,
}: {
  task: Task
  onClick: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const done = task.status === 'DONE'
  return (
    <li
      className={cn(
        'group flex items-start gap-3 rounded-btn border p-3 transition-colors',
        done ? 'border-line bg-canvas' : 'border-line bg-white hover:bg-canvas',
      )}
    >
      <span className="mt-0.5">
        <TaskCheckbox done={done} onToggle={onToggle} />
      </span>
      <button onClick={onClick} className="min-w-0 flex-1 text-left">
        <span
          className={cn(
            'block truncate text-sm font-medium',
            done ? 'text-ink-subtle line-through' : 'text-ink',
          )}
        >
          {task.title}
        </span>
        <span className="mt-0.5 flex items-center gap-2 text-xs text-ink-subtle">
          <span className="inline-flex items-center gap-1">
            <span className={cn('h-2 w-2 rounded-full', priorityDot[task.priority])} />
            {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
          </span>
          {task.calendarName && <span className="truncate">· {task.calendarName}</span>}
        </span>
      </button>
      <RowActions onEdit={onClick} onDelete={onDelete} />
    </li>
  )
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
      <button
        onClick={(e) => {
          e.stopPropagation()
          onEdit()
        }}
        aria-label="Edit"
        className="rounded p-1 text-ink-subtle hover:bg-white hover:text-ink"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        aria-label="Delete"
        className="rounded p-1 text-ink-subtle hover:bg-white hover:text-red-600"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

/* ---------------------------------------------------------------- upcoming */

interface UpcomingEntry {
  key: string
  iso: string
  kind: 'event' | 'task'
  title: string
  timeLabel: string | null
  task?: Task
}

/** Walk the next ~30 days after the selected date, collecting a few items. */
function collectUpcoming(
  eventsByDate: Map<string, CalendarEvent[]>,
  tasksByDate: Map<string, Task[]>,
  selectedISO: string,
  filter: CalendarItemFilter,
): UpcomingEntry[] {
  const showEvents = filter === 'all' || filter === 'events'
  const showTasks = filter === 'all' || filter === 'tasks'

  const start = parseISO(selectedISO)
  const out: UpcomingEntry[] = []

  for (let i = 1; i <= UPCOMING_DAYS && out.length < UPCOMING_LIMIT; i++) {
    const iso = toISO(addDays(start, i))
    const dayItems: UpcomingEntry[] = []

    if (showEvents) {
      for (const e of (eventsByDate.get(iso) ?? []).slice().sort(
        (a, b) => timeToHours(a.startTime) - timeToHours(b.startTime),
      )) {
        dayItems.push({
          key: `e-${e.id}-${iso}`,
          iso,
          kind: 'event',
          title: e.title,
          timeLabel: e.startTime
            ? `${formatTime(e.startTime)}${e.endTime ? ` – ${formatTime(e.endTime)}` : ''}`
            : 'All day',
        })
      }
    }
    if (showTasks) {
      for (const t of tasksByDate.get(iso) ?? []) {
        if (t.status === 'DONE') continue
        dayItems.push({
          key: `t-${t.id}-${iso}`,
          iso,
          kind: 'task',
          title: t.title,
          timeLabel: 'Due',
          task: t,
        })
      }
    }

    for (const item of dayItems) {
      if (out.length >= UPCOMING_LIMIT) break
      out.push(item)
    }
  }

  return out
}
