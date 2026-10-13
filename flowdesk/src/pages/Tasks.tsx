import { useEffect } from 'react'
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

const priorityColor: Record<string, string> = {
  HIGH: 'bg-accent-red',
  MEDIUM: 'bg-accent-orange',
  LOW: 'bg-accent-green',
}

/** Tasks Workspace — a kanban board with drag-and-drop and a detail drawer. */
export function Tasks() {
  const { tasks, loading, error, fetchAll, changeStatus, selectTask, createTask } = useTasksStore()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

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
    <AppLayout title="Tasks Workspace" subtitle="Track tasks, sprints, and launch dependencies.">
      {error && (
        <div className="mb-4 rounded-btn border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-card border border-line bg-surface px-4 py-2 text-sm text-ink-muted shadow-card">
          Weekly Completion Rate:{' '}
          <span className="font-semibold text-ink">{completion}%</span>
          <span className="text-ink-subtle"> ({weeklyDone}/{tasks.length})</span>
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => (
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
            <p className="px-1 py-6 text-center text-xs text-ink-subtle">Nothing here</p>
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
          'cursor-grab rounded-btn border border-line bg-white p-3 shadow-card active:cursor-grabbing',
          isDragging && 'opacity-50',
        )}
      >
        <div className="mb-1.5 flex items-start gap-2">
          <span
            className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', priorityColor[task.priority])}
            title={`${task.priority} priority`}
          />
          <p className="text-sm font-medium text-ink">{task.title}</p>
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
