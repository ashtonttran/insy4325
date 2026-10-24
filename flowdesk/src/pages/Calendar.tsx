import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarRange, CheckSquare, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { useEventsStore, type CalendarView } from '@/store/eventsStore'
import { useTasksStore } from '@/store/tasksStore'
import { useCalendarsStore } from '@/store/calendarsStore'
import { useUiStore } from '@/store/uiStore'
import type { CalendarEvent } from '@/api/eventsApi'
import type { Task } from '@/api/tasksApi'
import type { Calendar as CalendarType } from '@/api/calendarsApi'
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

/**
 * Task priority colors, matching the dot colors on the Tasks board
 * (HIGH = red, MEDIUM = orange, LOW = green). Each entry provides the
 * matching chip background, left-accent border, text, and dot classes so a
 * task's priority reads the same wherever it appears.
 */
const taskPriorityChip: Record<string, { chip: string; dot: string }> = {
  HIGH: { chip: 'border-l-accent-red bg-red-50 text-red-800', dot: 'bg-accent-red' },
  MEDIUM: { chip: 'border-l-accent-orange bg-amber-50 text-amber-900', dot: 'bg-accent-orange' },
  LOW: { chip: 'border-l-accent-green bg-emerald-50 text-emerald-900', dot: 'bg-accent-green' },
}

/** A task shown on the calendar carries this uniform shape. */
interface TaskChipProps {
  task: Task
  onClick: () => void
  compact?: boolean
}

