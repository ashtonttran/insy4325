import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  WEEKDAY_LABELS,
  formatTime,
  isSameDay,
  parseISO,
  todayInCentral,
  toISO,
  weekDays,
} from '@/lib/calendar'
import type { CalendarEvent } from '@/api/eventsApi'
import type { Task } from '@/api/tasksApi'
import type { CalendarItemFilter } from './CalendarToolbar'
import { TaskChip } from './calendarItems'
import { GRID_HEIGHT, HOUR_PX, eventStyle, hoursRange } from './timeGrid'

/**
 * Week view: a Sunday→Saturday grid with a shared column template so the day
 * headers, the all-day task row, and the timed-event columns stay aligned.
 */
export function WeekView({
  focus,
  selectedISO,
  filter,
  eventsByDate,
  tasksByDate,
  onSelectDay,
  onEventClick,
  onTaskClick,
  onToggleTask,
}: {
  focus: Date
  selectedISO: string
  filter: CalendarItemFilter
  eventsByDate: Map<string, CalendarEvent[]>
  tasksByDate: Map<string, Task[]>
  onSelectDay: (iso: string) => void
  onEventClick: (e: CalendarEvent) => void
  onTaskClick: (t: Task) => void
  onToggleTask: (t: Task) => void
}) {
  const days = weekDays(focus)
  const today = parseISO(todayInCentral())
  const showEvents = filter === 'all' || filter === 'events'
  const showTasks = filter === 'all' || filter === 'tasks'
  const anyTasks = showTasks && days.some((d) => (tasksByDate.get(toISO(d)) ?? []).length > 0)
  const cols = 'grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]'

  return (
    <div>
      <div className={cn(cols, 'border-b border-line pb-2')}>
        <div aria-hidden />
        {days.map((d) => {
          const iso = toISO(d)
          const isToday = isSameDay(d, today)
          const isSelected = iso === selectedISO
          return (
            <button
              key={iso}
              onClick={() => onSelectDay(iso)}
              className={cn(
                'rounded-md py-1 text-center transition-colors hover:bg-brand-50/40',
                isSelected && 'bg-brand-50/60 ring-1 ring-inset ring-brand-300',
              )}
            >
              <div className="text-xs text-ink-subtle">{WEEKDAY_LABELS[d.getDay()]}</div>
              <div
                className={cn(
                  'mx-auto flex h-6 w-6 items-center justify-center rounded-full text-xs',
                  isToday ? 'bg-brand-500 font-semibold text-white' : 'text-ink',
                )}
              >
                {d.getDate()}
              </div>
            </button>
          )
        })}
      </div>

      {anyTasks && (
        <div className={cn(cols, 'border-b border-line py-1')}>
          <div className="pr-2 text-right text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
            All day
          </div>
          {days.map((d) => {
            const iso = toISO(d)
            const dt = tasksByDate.get(iso) ?? []
            return (
              <div key={iso} className="space-y-0.5 px-0.5">
                {dt.map((t) => (
                  <TaskChip
                    key={t.id}
                    task={t}
                    onISO={iso}
                    onClick={() => onTaskClick(t)}
                    onToggle={() => onToggleTask(t)}
                  />
                ))}
              </div>
            )
          })}
        </div>
      )}

      <div className={cols}>
        <div className="relative" style={{ height: `${GRID_HEIGHT}px` }}>
          {hoursRange().map((h, i) => (
            <span
              key={h}
              className="absolute right-2 -translate-y-1/2 text-[10px] text-ink-subtle"
              style={{ top: `${i * HOUR_PX}px` }}
            >
              {formatTime(`${String(h).padStart(2, '0')}:00`)}
            </span>
          ))}
        </div>
        {days.map((d) => {
          const iso = toISO(d)
          const dayEvents = showEvents
            ? (eventsByDate.get(iso) ?? []).filter((e) => e.startTime)
            : []
          return (
            <div
              key={iso}
              className="relative border-r border-line first-of-type:border-l"
              onClick={() => onSelectDay(iso)}
              style={{ height: `${GRID_HEIGHT}px` }}
            >
              {hoursRange().map((_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 border-t border-line"
                  style={{ top: `${i * HOUR_PX}px` }}
                />
              ))}
              {dayEvents.map((e) => (
                <button
                  key={e.id}
                  onClick={(ev) => {
                    ev.stopPropagation()
                    onEventClick(e)
                  }}
                  style={eventStyle(e)}
                  className="absolute left-0.5 right-0.5 overflow-hidden rounded border border-brand-200 bg-brand-50 px-1 py-0.5 text-left text-[10px] text-brand-700 transition-colors hover:bg-brand-100"
                >
                  <span className="flex items-center gap-0.5 font-semibold">
                    <CalendarDays className="h-2.5 w-2.5 shrink-0 text-brand-500" />
                    <span className="truncate">{e.title}</span>
                  </span>
                  <span className="block truncate text-brand-500">{formatTime(e.startTime)}</span>
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
