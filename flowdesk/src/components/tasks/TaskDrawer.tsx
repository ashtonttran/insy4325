import { useEffect, useState } from 'react'
import { Plus, Repeat, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { useTasksStore } from '@/store/tasksStore'
import type { SubtaskInput, TaskPriority, TaskRecurrence, TaskStatus } from '@/api/tasksApi'

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Done' },
]

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
]

const RECURRENCES: { value: TaskRecurrence; label: string }[] = [
  { value: 'NONE', label: 'Does not repeat' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Every 2 weeks' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'EVERY_N_DAYS', label: 'Every N days' },
]

/** Slide-over panel to view and edit a task and its subtasks. */
export function TaskDrawer() {
  const selectedTask = useTasksStore((s) => s.selectedTask)()
  const selectTask = useTasksStore((s) => s.selectTask)
  const updateTask = useTasksStore((s) => s.updateTask)
  const deleteTask = useTasksStore((s) => s.deleteTask)

  const open = Boolean(selectedTask)

  // Local draft state, re-seeded whenever the selected task changes.
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('TODO')
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM')
  const [dueDate, setDueDate] = useState('')
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('NONE')
  const [recurrenceInterval, setRecurrenceInterval] = useState(2)
  const [subtasks, setSubtasks] = useState<SubtaskInput[]>([])
  const [newSub, setNewSub] = useState('')

  useEffect(() => {
    if (!selectedTask) return
    setTitle(selectedTask.title)
    setDescription(selectedTask.description ?? '')
    setStatus(selectedTask.status)
    setPriority(selectedTask.priority)
    setDueDate(selectedTask.dueDate ?? '')
    setRecurrence(selectedTask.recurrence)
    setRecurrenceInterval(selectedTask.recurrenceInterval || 2)
    setSubtasks(selectedTask.subtasks.map((s) => ({ id: s.id, title: s.title, done: s.done })))
  }, [selectedTask])

  if (!open || !selectedTask) return null

  const close = () => selectTask(null)

  const save = async () => {
    await updateTask(selectedTask.id, {
      title,
      description,
      status,
      priority,
      dueDate: dueDate || null,
      recurrence,
      recurrenceInterval,
      notebookId: selectedTask.notebookId,
      subtasks,
    })
    close()
  }

  const toggleSub = (idx: number) =>
    setSubtasks((list) => list.map((s, i) => (i === idx ? { ...s, done: !s.done } : s)))

  const removeSub = (idx: number) =>
    setSubtasks((list) => list.filter((_, i) => i !== idx))

  const addSub = () => {
    const t = newSub.trim()
    if (!t) return
    setSubtasks((list) => [...list, { title: t, done: false }])
    setNewSub('')
  }

  const doneCount = subtasks.filter((s) => s.done).length

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/20"
        onClick={close}
        aria-hidden
      />

      {/* Panel */}
      <aside
        className="fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-white shadow-popover"
        role="dialog"
        aria-label="Task details"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            className="rounded-full bg-canvas px-3 py-1 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            onClick={close}
            aria-label="Close"
            className="rounded p-1 text-ink-subtle hover:bg-canvas hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 px-5 py-5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border-none p-0 text-lg font-bold text-ink focus:outline-none focus:ring-0"
            placeholder="Task title"
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Add a description…"
            className="w-full resize-none rounded-btn border border-line bg-canvas p-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
          />

          <div className="grid grid-cols-2 gap-3 rounded-btn border border-line p-3">
            <label className="text-xs font-medium text-ink-subtle">
              Priority
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="mt-1 block w-full rounded-btn border border-line bg-white px-2 py-1 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-ink-subtle">
              Due Date
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 block w-full rounded-btn border border-line bg-white px-2 py-1 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </label>
            {selectedTask.notebookName && (
              <div className="col-span-2 text-xs text-ink-subtle">
                Course: <span className="text-ink">{selectedTask.notebookName}</span>
              </div>
            )}
          </div>

          {/* Repeat */}
          <div className="rounded-btn border border-line p-3">
            <label className="flex items-center gap-1.5 text-xs font-medium text-ink-subtle">
              <Repeat className="h-3.5 w-3.5" /> Repeat
            </label>
            <div className="mt-1 flex items-center gap-2">
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as TaskRecurrence)}
                className="block w-full rounded-btn border border-line bg-white px-2 py-1 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                {RECURRENCES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {recurrence === 'EVERY_N_DAYS' && (
                <div className="flex shrink-0 items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 rounded-btn border border-line bg-white px-2 py-1 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                  <span className="text-xs text-ink-subtle">days</span>
                </div>
              )}
            </div>
            {recurrence !== 'NONE' && !dueDate && (
              <p className="mt-1.5 text-[11px] text-amber-600">
                Set a due date — repeating tasks advance from the due date when completed.
              </p>
            )}
            {recurrence !== 'NONE' && dueDate && (
              <p className="mt-1.5 text-[11px] text-ink-subtle">
                When marked done, this task moves to its next date instead of closing.
              </p>
            )}
          </div>

          {/* Subtasks */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                Subtasks
              </h4>
              {subtasks.length > 0 && (
                <span className="text-xs text-ink-subtle">
                  {doneCount}/{subtasks.length}
                </span>
              )}
            </div>
            <ul className="space-y-1.5">
              {subtasks.map((s, idx) => (
                <li key={s.id ?? `new-${idx}`} className="group flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={s.done}
                    onChange={() => toggleSub(idx)}
                    className="h-4 w-4 rounded border-line text-brand-500 focus:ring-brand-400"
                  />
                  <span
                    className={cn(
                      'flex-1 text-sm',
                      s.done ? 'text-ink-subtle line-through' : 'text-ink',
                    )}
                  >
                    {s.title}
                  </span>
                  <button
                    onClick={() => removeSub(idx)}
                    aria-label="Remove subtask"
                    className="rounded p-1 text-ink-subtle opacity-0 hover:bg-canvas hover:text-red-600 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addSub()
                  }
                }}
                placeholder="Add a subtask"
                className="h-8 flex-1 rounded-btn border border-line bg-canvas px-2 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <Button variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={addSub}>
                Add
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-line px-5 py-4">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={async () => {
              await deleteTask(selectedTask.id)
            }}
          >
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={close}>
              Cancel
            </Button>
            <Button size="sm" onClick={save}>
              Save Task
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
