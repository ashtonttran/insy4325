/**
 * The single set of REST calls for tasks to the Spring Boot API.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'
export type TaskRecurrence =
  | 'NONE'
  | 'DAILY'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'YEARLY'
  | 'EVERY_N_DAYS'

export interface Subtask {
  id: number
  title: string
  done: boolean
}

export interface Task {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  recurrence: TaskRecurrence
  recurrenceInterval: number
  notebookId: number | null
  notebookName: string | null
  subtasks: Subtask[]
  createdAt: string
  updatedAt: string
}

/** Subtask shape when writing; id omitted for new items. */
export interface SubtaskInput {
  id?: number
  title: string
  done: boolean
}

/** Shape sent when creating or updating a task. */
export interface TaskInput {
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string | null
  recurrence?: TaskRecurrence
  recurrenceInterval?: number
  notebookId?: number | null
  subtasks?: SubtaskInput[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  if (!res.ok) {
    let message = `Request failed with ${res.status}`
    try {
      const body = await res.json()
      if (body?.message) message = body.message
    } catch {
      // no JSON body; keep default message
    }
    throw new Error(message)
  }

  if (res.status === 204) {
    return undefined as T
  }
  return res.json() as Promise<T>
}

export const tasksApi = {
  listTasks: () => request<Task[]>('/api/tasks'),
  getTask: (id: number) => request<Task>(`/api/tasks/${id}`),
  createTask: (input: TaskInput) =>
    request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(input) }),
  updateTask: (id: number, input: TaskInput) =>
    request<Task>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  changeStatus: (id: number, status: TaskStatus) =>
    request<Task>(`/api/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  deleteTask: (id: number) =>
    request<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
}
