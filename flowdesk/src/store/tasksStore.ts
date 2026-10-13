import { create } from 'zustand'
import { tasksApi, type Task, type TaskInput, type TaskStatus } from '@/api/tasksApi'

/** The single React state store for tasks. */
interface TasksState {
  tasks: Task[]
  selectedTaskId: number | null
  loading: boolean
  error: string | null

  fetchAll: () => Promise<void>
  selectTask: (id: number | null) => void
  createTask: (input: TaskInput) => Promise<Task | null>
  updateTask: (id: number, input: TaskInput) => Promise<Task | null>
  changeStatus: (id: number, status: TaskStatus) => Promise<void>
  deleteTask: (id: number) => Promise<void>

  selectedTask: () => Task | undefined
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  selectedTaskId: null,
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null })
    try {
      const tasks = await tasksApi.listTasks()
      set({ tasks, loading: false })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to load tasks' })
    }
  },

  selectTask: (id) => set({ selectedTaskId: id }),

  createTask: async (input) => {
    set({ error: null })
    try {
      const created = await tasksApi.createTask(input)
      set((state) => ({ tasks: [created, ...state.tasks] }))
      return created
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create task' })
      return null
    }
  },

  updateTask: async (id, input) => {
    set({ error: null })
    try {
      const updated = await tasksApi.updateTask(id, input)
      set((state) => ({ tasks: state.tasks.map((t) => (t.id === id ? updated : t)) }))
      return updated
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update task' })
      return null
    }
  },

  changeStatus: async (id, status) => {
    // Optimistic update so the drag feels instant; revert on failure.
    const prev = get().tasks
    set({
      tasks: prev.map((t) => (t.id === id ? { ...t, status } : t)),
      error: null,
    })
    try {
      const updated = await tasksApi.changeStatus(id, status)
      set((state) => ({ tasks: state.tasks.map((t) => (t.id === id ? updated : t)) }))
    } catch (err) {
      set({ tasks: prev, error: err instanceof Error ? err.message : 'Failed to move task' })
    }
  },

  deleteTask: async (id) => {
    set({ error: null })
    try {
      await tasksApi.deleteTask(id)
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
      }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete task' })
    }
  },

  selectedTask: () => {
    const { tasks, selectedTaskId } = get()
    return tasks.find((t) => t.id === selectedTaskId)
  },
}))
