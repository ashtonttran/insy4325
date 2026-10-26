import { timeToHours } from '@/lib/calendar'
import type { CalendarEvent } from '@/api/eventsApi'
import type { Task } from '@/api/tasksApi'
import type { CalendarItemFilter } from './CalendarToolbar'
import { taskUrgency } from './calendarItems'

/** A single thing shown on a day — either an event or a task occurrence. */
export type DayItem =
  | { kind: 'event'; event: CalendarEvent }
  | { kind: 'task'; task: Task }

/**
 * Merge a day's events and tasks into one ordered list, honoring the
 * All/Events/Tasks filter. Ordering:
 *   1. Overdue / urgent unfinished tasks
 *   2. Scheduled events, by start time (timed before all-day)
 *   3. Remaining incomplete tasks
 *   4. Completed tasks
 */
export function orderDayItems(
  events: CalendarEvent[],
  tasks: Task[],
  onISO: string,
  filter: CalendarItemFilter,
): DayItem[] {
  const showEvents = filter === 'all' || filter === 'events'
  const showTasks = filter === 'all' || filter === 'tasks'

  const urgentTasks: Task[] = []
  const normalTasks: Task[] = []
  const doneTasks: Task[] = []

  if (showTasks) {
    for (const t of tasks) {
      if (t.status === 'DONE') doneTasks.push(t)
      else if (taskUrgency(t, onISO) === 'overdue') urgentTasks.push(t)
      else normalTasks.push(t)
    }
  }

  const sortedEvents = showEvents
    ? events
        .slice()
        .sort((a, b) => timeToHours(a.startTime) - timeToHours(b.startTime))
    : []

  const byPriority = (a: Task, b: Task) => priorityRank(b) - priorityRank(a)
  urgentTasks.sort(byPriority)
  normalTasks.sort(byPriority)

  return [
    ...urgentTasks.map((task): DayItem => ({ kind: 'task', task })),
    ...sortedEvents.map((event): DayItem => ({ kind: 'event', event })),
    ...normalTasks.map((task): DayItem => ({ kind: 'task', task })),
    ...doneTasks.map((task): DayItem => ({ kind: 'task', task })),
  ]
}

function priorityRank(t: Task): number {
  return t.priority === 'HIGH' ? 3 : t.priority === 'MEDIUM' ? 2 : 1
}
