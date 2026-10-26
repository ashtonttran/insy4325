import { AlertTriangle, CalendarDays, FileText } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatTime, todayInCentral } from '@/lib/calendar'
import type { CalendarEvent } from '@/api/eventsApi'
import type { Task } from '@/api/tasksApi'

/**
 * Shared presentation for calendar items. Events and tasks are deliberately
 * given different icons, containers, and interactions so they can be told apart
 * without relying on color alone:
 *   - Events  → calendar icon, light-purple pill
 *   - Tasks   → checkbox, neutral pill (amber/red when a deadline is urgent)
 */

export type TaskUrgency = 'none' | 'soon' | 'overdue'

/** Classify a task's urgency from its due date and priority (display only). */
export function taskUrgency(task: Task, onISO: string): TaskUrgency {
  if (task.status === 'DONE') return 'none'
  const today = todayInCentral()
  // An occurrence shown before today is overdue; HIGH priority also counts as
  // overdue-styled so it stands out.
  if (onISO < today) return 'overdue'
  if (task.priority === 'HIGH' && onISO <= today) return 'overdue'
  if (onISO === today) return 'soon'
  if (task.priority === 'HIGH') return 'soon'
  return 'none'
}

/** Priority dot color, matching the Tasks board (HIGH red / MEDIUM amber / LOW green). */
const priorityDot: Record<string, string> = {
  HIGH: 'bg-accent-red',
  MEDIUM: 'bg-accent-orange',
  LOW: 'bg-accent-green',
}

/* ------------------------------------------------------------------ Events */

/**
 * Compact event pill for month cells. Light purple background, calendar icon,
 * title, and (when timed) the start time — consistent regardless of the
 * event's assigned calendar category.
 */
export function EventChip({
  event,
  onClick,
}: {
  event: CalendarEvent
  onClick: () => void
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={`Event: ${event.title}${event.startTime ? ` · ${formatTime(event.startTime)}` : ''}`}
      className={cn(
        'flex w-full items-center gap-1 rounded-md border border-brand-100 bg-brand-50 px-1.5 py-0.5 text-left',
        'text-[11px] text-brand-700 transition-colors hover:bg-brand-100',
      )}
    >
      <CalendarDays className="h-3 w-3 shrink-0 text-brand-500" />
      <span className="min-w-0 flex-1 truncate font-medium">{event.title}</span>
      {event.startTime && (
        <span className="shrink-0 text-[10px] text-brand-500">{formatTime(event.startTime)}</span>
      )}
    </button>
  )
}

/* ------------------------------------------------------------------- Tasks */

/**
 * Compact task pill for month cells. Interactive checkbox + title. Neutral by
 * default; amber ("soon"/due today) or red ("overdue") accents mark urgency,
 * with a warning/document icon so urgency doesn't depend on color alone.
 */
export function TaskChip({
  task,
  onISO,
  onClick,
  onToggle,
}: {
  task: Task
  onISO: string
  onClick: () => void
  onToggle: () => void
}) {
  const done = task.status === 'DONE'
  const urgency = taskUrgency(task, onISO)

  const container =
    done
      ? 'border-line bg-canvas text-ink-subtle'
      : urgency === 'overdue'
        ? 'border-red-200 bg-red-50 text-red-700'
        : urgency === 'soon'
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : 'border-line bg-white text-ink'

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={`Task (${task.priority.toLowerCase()} priority): ${task.title}`}
      className={cn(
        'flex w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-left text-[11px] transition-colors',
        container,
      )}
    >
      <TaskCheckbox done={done} onToggle={onToggle} size="sm" />
      {!done && urgency === 'overdue' && (
        <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />
      )}
      {!done && urgency === 'soon' && <FileText className="h-3 w-3 shrink-0 text-amber-500" />}
      <span className={cn('min-w-0 flex-1 truncate font-medium', done && 'line-through')}>
        {task.title}
      </span>
      {!done && urgency === 'none' && (
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', priorityDot[task.priority])} />
      )}
    </button>
  )
}

/**
 * Accessible checkbox that toggles task completion. Stops propagation so
 * toggling never opens the task editor.
 */
export function TaskCheckbox({
  done,
  onToggle,
  size = 'md',
}: {
  done: boolean
  onToggle: () => void
  size?: 'sm' | 'md'
}) {
  const box = size === 'sm' ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]'
  return (
    <span
      role="checkbox"
      aria-checked={done}
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          e.stopPropagation()
          onToggle()
        }
      }}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded border transition-colors',
        box,
        done
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : 'border-ink-subtle/50 bg-white hover:border-brand-400',
      )}
    >
      {done && (
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" aria-hidden>
          <path
            d="M2.5 6.5l2.5 2.5 4.5-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  )
}

export { priorityDot }
