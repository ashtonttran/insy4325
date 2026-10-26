import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatTime, toISO } from '@/lib/calendar'
import type { CalendarEvent } from '@/api/eventsApi'
import type { Task } from '@/api/tasksApi'
import type { CalendarItemFilter } from './CalendarToolbar'
import { TaskChip } from './calendarItems'
import { GRID_HEIGHT, HOUR_PX, eventStyle, hoursRange } from './timeGrid'

/** Single-day timeline: all-day tasks on top, timed events in the hour grid. */
export function DayView({
  focus,
  filter,
  eventsByDate,
  tasksByDate,
  onEventClick,
  onTaskClick,
  onToggleTask,
}: {
  focus: Date
  filter: CalendarItemFilter
  eventsByDate: Map<string, CalendarEvent[]>
  tasksByDate: Map<string, Task[]>
  onEventClick: (e: CalendarEvent) => void
  onTaskClick: (t: Task) => void
  onToggleTask: (t: Task) => void
}) {
  const iso = toISO(focus)
  const showEvents = filter === 'all' || filter === 'events'
  const showTasks = filter === 'all' || filter === 'tasks'
  const dayEvents = showEvents ? (eventsByDate.get(iso) ?? []).filter((e) => e.startTime) : []
  const dayTasks = showTasks ? tasksByDate.get(iso) ?? [] : []

  return (
    <div>
      {dayTasks.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 border-b border-line pb-3 pl-14">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
            Tasks due
          </span>
          {dayTasks.map((t) => (
            <span key={t.id} className="max-w-[220px]">
              <TaskChip
                task={t}
                onISO={iso}
                onClick={() => onTaskClick(t)}
                onToggle={() => onToggleTask(t)}
              />
            </span>
          ))}
        </div>
      )}

      <div className="relative" style={{ height: `${GRID_HEIGHT}px` }}>
        {hoursRange().map((h, i) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-line"
            style={{ top: `${i * HOUR_PX}px` }}
          >
            <span className="absolute -top-2 left-0 w-14 pr-2 text-right text-[10px] text-ink-subtle">
              {formatTime(`${String(h).padStart(2, '0')}:00`)}
            </span>
          </div>
        ))}
        <div className="absolute bottom-0 left-14 right-0 top-0">
          {dayEvents.map((e) => (
            <button
              key={e.id}
              onClick={() => onEventClick(e)}
              style={eventStyle(e)}
              className={cn(
                'absolute left-1 right-2 overflow-hidden rounded-btn border border-brand-200 bg-brand-50 px-2 py-1 text-left text-xs text-brand-700',
                'transition-colors hover:bg-brand-100',
              )}
            >
              <span className="flex items-center gap-1 font-semibold">
                <CalendarDays className="h-3 w-3 shrink-0 text-brand-500" />
                <span className="truncate">{e.title}</span>
              </span>
              <span className="block text-brand-500">
                {formatTime(e.startTime)}
                {e.endTime ? ` – ${formatTime(e.endTime)}` : ''}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