/** Small task chip used in month cells and all-day strips, colored by priority. */
function TaskChip({ task, onClick, compact }: TaskChipProps) {
  const done = task.status === 'DONE'
  const style = taskPriorityChip[task.priority] ?? taskPriorityChip.MEDIUM
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={`Task (${task.priority.toLowerCase()} priority): ${task.title}`}
      className={cn(
        'flex w-full items-center gap-1 truncate rounded-r border border-l-4 border-line px-1 py-0.5 text-left',
        style.chip,
        done && 'opacity-60',
        compact ? 'text-[11px]' : 'text-xs',
      )}
    >
      <CheckSquare className={cn('h-3 w-3 shrink-0', done ? 'text-ink-subtle' : 'text-current')} />
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', style.dot)} />
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
  const calendars = useCalendarsStore((s) => s.calendars)
  const fetchCalendars = useCalendarsStore((s) => s.fetchAll)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const [dialogDate, setDialogDate] = useState(focusDate)

  // Calendar ids that are currently hidden. Empty = everything visible.
  const [hiddenCalendars, setHiddenCalendars] = useState<Set<number>>(new Set())
  // Whether items not assigned to any calendar are shown.
  const [showUnassigned, setShowUnassigned] = useState(true)

  useEffect(() => {
    void fetchAll()
    void fetchTasks()
    void fetchCalendars()
  }, [fetchAll, fetchTasks, fetchCalendars])

  const isCalendarVisible = (calendarId: number | null) => {
    if (calendarId == null) return showUnassigned
    return !hiddenCalendars.has(calendarId)
  }

  const toggleCalendar = (calendarId: number) => {
    setHiddenCalendars((prev) => {
      const next = new Set(prev)
      if (next.has(calendarId)) next.delete(calendarId)
      else next.add(calendarId)
      return next
    })
  }

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
      if (e.calendarId == null ? !showUnassigned : hiddenCalendars.has(e.calendarId)) continue
      const dates = expandRecurrence(
        e.date,
        (e.recurrence ?? 'NONE') as Recurrence,
        e.recurrenceInterval ?? 1,
        visibleRange.start,
        visibleRange.end,
        e.recurrenceUntil,
      )
      for (const iso of dates) {
        const list = map.get(iso) ?? []
        list.push(e)
        map.set(iso, list)
      }
    }
    return map
  }, [events, visibleRange, hiddenCalendars, showUnassigned])

  // Tasks keyed by date, expanding recurring tasks across every occurrence
  // that falls within the visible range (projected at display time; no extra
  // tasks are stored in the database).
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      if (!t.dueDate) continue
      if (t.calendarId == null ? !showUnassigned : hiddenCalendars.has(t.calendarId)) continue
      const dates = expandRecurrence(
        t.dueDate,
        (t.recurrence ?? 'NONE') as Recurrence,
        t.recurrenceInterval ?? 1,
        visibleRange.start,
        visibleRange.end,
        t.recurrenceUntil,
      )
      for (const iso of dates) {
        const list = map.get(iso) ?? []
        list.push(t)
        map.set(iso, list)
      }
    }
    return map
  }, [tasks, visibleRange, hiddenCalendars, showUnassigned])

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
  // Jump to the day view focused on a specific date (used from the month grid).
  const openDay = (dateISO: string) => {
    setFocusDate(dateISO)
    setView('day')
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
      return `${WEEKDAY_LABELS[focus.getDay()]}, ${MONTH_NAMES[focus.getMonth()]} ${focus.getDate()}`
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

          <CalendarLegend
            calendars={calendars}
            isVisible={isCalendarVisible}
            onToggle={toggleCalendar}
            showUnassigned={showUnassigned}
            onToggleUnassigned={() => setShowUnassigned((v) => !v)}
          />

          {loading && <p className="px-1 py-2 text-sm text-ink-subtle">Loading…</p>}

          {view === 'month' && (
            <MonthView
              focus={focus}
              eventsByDate={eventsByDate}
              tasksByDate={tasksByDate}
              onAddEvent={openNew}
              onOpenDay={openDay}
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

/** A toggleable legend of calendars used to filter what the board shows. */
function CalendarLegend({
  calendars,
  isVisible,
  onToggle,
  showUnassigned,
  onToggleUnassigned,
}: {
  calendars: CalendarType[]
  isVisible: (calendarId: number | null) => boolean
  onToggle: (calendarId: number) => void
  showUnassigned: boolean
  onToggleUnassigned: () => void
}) {
  if (calendars.length === 0) return null
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-line pb-3">
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
        Calendars
      </span>
      {calendars.map((c) => {
        const on = isVisible(c.id)
        return (
          <button
            key={c.id}
            onClick={() => onToggle(c.id)}
            aria-pressed={on}
            title={c.description ?? c.name}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              on ? 'border-line bg-white text-ink' : 'border-line bg-canvas text-ink-subtle',
            )}
          >
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                toneDot[c.tone] ?? toneDot.purple,
                !on && 'opacity-30',
              )}
            />
            <span className={cn(!on && 'line-through')}>{c.name}</span>
          </button>
        )
      })}
      <button
        onClick={onToggleUnassigned}
        aria-pressed={showUnassigned}
        title="Events and tasks not assigned to a calendar"
        className={cn(
          'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
          showUnassigned ? 'border-line bg-white text-ink' : 'border-line bg-canvas text-ink-subtle',
        )}
      >
        <span className={cn('h-2.5 w-2.5 rounded-full bg-ink-subtle', !showUnassigned && 'opacity-30')} />
        <span className={cn(!showUnassigned && 'line-through')}>Unassigned</span>
      </button>
    </div>
  )
}

