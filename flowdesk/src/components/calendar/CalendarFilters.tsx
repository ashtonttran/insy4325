import { cn } from '@/lib/cn'
import type { Calendar } from '@/api/calendarsApi'
import type { TaskPriority } from '@/api/tasksApi'

export interface AdvancedFilters {
  completion: 'all' | 'complete' | 'incomplete'
  priority: 'all' | TaskPriority
  calendarId: 'all' | number
  overdueOnly: boolean
}

/**
 * Advanced filter panel revealed by the toolbar's Filter button. Refines the
 * calendar by task completion, priority, calendar category, and overdue state.
 * Event/task visibility itself is handled by the segmented All/Events/Tasks
 * control in the toolbar.
 */
export function CalendarFilters({
  value,
  onChange,
  calendars,
}: {
  value: AdvancedFilters
  onChange: (next: AdvancedFilters) => void
  calendars: Calendar[]
}) {
  const set = <K extends keyof AdvancedFilters>(key: K, v: AdvancedFilters[K]) =>
    onChange({ ...value, [key]: v })

  return (
    <div className="mb-6 flex flex-wrap items-end gap-4 rounded-card border border-line bg-white p-4">
      <Field label="Completion">
        <Select
          value={value.completion}
          onChange={(v) => set('completion', v as AdvancedFilters['completion'])}
          options={[
            { value: 'all', label: 'All' },
            { value: 'incomplete', label: 'Incomplete' },
            { value: 'complete', label: 'Completed' },
          ]}
        />
      </Field>

      <Field label="Priority">
        <Select
          value={value.priority}
          onChange={(v) => set('priority', v as AdvancedFilters['priority'])}
          options={[
            { value: 'all', label: 'All' },
            { value: 'HIGH', label: 'High' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'LOW', label: 'Low' },
          ]}
        />
      </Field>

      {calendars.length > 0 && (
        <Field label="Category">
          <Select
            value={String(value.calendarId)}
            onChange={(v) => set('calendarId', v === 'all' ? 'all' : Number(v))}
            options={[
              { value: 'all', label: 'All calendars' },
              ...calendars.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
          />
        </Field>
      )}

      <label className="flex items-center gap-2 pb-1 text-sm text-ink">
        <input
          type="checkbox"
          checked={value.overdueOnly}
          onChange={(e) => set('overdueOnly', e.target.checked)}
          className="h-4 w-4 rounded border-line text-brand-500 focus:ring-brand-400"
        />
        Overdue only
      </label>

      <button
        onClick={() =>
          onChange({ completion: 'all', priority: 'all', calendarId: 'all', overdueOnly: false })
        }
        className="ml-auto pb-1 text-sm font-medium text-ink-muted underline hover:text-ink"
      >
        Reset filters
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-ink-subtle">{label}</span>
      {children}
    </div>
  )
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'rounded-btn border border-line bg-white px-2.5 py-1.5 text-sm text-ink',
        'focus:outline-none focus:ring-2 focus:ring-brand-100',
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
