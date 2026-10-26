import { cn } from '@/lib/cn'
import {
  WEEKDAY_LABELS,
  isSameDay,
  monthGrid,
  parseISO,
  todayInCentral,
  toISO,
} from '@/lib/calendar'
import type { CalendarEvent } from '@/api/eventsApi'
import type { Task } from '@/api/tasksApi'
import type { CalendarItemFilter } from './CalendarToolbar'
import { EventChip, TaskChip } from './calendarItems'
import { orderDayItems, type DayItem } from './dayItems'

const MAX_VISIBLE = 2

/**
 * Month grid: a 6-week calendar. Each cell shows at most two items (ordered by
 * urgency then time) with a "+N more" overflow that selects the day so the rest
 * appear in the sidebar. Today is a filled purple circle; the selected day gets
 * a purple ring without competing with the today indicator.
 */
export function MonthGrid({
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
  const grid = monthGrid(focus)
  const today = parseISO(todayInCentral())

  return (
    <div className="overflow-hidden rounded-card border border-line">
      <div className="grid grid-cols-7 border-b border-line bg-canvas/50">
        {WEEKDAY_LABELS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-ink-subtle"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((day, idx) => {
          const iso = toISO(day)
          const inMonth = day.getMonth() === focus.getMonth()
          const isToday = isSameDay(day, today)
          const isSelected = iso === selectedISO

          const items = orderDayItems(
            eventsByDate.get(iso) ?? [],
            tasksByDate.get(iso) ?? [],
            iso,
            filter,
          )
          const visible = items.slice(0, MAX_VISIBLE)
          const overflow = items.length - visible.length

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDay(iso)}
              className={cn(
                'group relative flex min-h-[104px] flex-col gap-1 border-b border-r border-line p-1.5 text-left transition-colors',
                // Remove the right border on the last column of each row.
                idx % 7 === 6 && 'border-r-0',
                !inMonth && 'bg-canvas/40',
                'hover:bg-brand-50/40 focus:outline-none',
                isSelected && 'bg-brand-50/60 ring-2 ring-inset ring-brand-300',
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs transition-colors',
                    isToday && 'bg-brand-500 font-semibold text-white',
                    !isToday && inMonth && 'text-ink',
                    !isToday && !inMonth && 'text-ink-subtle',
                  )}
                >
                  {day.getDate()}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                {visible.map((item) =>
                  item.kind === 'event' ? (
                    <EventChip
                      key={`e-${item.event.id}`}
                      event={item.event}
                      onClick={() => onEventClick(item.event)}
                    />
                  ) : (
                    <TaskChip
                      key={`t-${item.task.id}`}
                      task={item.task}
                      onISO={iso}
                      onClick={() => onTaskClick(item.task)}
                      onToggle={() => onToggleTask(item.task)}
                    />
                  ),
                )}
                {overflow > 0 && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium text-ink-subtle group-hover:text-brand-600"
                    title="Show all items for this day in the sidebar"
                  >
                    +{overflow} more
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export type { DayItem }
