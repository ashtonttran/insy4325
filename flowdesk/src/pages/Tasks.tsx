import { useEffect, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Plus, Repeat } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { useTasksStore } from '@/store/tasksStore'
import type { Task, TaskStatus } from '@/api/tasksApi'
import { TaskDrawer } from '@/components/tasks/TaskDrawer'

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'TODO', label: 'To Do' },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'DONE', label: 'Done' },
]

type BoardFilter = 'all' | 'active' | 'completed'

const FILTERS: { value: BoardFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

/** Which board columns a filter shows. Active hides Done; Completed shows only Done. */
const VISIBLE_COLUMNS: Record<BoardFilter, TaskStatus[]> = {
  all: ['TODO', 'IN_PROGRESS', 'DONE'],
  active: ['TODO', 'IN_PROGRESS'],
  completed: ['DONE'],
}

const priorityColor: Record<string, string> = {
  HIGH: 'bg-accent-red',
  MEDIUM: 'bg-accent-orange',
  LOW: 'bg-accent-green',
}

/** Tasks Workspace — a kanban board with drag-and-drop and a detail drawer. */
export function Tasks() {
  const { tasks, loading, error, fetchAll, changeStatus, selectTask, createTask } = useTasksStore()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const [filter, setFilter] = useState<BoardFilter>('all')

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  const visibleColumns = COLUMNS.filter((c) => VISIBLE_COLUMNS[filter].includes(c.status))

  const handleDragEnd = (event: DragEndEvent) => {
    const taskId = Number(event.active.id)
    const newStatus = event.over?.id as TaskStatus | undefined
    if (!newStatus) return
    const task = tasks.find((t) => t.id === taskId)
    if (task && task.status !== newStatus) {
      void changeStatus(taskId, newStatus)
    }
  }

  const weeklyDone = tasks.filter((t) => t.status === 'DONE').length
  const completion = tasks.length ? Math.round((weeklyDone / tasks.length) * 100) : 0

  return (
    <AppLayout title="Tasks" subtitle="Organize your assignments and track progress.">
      {error && (
        <div className="mb-4 rounded-btn border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* All / Active / Completed segmented filter */}
          <div className="flex rounded-btn border border-line bg-white p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                aria-pressed={filter === f.value}
                className={cn(
                  'rounded px-3 py-1 text-sm font-medium transition-colors',
                  filter === f.value
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-muted hover:bg-canvas',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="hidden rounded-card border border-line bg-surface px-4 py-2 text-sm text-ink-muted shadow-card sm:block">
            Completed:{' '}
            <span className="font-semibold text-ink">{completion}%</span>
            <span className="text-ink-subtle"> ({weeklyDone}/{tasks.length})</span>
          </div>
        </div>
        <Button
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={async () => {
            const created = await createTask({
              title: 'New task',
              status: 'TODO',
              priority: 'MEDIUM',
              subtasks: [],
            })
            if (created) selectTask(created.id)
          }}
        >
          New Task
        </Button>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div
          className={cn(
            'grid grid-cols-1 gap-4',
            visibleColumns.length === 3 && 'md:grid-cols-3',
            visibleColumns.length === 2 && 'md:grid-cols-2',
          )}
        >
          {visibleColumns.map((col) => (
            <Column
              key={col.status}
              status={col.status}
              label={col.label}
              tasks={tasks.filter((t) => t.status === col.status)}
              loading={loading}
              onOpen={(id) => selectTask(id)}
            />
          ))}
        </div>
      </DndContext>

      <TaskDrawer />
    </AppLayout>
  )

  function Column({
    status,
    label,
    tasks,
    loading,
    onOpen,
  }: {
    status: TaskStatus
    label: string
    tasks: Task[]
    loading: boolean
    onOpen: (id: number) => void
  }) {
    const { setNodeRef, isOver } = useDroppable({ id: status })
    return (
      <div
        ref={setNodeRef}
        className={cn(
          'rounded-card border border-line bg-canvas/60 p-3 transition-colors',
          isOver && 'bg-brand-50 ring-2 ring-brand-200',
        )}
      >
        <div className="mb-3 flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-ink">{label}</h3>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs text-ink-subtle">
            {tasks.length}
          </span>
        </div>
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onOpen} />
          ))}
          {!loading && tasks.length === 0 && (
            <p className="px-1 py-6 text-center text-xs text-ink-subtle">No tasks</p>
          )}
        </div>
      </div>
    )
  }

  function TaskCard({ task, onOpen }: { task: Task; onOpen: (id: number) => void }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: task.id,
    })
    const doneSubs = task.subtasks.filter((s) => s.done).length
    const done = task.status === 'DONE'
    const style = transform
      ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
      : undefined

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onClick={() => onOpen(task.id)}
        className={cn(
          'cursor-grab rounded-btn border border-line bg-white p-3 shadow-card transition-colors hover:border-brand-200 active:cursor-grabbing',
          isDragging && 'opacity-50',
          done && 'bg-canvas',
        )}
      >
        <div className="mb-1.5 flex items-start gap-2">
          <span
            className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', priorityColor[task.priority])}
            title={`${task.priority} priority`}
          />
          <p className={cn('text-sm font-medium text-ink', done && 'text-ink-subtle line-through')}>
            {task.title}
          </p>
        </div>
        <div className="flex items-center gap-3 pl-4 text-xs text-ink-subtle">
          {task.notebookName && <span>{task.notebookName}</span>}
          {task.subtasks.length > 0 && (
            <span>
              {doneSubs}/{task.subtasks.length} subtasks
            </span>
          )}
          {task.dueDate && <span>Due {task.dueDate}</span>}
          {task.recurrence !== 'NONE' && (
            <span className="inline-flex items-center gap-0.5 text-brand-600" title="Repeats">
              <Repeat className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>
    )
  }
}
