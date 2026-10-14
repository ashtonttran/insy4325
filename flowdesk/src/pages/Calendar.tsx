import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckSquare, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { useEventsStore, type CalendarView } from '@/store/eventsStore'
import { useTasksStore } from '@/store/tasksStore'
import { useUiStore } from '@/store/uiStore'
import type { CalendarEvent } from '@/api/eventsApi'
import type { Task } from '@/api/tasksApi'
import { EventDialog } from '@/components/calendar/EventDialog'
import {
  MONTH_NAMES,
  WEEKDAY_LABELS,
  addDays,
  addMonths,
  expandRecurrence,
  formatTime,
  isSameDay,
  monthGrid,
  parseISO,
  timeToHours,
  todayInCentral,
  toISO,
  weekDays,
  type Recurrence,
} from '@/lib/calendar'

const toneBlock: Record<string, string> = {
  purple: 'border-brand-200 bg-brand-50 text-brand-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  red: 'border-red-200 bg-red-50 text-red-700',
}
const toneDot: Record<string, string> = {
  purple: 'bg-brand-500',
  amber: 'bg-amber-400',
  green: 'bg-emerald-500',
  red: 'bg-red-500',
}

/** A task shown on the calendar carries this uniform shape. */
interface TaskChipProps {
  task: Task
  onClick: () => void
  compact?: boolean
}

/** Small task chip used in month cells and all-day strips. */
function TaskChip({ task, onClick, compact }: TaskChipProps) {
  const done = task.status === 'DONE'
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={`Task: ${task.title}`}
      className={cn(
        'flex w-full items-center gap-1 truncate rounded border border-dashed border-ink-subtle/40 bg-canvas px-1 py-0.5 text-left text-ink-muted',
        compact ? 'text-[11px]' : 'text-xs',
      )}
    >
      <CheckSquare className="h-3 w-3 shrink-0 text-ink-subtle" />
      <span className={cn('truncate', done && 'line-through')}>{task.title}</span>
    </button>
  )
}

