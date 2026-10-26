import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { useEventsStore } from '@/store/eventsStore'
import { useTasksStore } from '@/store/tasksStore'
import { useCalendarsStore } from '@/store/calendarsStore'
import { useUiStore } from '@/store/uiStore'
import type { CalendarEvent } from '@/api/eventsApi'
import type { Task } from '@/api/tasksApi'
import { EventDialog } from '@/components/calendar/EventDialog'
import { TaskDrawer } from '@/components/tasks/TaskDrawer'
import { CalendarToolbar, type CalendarItemFilter } from '@/components/calendar/CalendarToolbar'
import { MonthGrid } from '@/components/calendar/MonthGrid'
import { DailyAgendaSidebar } from '@/components/calendar/DailyAgendaSidebar'
import { CalendarFilters, type AdvancedFilters } from '@/components/calendar/CalendarFilters'
import { WeekView } from '@/components/calendar/WeekView'
import { DayView } from '@/components/calendar/DayView'
import { taskUrgency } from '@/components/calendar/calendarItems'
import {
  MONTH_NAMES,
  WEEKDAY_LABELS,
  addDays,
  addMonths,
  expandRecurrence,
  monthGrid,
  parseISO,
  todayInCentral,
  toISO,
  weekDays,
  type Recurrence,
} from '@/lib/calendar'

/**
 * Calendar Board — a hybrid month/week/day calendar with a daily agenda
 * sidebar. Events and tasks are visually distinct (calendar pill vs checkbox
 * row). Recurrence expansion, calendar-category visibility, editing, deletion,
 * and completion all reuse the existing stores and dialogs.
 */
