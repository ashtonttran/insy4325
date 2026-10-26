import {
  CalendarCheck2,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  SlidersHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import type { CalendarView } from '@/store/eventsStore'

export type CalendarItemFilter = 'all' | 'events' | 'tasks'

/**
 * The calendar toolbar: view switcher, Today, prev/next navigation, the
 * month/year heading, the All/Events/Tasks segmented filter, and an advanced
 * Filter toggle. Purely presentational — all state lives in the page.
 */
export function CalendarToolbar({
  view,
  onViewChange,
  heading,
  onPrev,
  onNext,
  onToday,
  filter,
  onFilterChange,
  advancedOpen,
  onToggleAdvanced,
}: {
  view: CalendarView
  onViewChange: (v: CalendarView) => void
  heading: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  filter: CalendarItemFilter
  onFilterChange: (f: CalendarItemFilter) => void
  advancedOpen: boolean
  onToggleAdvanced: () => void
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <ViewSwitcher view={view} onChange={onViewChange} />
        <button
          onClick={onToday}
          className="inline-flex items-center gap-1.5 rounded-btn border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-canvas"
        >
          <CalendarCheck2 className="h-4 w-4" />
          Today
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            aria-label="Previous"
            className="rounded-btn border border-line p-1.5 text-ink-muted transition-colors hover:bg-canvas"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={onNext}
            aria-label="Next"
            className="rounded-btn border border-line p-1.5 text-ink-muted transition-colors hover:bg-canvas"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <h2 className="text-lg font-semibold text-ink">{heading}</h2>
      </div>

      <div className="flex items-center gap-2">
        <ItemFilter value={filter} onChange={onFilterChange} />
        <button
          onClick={onToggleAdvanced}
          aria-pressed={advancedOpen}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-btn border px-3 py-1.5 text-sm font-medium transition-colors',
            advancedOpen
              ? 'border-brand-200 bg-brand-50 text-brand-700'
              : 'border-line bg-white text-ink-muted hover:bg-canvas',
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter
        </button>
      </div>
    </div>
  )
}

function ViewSwitcher({
  view,
  onChange,
}: {
  view: CalendarView
  onChange: (v: CalendarView) => void
}) {
  const opts: CalendarView[] = ['month', 'week', 'day']
  return (
    <div className="flex rounded-btn border border-line bg-white p-0.5">
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            'rounded px-3 py-1 text-sm font-medium capitalize transition-colors',
            view === o ? 'bg-brand-500 text-white shadow-sm' : 'text-ink-muted hover:bg-canvas',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

const FILTERS: { value: CalendarItemFilter; label: string; icon: typeof LayoutGrid }[] = [
  { value: 'all', label: 'All', icon: LayoutGrid },
  { value: 'events', label: 'Events', icon: CalendarDays },
  { value: 'tasks', label: 'Tasks', icon: CheckSquare },
]

function ItemFilter({
  value,
  onChange,
}: {
  value: CalendarItemFilter
  onChange: (f: CalendarItemFilter) => void
}) {
  return (
    <div className="flex rounded-btn border border-line bg-white p-0.5">
      {FILTERS.map(({ value: v, label, icon: Icon }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={cn(
            'inline-flex items-center gap-1.5 rounded px-3 py-1 text-sm font-medium transition-colors',
            value === v ? 'bg-brand-50 text-brand-700' : 'text-ink-muted hover:bg-canvas',
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  )
}