/** Calendar Board — month/week/day views with tasks reflected and an agenda panel. */
export function Calendar() {
  const navigate = useNavigate()
  const { events, view, focusDate, loading, error, fetchAll, setView, setFocusDate } =
    useEventsStore()
  const tasks = useTasksStore((s) => s.tasks)
  const fetchTasks = useTasksStore((s) => s.fetchAll)
  const selectTask = useTasksStore((s) => s.selectTask)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const [dialogDate, setDialogDate] = useState(focusDate)

  useEffect(() => {
    void fetchAll()
    void fetchTasks()
  }, [fetchAll, fetchTasks])

  // If Quick Add requested a new event, open the dialog on arrival.
  const openNewEventRequested = useUiStore((s) => s.openNewEventOnCalendar)
  const consumeNewEvent = useUiStore((s) => s.consumeNewEvent)
  useEffect(() => {
    if (openNewEventRequested) {
      setEditing(null)
      setDialogDate(focusDate)
      setDialogOpen(true)
      consumeNewEvent()
    }
  }, [openNewEventRequested, consumeNewEvent, focusDate])

  const focus = parseISO(focusDate)

  // The visible date range for the current view, used to project recurrences.
  const visibleRange = useMemo(() => {
    if (view === 'month') {
      const grid = monthGrid(focus)
      return { start: toISO(grid[0]), end: toISO(grid[grid.length - 1]) }
    }
    if (view === 'week') {
      const days = weekDays(focus)
      return { start: toISO(days[0]), end: toISO(days[6]) }
    }
    const iso = toISO(focus)
    return { start: iso, end: iso }
  }, [view, focus])

  // Events keyed by date, expanding recurring events across every occurrence
  // within the visible range (projected at display time; one stored event).
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      const dates = expandRecurrence(
        e.date,
        (e.recurrence ?? 'NONE') as Recurrence,
        e.recurrenceInterval ?? 1,
        visibleRange.start,
        visibleRange.end,
      )
      for (const iso of dates) {
        const list = map.get(iso) ?? []
        list.push(e)
        map.set(iso, list)
      }
    }
    return map
  }, [events, visibleRange])

  // Tasks keyed by date, expanding recurring tasks across every occurrence
  // that falls within the visible range (projected at display time; no extra
  // tasks are stored in the database).
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      if (!t.dueDate) continue
      const dates = expandRecurrence(
        t.dueDate,
        (t.recurrence ?? 'NONE') as Recurrence,
        t.recurrenceInterval ?? 1,
        visibleRange.start,
        visibleRange.end,
      )
      for (const iso of dates) {
        const list = map.get(iso) ?? []
        list.push(t)
        map.set(iso, list)
      }
    }
    return map
  }, [tasks, visibleRange])

  const openNew = (dateISO: string) => {
    setEditing(null)
    setDialogDate(dateISO)
    setDialogOpen(true)
  }
  const openEdit = (event: CalendarEvent) => {
    setEditing(event)
    setDialogDate(event.date)
    setDialogOpen(true)
  }
  const openTask = (task: Task) => {
    selectTask(task.id)
    navigate('/tasks')
  }

  const navArrow = (dir: -1 | 1) => {
    if (view === 'month') setFocusDate(toISO(addMonths(focus, dir)))
    else if (view === 'week') setFocusDate(toISO(addDays(focus, dir * 7)))
    else setFocusDate(toISO(addDays(focus, dir)))
  }

  const setMonth = (monthIdx: number) => {
    const d = new Date(focus.getFullYear(), monthIdx, 1)
    setFocusDate(toISO(d))
  }
  const setYear = (year: number) => {
    const d = new Date(year, focus.getMonth(), 1)
    setFocusDate(toISO(d))
  }

  // Year options: a sensible window around the focused year.
  const years = useMemo(() => {
    const base = focus.getFullYear()
    const start = Math.min(base - 3, new Date().getFullYear() - 3)
    return Array.from({ length: 10 }, (_, i) => start + i)
  }, [focus])

  const rangeLabel = () => {
    if (view === 'week') {
      const days = weekDays(focus)
      const a = days[0]
      const b = days[6]
      return `${MONTH_NAMES[a.getMonth()].slice(0, 3)} ${a.getDate()} – ${MONTH_NAMES[b.getMonth()].slice(0, 3)} ${b.getDate()}, ${b.getFullYear()}`
    }
    if (view === 'day') {
      return `${WEEKDAY_LABELS[(focus.getDay() + 6) % 7]}, ${MONTH_NAMES[focus.getMonth()]} ${focus.getDate()}`
    }
    return null
  }

  return (
    <AppLayout title="Calendar Board" subtitle="Track your classes, study sessions, and deadlines.">
      {error && (
        <div className="mb-4 rounded-btn border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="p-4">
          {/* Toolbar — a single non-wrapping row across every view */}
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {/* Month + year dropdowns for quick navigation */}
              <select
                value={focus.getMonth()}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="rounded-btn border border-line bg-white px-2 py-1 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-brand-100"
                aria-label="Month"
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={focus.getFullYear()}
                onChange={(e) => setYear(Number(e.target.value))}
                className="rounded-btn border border-line bg-white px-2 py-1 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-brand-100"
                aria-label="Year"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <div className="ml-1 flex items-center gap-1">
                <button
                  onClick={() => navArrow(-1)}
                  aria-label="Previous"
                  className="rounded-btn border border-line p-1 text-ink-muted hover:bg-canvas"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navArrow(1)}
                  aria-label="Next"
                  className="rounded-btn border border-line p-1 text-ink-muted hover:bg-canvas"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setFocusDate(todayInCentral())}
                  className="rounded-btn border border-line px-2 py-1 text-xs font-medium text-ink-muted hover:bg-canvas"
                >
                  Today
                </button>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ViewToggle view={view} onChange={setView} />
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => openNew(focusDate)}>
                New Event
              </Button>
            </div>
          </div>

          {/* Range label on its own line so the toolbar height never changes */}
          <div className="mb-3 h-4">
            {rangeLabel() && (
              <span className="text-sm font-medium text-ink-muted">{rangeLabel()}</span>
            )}
          </div>

          {loading && <p className="px-1 py-2 text-sm text-ink-subtle">Loading…</p>}

          {view === 'month' && (
            <MonthView
              focus={focus}
              eventsByDate={eventsByDate}
              tasksByDate={tasksByDate}
              onDayClick={openNew}
              onEventClick={openEdit}
              onTaskClick={openTask}
            />
          )}
          {view === 'week' && (
            <WeekView
              focus={focus}
              eventsByDate={eventsByDate}
              tasksByDate={tasksByDate}
              onEventClick={openEdit}
              onSlotClick={openNew}
              onTaskClick={openTask}
            />
          )}
          {view === 'day' && (
            <DayView
              focus={focus}
              eventsByDate={eventsByDate}
              tasksByDate={tasksByDate}
              onEventClick={openEdit}
              onSlotClick={openNew}
              onTaskClick={openTask}
            />
          )}
        </Card>

        <AgendaPanel
          focus={focus}
          eventsByDate={eventsByDate}
          tasksByDate={tasksByDate}
          onEventClick={openEdit}
          onTaskClick={openTask}
        />
      </div>

      {dialogOpen && (
        <EventDialog event={editing} defaultDate={dialogDate} onClose={() => setDialogOpen(false)} />
      )}
    </AppLayout>
  )
}