export function Calendar() {
  const { events, view, focusDate, loading, error, fetchAll, setView, setFocusDate } =
    useEventsStore()
  const tasks = useTasksStore((s) => s.tasks)
  const fetchTasks = useTasksStore((s) => s.fetchAll)
  const selectTask = useTasksStore((s) => s.selectTask)
  const createTask = useTasksStore((s) => s.createTask)
  const changeStatus = useTasksStore((s) => s.changeStatus)
  const deleteTask = useTasksStore((s) => s.deleteTask)
  const calendars = useCalendarsStore((s) => s.calendars)
  const fetchCalendars = useCalendarsStore((s) => s.fetchAll)
  const deleteEvent = useEventsStore((s) => s.deleteEvent)

  // The day the agenda sidebar reflects. Defaults to the focused date.
  const [selectedISO, setSelectedISO] = useState(focusDate)
  const [itemFilter, setItemFilter] = useState<CalendarItemFilter>('all')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [advanced, setAdvanced] = useState<AdvancedFilters>({
    completion: 'all',
    priority: 'all',
    calendarId: 'all',
    overdueOnly: false,
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const [dialogDate, setDialogDate] = useState(focusDate)

  useEffect(() => {
    void fetchAll()
    void fetchTasks()
    void fetchCalendars()
  }, [fetchAll, fetchTasks, fetchCalendars])

  // Quick Add (from the top bar) opens the new-event dialog on arrival.
  const openNewEventRequested = useUiStore((s) => s.openNewEventOnCalendar)
  const consumeNewEvent = useUiStore((s) => s.consumeNewEvent)
  useEffect(() => {
    if (openNewEventRequested) {
      setEditing(null)
      setDialogDate(selectedISO)
      setDialogOpen(true)
      consumeNewEvent()
    }
  }, [openNewEventRequested, consumeNewEvent, selectedISO])

  const focus = parseISO(focusDate)

  // Visible date range for the current view, used to project recurrences.
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

  // Whether an item passes the advanced-filter panel (category + overdue here;
  // per-item completion/priority is applied where tasks are listed).
  const passesCalendar = (calendarId: number | null) =>
    advanced.calendarId === 'all' || calendarId === advanced.calendarId

  // Events keyed by date, expanding recurrences across the visible range.
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      if (!passesCalendar(e.calendarId)) continue
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, visibleRange, advanced.calendarId])

  // Tasks keyed by date (only those with a due date), expanding recurrences.
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      if (!t.dueDate) continue
      if (!passesCalendar(t.calendarId)) continue
      if (advanced.priority !== 'all' && t.priority !== advanced.priority) continue
      if (advanced.completion === 'complete' && t.status !== 'DONE') continue
      if (advanced.completion === 'incomplete' && t.status === 'DONE') continue
      const dates = expandRecurrence(
        t.dueDate,
        (t.recurrence ?? 'NONE') as Recurrence,
        t.recurrenceInterval ?? 1,
        visibleRange.start,
        visibleRange.end,
        t.recurrenceUntil,
      )
      for (const iso of dates) {
        if (advanced.overdueOnly && taskUrgency(t, iso) !== 'overdue') continue
        const list = map.get(iso) ?? []
        list.push(t)
        map.set(iso, list)
      }
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, visibleRange, advanced])

  /* ----------------------------------------------------------- actions */

  const openNewEvent = (dateISO: string) => {
    setEditing(null)
    setDialogDate(dateISO)
    setDialogOpen(true)
  }
  const openEditEvent = (event: CalendarEvent) => {
    setEditing(event)
    setDialogDate(event.date)
    setDialogOpen(true)
  }
  const openTask = (task: Task) => selectTask(task.id)
  const toggleTask = (task: Task) =>
    void changeStatus(task.id, task.status === 'DONE' ? 'TODO' : 'DONE')

  // Create a task pre-dated to the selected day, then open it for editing.
  const addTaskOnDate = async (dateISO: string) => {
    const created = await createTask({
      title: 'New task',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: dateISO,
      subtasks: [],
    })
    if (created) selectTask(created.id)
  }

  const selectDay = (iso: string) => setSelectedISO(iso)

  // Navigation keeps the selected day in view when it moves with the period.
  const navArrow = (dir: -1 | 1) => {
    if (view === 'month') setFocusDate(toISO(addMonths(focus, dir)))
    else if (view === 'week') setFocusDate(toISO(addDays(focus, dir * 7)))
    else {
      const next = toISO(addDays(focus, dir))
      setFocusDate(next)
      setSelectedISO(next)
    }
  }
  const goToday = () => {
    const t = todayInCentral()
    setFocusDate(t)
    setSelectedISO(t)
  }

  const heading = useMemo(() => {
    if (view === 'week') {
      const days = weekDays(focus)
      const a = days[0]
      const b = days[6]
      return `${MONTH_NAMES[a.getMonth()].slice(0, 3)} ${a.getDate()} – ${MONTH_NAMES[
        b.getMonth()
      ].slice(0, 3)} ${b.getDate()}, ${b.getFullYear()}`
    }
    if (view === 'day') {
      return `${WEEKDAY_LABELS[focus.getDay()]}, ${MONTH_NAMES[focus.getMonth()]} ${focus.getDate()}`
    }
    return `${MONTH_NAMES[focus.getMonth()]} ${focus.getFullYear()}`
  }, [view, focus])

  return (
    <AppLayout title="Calendar" subtitle="Track your classes, study sessions, and deadlines.">
      {error && (
        <div className="mb-4 rounded-btn border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <CalendarToolbar
        view={view}
        onViewChange={setView}
        heading={heading}
        onPrev={() => navArrow(-1)}
        onNext={() => navArrow(1)}
        onToday={goToday}
        filter={itemFilter}
        onFilterChange={setItemFilter}
        advancedOpen={advancedOpen}
        onToggleAdvanced={() => setAdvancedOpen((v) => !v)}
      />

      {advancedOpen && (
        <CalendarFilters value={advanced} onChange={setAdvanced} calendars={calendars} />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-4">
          {loading && <p className="mb-2 px-1 text-sm text-ink-subtle">Loading…</p>}

          {view === 'month' && (
            <MonthGrid
              focus={focus}
              selectedISO={selectedISO}
              filter={itemFilter}
              eventsByDate={eventsByDate}
              tasksByDate={tasksByDate}
              onSelectDay={selectDay}
              onEventClick={openEditEvent}
              onTaskClick={openTask}
              onToggleTask={toggleTask}
            />
          )}
          {view === 'week' && (
            <WeekView
              focus={focus}
              selectedISO={selectedISO}
              filter={itemFilter}
              eventsByDate={eventsByDate}
              tasksByDate={tasksByDate}
              onSelectDay={selectDay}
              onEventClick={openEditEvent}
              onTaskClick={openTask}
              onToggleTask={toggleTask}
            />
          )}
          {view === 'day' && (
            <DayView
              focus={focus}
              filter={itemFilter}
              eventsByDate={eventsByDate}
              tasksByDate={tasksByDate}
              onEventClick={openEditEvent}
              onTaskClick={openTask}
              onToggleTask={toggleTask}
            />
          )}
        </Card>

        <Card className="flex max-h-[calc(100vh-13rem)] flex-col p-5 lg:sticky lg:top-6">
          <DailyAgendaSidebar
            selectedISO={selectedISO}
            filter={itemFilter}
            eventsByDate={eventsByDate}
            tasksByDate={tasksByDate}
            onAddEvent={openNewEvent}
            onAddTask={(iso) => void addTaskOnDate(iso)}
            onEventClick={openEditEvent}
            onEventDelete={(e) => void deleteEvent(e.id)}
            onTaskClick={openTask}
            onTaskToggle={toggleTask}
            onTaskDelete={(t) => void deleteTask(t.id)}
            onSelectDay={selectDay}
          />
        </Card>
      </div>

      {dialogOpen && (
        <EventDialog event={editing} defaultDate={dialogDate} onClose={() => setDialogOpen(false)} />
      )}
      {/* Editing a task opens the existing slide-over in place. */}
      <TaskDrawer />
    </AppLayout>
  )
}