function MonthView({
  focus,
  eventsByDate,
  tasksByDate,
  onAddEvent,
  onOpenDay,
  onEventClick,
  onTaskClick,
}: {
  focus: Date
  eventsByDate: Map<string, CalendarEvent[]>
  tasksByDate: Map<string, Task[]>
  onAddEvent: (iso: string) => void
  onOpenDay: (iso: string) => void
  onEventClick: (e: CalendarEvent) => void
  onTaskClick: (t: Task) => void
}) {
  const grid = monthGrid(focus)
  const today = parseISO(todayInCentral())
  // The ISO date whose action menu is currently open (null = none).
  const [menuIso, setMenuIso] = useState<string | null>(null)

  // Dismiss the day menu on Escape for keyboard users.
  useEffect(() => {
    if (!menuIso) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuIso(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuIso])

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
          const menuOpen = menuIso === iso
          return (
            <div
              key={iso}
              onClick={() => setMenuIso((cur) => (cur === iso ? null : iso))}
              className={cn(
                'relative min-h-[92px] cursor-pointer border-b border-r border-line p-1.5 transition-colors hover:bg-canvas',
                !inMonth && 'bg-canvas/50',
                menuOpen && 'bg-canvas ring-1 ring-inset ring-brand-200',
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

              {menuOpen && (
                <DayActionMenu
                  onClose={() => setMenuIso(null)}
                  onOpenDay={() => {
                    setMenuIso(null)
                    onOpenDay(iso)
                  }}
                  onAddEvent={() => {
                    setMenuIso(null)
                    onAddEvent(iso)
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Small popover shown when a month-view day is clicked. */
function DayActionMenu({
  onClose,
  onOpenDay,
  onAddEvent,
}: {
  onClose: () => void
  onOpenDay: () => void
  onAddEvent: () => void
}) {
  return (
    <>
      {/* Click-away backdrop; stops the click from reselecting the cell. */}
      <div
        className="fixed inset-0 z-30"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-hidden
      />
      <div
        role="menu"
        onClick={(e) => e.stopPropagation()}
        className="absolute left-1/2 top-9 z-40 w-44 -translate-x-1/2 overflow-hidden rounded-card border border-line bg-white py-1 shadow-popover"
      >
        <button
          role="menuitem"
          onClick={onOpenDay}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-canvas"
        >
          <CalendarRange className="h-4 w-4 shrink-0 text-ink-muted" />
          Open day view
        </button>
        <button
          role="menuitem"
          onClick={onAddEvent}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-canvas"
        >
          <Plus className="h-4 w-4 shrink-0 text-ink-muted" />
          Add event
        </button>
      </div>
    </>
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
  const hours = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i)
  // One shared column template keeps the day headers, the all-day task row, and
  // the time columns perfectly aligned: a fixed time-label gutter + 7 day columns.
  const weekCols = 'grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]'
  return (
    <div>
      <div className={cn(weekCols, 'border-b border-line pb-2')}>
        {/* Spacer above the time gutter */}
        <div aria-hidden />
        {days.map((d) => (
          <div key={toISO(d)} className="text-center">
            <div className="text-xs text-ink-subtle">{WEEKDAY_LABELS[d.getDay()]}</div>
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
        <div className={cn(weekCols, 'border-b border-line py-1')}>
          <div className="pr-2 text-right text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
            All day
          </div>
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

      <div className={weekCols}>
        {/* Time-label gutter, aligned with the hour gridlines in each day column */}
        <div className="relative" style={{ height: `${(DAY_END - DAY_START + 1) * HOUR_PX}px` }}>
          {hours.map((h, i) => (
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
          const dayEvents = (eventsByDate.get(iso) ?? []).filter((e) => e.startTime)
          return (
            <div
              key={iso}
              className="relative border-r border-line first-of-type:border-l"
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
              {dayTasks.map((t) => {
                const style = taskPriorityChip[t.priority] ?? taskPriorityChip.MEDIUM
                const done = t.status === 'DONE'
                return (
                  <button
                    key={t.id}
                    onClick={() => onTaskClick(t)}
                    title={`${t.priority.toLowerCase()} priority`}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-r-btn border border-l-4 border-line px-3 py-2 text-left hover:brightness-95',
                      style.chip,
                      done && 'opacity-60',
                    )}
                  >
                    <CheckSquare
                      className={cn('h-4 w-4 shrink-0', done ? 'text-ink-subtle' : 'text-current')}
                    />
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', style.dot)} />
                    <span className={cn('text-sm', done && 'line-through opacity-80')}>
                      {t.title}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