function ViewToggle({ view, onChange }: { view: CalendarView; onChange: (v: CalendarView) => void }) {
  const opts: CalendarView[] = ['day', 'week', 'month']
  return (
    <div className="flex rounded-btn border border-line p-0.5">
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            'rounded px-3 py-1 text-xs font-medium capitalize',
            view === o ? 'bg-brand-500 text-white' : 'text-ink-muted hover:bg-canvas',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

function MonthView({
  focus,
  eventsByDate,
  tasksByDate,
  onDayClick,
  onEventClick,
  onTaskClick,
}: {
  focus: Date
  eventsByDate: Map<string, CalendarEvent[]>
  tasksByDate: Map<string, Task[]>
  onDayClick: (iso: string) => void
  onEventClick: (e: CalendarEvent) => void
  onTaskClick: (t: Task) => void
}) {
  const grid = monthGrid(focus)
  const today = parseISO(todayInCentral())
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-line pb-2">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-ink-subtle">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((day) => {
          const iso = toISO(day)
          const dayEvents = eventsByDate.get(iso) ?? []
          const dayTasks = tasksByDate.get(iso) ?? []
          const inMonth = day.getMonth() === focus.getMonth()
          const items = dayEvents.length + dayTasks.length
          return (
            <div
              key={iso}
              onClick={() => onDayClick(iso)}
              className={cn(
                'min-h-[92px] cursor-pointer border-b border-r border-line p-1.5 transition-colors hover:bg-canvas',
                !inMonth && 'bg-canvas/50',
              )}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                    isSameDay(day, today) ? 'bg-brand-500 font-semibold text-white' : 'text-ink',
                    !inMonth && 'text-ink-subtle',
                  )}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((e) => (
                  <button
                    key={`e-${e.id}`}
                    onClick={(ev) => {
                      ev.stopPropagation()
                      onEventClick(e)
                    }}
                    className={cn(
                      'flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px]',
                      toneBlock[e.tone],
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', toneDot[e.tone])} />
                    <span className="truncate">{e.title}</span>
                  </button>
                ))}
                {dayTasks.slice(0, Math.max(0, 3 - dayEvents.length)).map((t) => (
                  <TaskChip key={`t-${t.id}`} task={t} onClick={() => onTaskClick(t)} compact />
                ))}
                {items > 3 && (
                  <span className="pl-1 text-[10px] text-ink-subtle">+{items - 3} more</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const DAY_START = 7 // 7 AM
const DAY_END = 20 // 8 PM
const HOUR_PX = 48

/** Horizontal strip of all-day tasks above a time grid. */
function TaskStrip({ tasks, onTaskClick }: { tasks: Task[]; onTaskClick: (t: Task) => void }) {
  if (tasks.length === 0) return null
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1 border-b border-line pb-2 pl-14">
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
        Tasks due
      </span>
      {tasks.map((t) => (
        <span key={t.id} className="max-w-[160px]">
          <TaskChip task={t} onClick={() => onTaskClick(t)} />
        </span>
      ))}
    </div>
  )
}

function TimeGrid({ children }: { children: React.ReactNode }) {
  const hours = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i)
  return (
    <div className="relative" style={{ height: `${(DAY_END - DAY_START + 1) * HOUR_PX}px` }}>
      {hours.map((h, i) => (
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
      <div className="absolute bottom-0 left-14 right-0 top-0">{children}</div>
    </div>
  )
}

function eventStyle(e: CalendarEvent): React.CSSProperties {
  const start = timeToHours(e.startTime)
  const end = e.endTime ? timeToHours(e.endTime) : start + 1
  const top = (Math.max(start, DAY_START) - DAY_START) * HOUR_PX
  const height = Math.max((end - Math.max(start, DAY_START)) * HOUR_PX, 20)
  return { top: `${top}px`, height: `${height}px` }
}

function DayView({
  focus,
  eventsByDate,
  tasksByDate,
  onEventClick,
  onSlotClick,
  onTaskClick,
}: {
  focus: Date
  eventsByDate: Map<string, CalendarEvent[]>
  tasksByDate: Map<string, Task[]>
  onEventClick: (e: CalendarEvent) => void
  onSlotClick: (iso: string) => void
  onTaskClick: (t: Task) => void
}) {
  const iso = toISO(focus)
  const dayEvents = (eventsByDate.get(iso) ?? []).filter((e) => e.startTime)
  const dayTasks = tasksByDate.get(iso) ?? []
  return (
    <div onDoubleClick={() => onSlotClick(iso)}>
      <TaskStrip tasks={dayTasks} onTaskClick={onTaskClick} />
      <TimeGrid>
        {dayEvents.map((e) => (
          <button
            key={e.id}
            onClick={() => onEventClick(e)}
            style={eventStyle(e)}
            className={cn(
              'absolute left-1 right-2 overflow-hidden rounded-btn border px-2 py-1 text-left text-xs',
              toneBlock[e.tone],
            )}
          >
            <span className="block font-semibold">{e.title}</span>
            <span className="block opacity-80">
              {formatTime(e.startTime)}
              {e.endTime ? ` – ${formatTime(e.endTime)}` : ''}
            </span>
          </button>
        ))}
      </TimeGrid>
    </div>
  )
}

function WeekView({
  focus,
  eventsByDate,
  tasksByDate,
  onEventClick,
  onSlotClick,
  onTaskClick,
}: {
  focus: Date
  eventsByDate: Map<string, CalendarEvent[]>
  tasksByDate: Map<string, Task[]>
  onEventClick: (e: CalendarEvent) => void
  onSlotClick: (iso: string) => void
  onTaskClick: (t: Task) => void
}) {
  const days = weekDays(focus)
  const today = parseISO(todayInCentral())
  const anyTasks = days.some((d) => (tasksByDate.get(toISO(d)) ?? []).length > 0)
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-line pb-2 pl-14">
        {days.map((d) => (
          <div key={toISO(d)} className="text-center">
            <div className="text-xs text-ink-subtle">{WEEKDAY_LABELS[(d.getDay() + 6) % 7]}</div>
            <div
              className={cn(
                'mx-auto flex h-6 w-6 items-center justify-center rounded-full text-xs',
                isSameDay(d, today) ? 'bg-brand-500 font-semibold text-white' : 'text-ink',
              )}
            >
              {d.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* All-day task row across the week */}
      {anyTasks && (
        <div className="grid grid-cols-7 border-b border-line py-1 pl-14">
          {days.map((d) => {
            const dt = tasksByDate.get(toISO(d)) ?? []
            return (
              <div key={toISO(d)} className="space-y-0.5 px-0.5">
                {dt.map((t) => (
                  <TaskChip key={t.id} task={t} onClick={() => onTaskClick(t)} compact />
                ))}
              </div>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-7">
        {days.map((d) => {
          const iso = toISO(d)
          const dayEvents = (eventsByDate.get(iso) ?? []).filter((e) => e.startTime)
          return (
            <div
              key={iso}
              className="relative border-r border-line"
              onDoubleClick={() => onSlotClick(iso)}
              style={{ height: `${(DAY_END - DAY_START + 1) * HOUR_PX}px` }}
            >
              {Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 border-t border-line"
                  style={{ top: `${i * HOUR_PX}px` }}
                />
              ))}
              {dayEvents.map((e) => (
                <button
                  key={e.id}
                  onClick={() => onEventClick(e)}
                  style={eventStyle(e)}
                  className={cn(
                    'absolute left-0.5 right-0.5 overflow-hidden rounded border px-1 py-0.5 text-left text-[10px]',
                    toneBlock[e.tone],
                  )}
                >
                  <span className="block truncate font-semibold">{e.title}</span>
                  <span className="block truncate opacity-80">{formatTime(e.startTime)}</span>
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AgendaPanel({
  focus,
  eventsByDate,
  tasksByDate,
  onEventClick,
  onTaskClick,
}: {
  focus: Date
  eventsByDate: Map<string, CalendarEvent[]>
  tasksByDate: Map<string, Task[]>
  onEventClick: (e: CalendarEvent) => void
  onTaskClick: (t: Task) => void
}) {
  const iso = toISO(focus)
  const dayEvents = (eventsByDate.get(iso) ?? [])
    .slice()
    .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
  const dayTasks = tasksByDate.get(iso) ?? []

  return (
    <Card className="h-fit p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        Agenda for {MONTH_NAMES[focus.getMonth()].slice(0, 3)} {focus.getDate()}
      </p>
      <div className="mt-3 space-y-3">
        {dayEvents.length === 0 && dayTasks.length === 0 && (
          <p className="text-sm text-ink-muted">Nothing scheduled.</p>
        )}
        {dayEvents.map((e) => (
          <button
            key={e.id}
            onClick={() => onEventClick(e)}
            className={cn('block w-full rounded-btn border px-3 py-2 text-left', toneBlock[e.tone])}
          >
            <p className="text-xs opacity-80">
              {e.startTime ? formatTime(e.startTime) : 'All day'}
              {e.endTime ? ` – ${formatTime(e.endTime)}` : ''}
            </p>
            <p className="text-sm font-semibold text-ink">{e.title}</p>
            {e.location && <p className="text-xs text-ink-muted">{e.location}</p>}
          </button>
        ))}

        {dayTasks.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
              Tasks due
            </p>
            <div className="space-y-1.5">
              {dayTasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onTaskClick(t)}
                  className="flex w-full items-center gap-2 rounded-btn border border-dashed border-line px-3 py-2 text-left hover:bg-canvas"
                >
                  <CheckSquare className="h-4 w-4 shrink-0 text-ink-subtle" />
                  <span
                    className={cn(
                      'text-sm text-ink',
                      t.status === 'DONE' && 'text-ink-subtle line-through',
                    )}
                  >
                    {t.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
