import { useEffect } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, CalendarDays, Check, FileText, Send } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Dot } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/time'
import { addDays, formatTime, todayInCentral, toISO } from '@/lib/calendar'
import { useNotesStore } from '@/store/notesStore'
import { useTasksStore } from '@/store/tasksStore'
import { useEventsStore } from '@/store/eventsStore'
import { useUserStore } from '@/store/userStore'
import type { TaskPriority } from '@/api/tasksApi'

const agendaTone: Record<string, string> = {
  purple: 'border-brand-200 bg-brand-50',
  amber: 'border-amber-200 bg-amber-50',
  green: 'border-emerald-200 bg-emerald-50',
  red: 'border-red-200 bg-red-50',
}

const priorityDot: Record<TaskPriority, 'red' | 'orange' | 'green'> = {
  HIGH: 'red',
  MEDIUM: 'orange',
  LOW: 'green',
}

/** A time-of-day greeting, e.g. "Good morning". */
function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/** Dashboard — the primary landing screen. */
export function Dashboard() {
  const navigate = useNavigate()

  const notes = useNotesStore((s) => s.notes)
  const notesLoading = useNotesStore((s) => s.loading)
  const fetchNotes = useNotesStore((s) => s.fetchAll)

  const tasks = useTasksStore((s) => s.tasks)
  const fetchTasks = useTasksStore((s) => s.fetchAll)
  const changeStatus = useTasksStore((s) => s.changeStatus)
  const selectTask = useTasksStore((s) => s.selectTask)

  const events = useEventsStore((s) => s.events)
  const fetchEvents = useEventsStore((s) => s.fetchAll)

  const firstName = useUserStore((s) => s.profile.firstName)

  useEffect(() => {
    void fetchNotes()
    void fetchTasks()
    void fetchEvents()
  }, [fetchNotes, fetchTasks, fetchEvents])

  const recent = notes.slice(0, 4)

  // Today's Tasks: open (not done) tasks, soonest due first, undated last.
  const openTasks = tasks
    .filter((t) => t.status !== 'DONE')
    .slice()
    .sort((a, b) => {
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    })
    .slice(0, 6)

  // Agenda: events from the nearest day (today or next upcoming) that has events.
  const todayISO = todayInCentral()
  const upcomingDates = Array.from(new Set(events.map((e) => e.date)))
    .filter((d) => d >= todayISO)
    .sort()
  const agendaDate = upcomingDates[0] ?? null
  const agendaEvents = agendaDate
    ? events
        .filter((e) => e.date === agendaDate)
        .slice()
        .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
    : []

  // Stat counts.
  const openCount = tasks.filter((t) => t.status !== 'DONE').length
  const eventsTodayCount = events.filter((e) => e.date === todayISO).length

  // This week's completion: of tasks due in the current week (Sun–Sat), how
  // many are done. Derived from real data; omitted when there are none.
  const weekStart = toISO(addDays(new Date(), -new Date().getDay()))
  const weekEnd = toISO(addDays(new Date(), 6 - new Date().getDay()))
  const weekTasks = tasks.filter(
    (t) => t.dueDate != null && t.dueDate >= weekStart && t.dueDate <= weekEnd,
  )
  const weekDone = weekTasks.filter((t) => t.status === 'DONE').length
  const weekPct = weekTasks.length > 0 ? Math.round((weekDone / weekTasks.length) * 100) : null

  const stats = [
    { label: 'Tasks due soon', value: String(openCount), hint: openCount === 1 ? 'open task' : 'open tasks' },
    { label: 'Events today', value: String(eventsTodayCount), hint: eventsTodayCount === 1 ? 'on your schedule' : 'on your schedule' },
    // Only show weekly progress when there's something to measure.
    ...(weekPct !== null
      ? [{ label: 'This week', value: `${weekPct}%`, hint: `${weekDone}/${weekTasks.length} done` }]
      : []),
  ]

  const isOverdue = (dueDate: string | null) => dueDate != null && dueDate < todayISO
  const isDueToday = (dueDate: string | null) => dueDate === todayISO

  return (
    <AppLayout title="Dashboard" subtitle="Here's your overview for today.">
      {/* Welcome */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-ink">
          {greeting()}
          {firstName ? `, ${firstName}` : ''}!
        </h2>
        <p className="mt-0.5 text-sm text-ink-muted">Here's what's on your plate today.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
              {stat.label}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-ink">{stat.value}</span>
              <span className="text-sm text-ink-subtle">{stat.hint}</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Today's Tasks"
              action={
                <Link to="/tasks" className="text-sm font-medium text-brand-600 hover:underline">
                  View all
                </Link>
              }
            />
            <ul className="mt-3 divide-y divide-line">
              {openTasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 px-5 py-2.5">
                  <input
                    type="checkbox"
                    aria-label={`Mark "${task.title}" done`}
                    onChange={() => void changeStatus(task.id, 'DONE')}
                    className="h-4 w-4 shrink-0 rounded border-line text-brand-500 focus:ring-brand-400"
                  />
                  <Dot color={priorityDot[task.priority]} />
                  <button
                    onClick={() => {
                      selectTask(task.id)
                      navigate('/tasks')
                    }}
                    className="flex-1 truncate text-left text-sm text-ink hover:text-brand-700"
                  >
                    {task.title}
                  </button>
                  {isOverdue(task.dueDate) ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                      <AlertCircle className="h-3 w-3" /> Overdue
                    </span>
                  ) : isDueToday(task.dueDate) ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Due today
                    </span>
                  ) : (
                    task.dueDate && (
                      <span className="shrink-0 text-xs text-ink-subtle">Due {task.dueDate}</span>
                    )
                  )}
                </li>
              ))}
            </ul>
            {openTasks.length === 0 && (
              <EmptyState
                icon={Check}
                title="You're all caught up!"
                description="No open tasks right now."
                className="py-8"
              />
            )}
            <div className="pb-2" />
          </Card>

          <Card>
            <CardHeader
              title="Recent Notes"
              action={
                <Link to="/notes" className="text-sm font-medium text-brand-600 hover:underline">
                  View library
                </Link>
              }
            />
            <ul className="mt-3 divide-y divide-line">
              {recent.map((note) => (
                <li key={note.id} className="flex items-center justify-between px-5 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {note.title}
                    </span>
                    <span className="block text-xs text-ink-subtle">
                      {note.notebookName ?? 'Unfiled'}
                    </span>
                  </span>
                  <span className="shrink-0 pl-3 text-xs text-ink-subtle">
                    {timeAgo(note.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
            {recent.length === 0 &&
              (notesLoading ? (
                <p className="px-5 py-6 text-center text-sm text-ink-subtle">Loading notes…</p>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="No notes yet"
                  description="Capture a quick thought below to get started."
                  className="py-8"
                />
              ))}
            <div className="pb-2" />
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title={
                agendaDate && agendaDate !== todayISO
                  ? `Agenda · ${agendaDate}`
                  : "Today's Agenda"
              }
              action={
                <Link
                  to="/calendar"
                  className="text-sm font-medium text-brand-600 hover:underline"
                >
                  Open calendar
                </Link>
              }
            />
            <div className="space-y-3 p-5 pt-4">
              {agendaEvents.map((ev) => {
                const passed =
                  agendaDate === todayISO &&
                  ev.endTime != null &&
                  (ev.endTime.slice(0, 5)) < new Date().toTimeString().slice(0, 5)
                return (
                  <button
                    key={ev.id}
                    onClick={() => navigate('/calendar')}
                    className={cn(
                      'block w-full rounded-btn border px-4 py-3 text-left transition-opacity hover:shadow-card',
                      agendaTone[ev.tone] ?? agendaTone.purple,
                      passed && 'opacity-50',
                    )}
                  >
                    <p className="text-xs text-ink-muted">
                      {ev.startTime ? formatTime(ev.startTime) : 'All day'}
                      {ev.endTime ? ` – ${formatTime(ev.endTime)}` : ''}
                      {passed && ' · passed'}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-ink">{ev.title}</p>
                    {ev.location && <p className="text-xs text-ink-subtle">{ev.location}</p>}
                  </button>
                )
              })}
              {agendaEvents.length === 0 && (
                <EmptyState
                  icon={CalendarDays}
                  title="Nothing scheduled"
                  description="No upcoming events."
                  className="py-6"
                />
              )}
            </div>
          </Card>

          <QuickCapture />
        </div>
      </div>
    </AppLayout>
  )
}

/** Turns a quick thought into a real note via the notes store. */
function QuickCapture() {
  const createNote = useNotesStore((s) => s.createNote)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  const capture = async () => {
    const trimmed = text.trim()
    if (!trimmed || saving) return

    // First line becomes the title; the remainder becomes the body.
    const [firstLine, ...rest] = trimmed.split('\n')
    const title = firstLine.trim().slice(0, 120) || 'Quick note'
    const content = rest.join('\n').trim()

    setSaving(true)
    const created = await createNote({ title, content, tag: null, notebookId: null })
    setSaving(false)

    if (created) {
      setText('')
      setJustSaved(true)
      window.setTimeout(() => setJustSaved(false), 2000)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter saves; Shift+Enter inserts a newline.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void capture()
    }
  }

  return (
    <Card>
      <CardHeader title="Quick Capture" />
      <div className="p-5 pt-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          placeholder="Type a quick thought, task, or brain dump... (Press Enter to save)"
          className="w-full resize-none rounded-btn border border-line bg-canvas p-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-ink-subtle">
            {justSaved ? (
              <span className="inline-flex items-center gap-1 text-accent-green">
                <Check className="h-3.5 w-3.5" /> Saved to Notes
              </span>
            ) : (
              'Shift + Enter for a new line'
            )}
          </span>
          <Button
            variant="dark"
            size="sm"
            leftIcon={<Send className="h-3.5 w-3.5" />}
            onClick={capture}
            disabled={saving || text.trim().length === 0}
          >
            {saving ? 'Saving…' : 'Capture'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
