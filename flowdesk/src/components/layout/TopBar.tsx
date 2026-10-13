import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, CheckSquare, FileText, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { searchApi, type SearchResult } from '@/api/searchApi'
import { useNotesStore } from '@/store/notesStore'
import { useTasksStore } from '@/store/tasksStore'
import { useUiStore } from '@/store/uiStore'

export interface TopBarProps {
  title: string
  subtitle?: string
}

/** Top bar with page title, global search, and Quick Add. */
export function TopBar({ title, subtitle }: TopBarProps) {
  return (
    <header className="flex items-center justify-between border-b border-line bg-surface px-6 py-4">
      <div>
        <h1 className="text-lg font-bold text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <SearchBox />
        <QuickAdd />
      </div>
    </header>
  )
}

/** Quick Add dropdown: create a note, task, or event from anywhere. */
function QuickAdd() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const createNote = useNotesStore((s) => s.createNote)
  const createTask = useTasksStore((s) => s.createTask)
  const requestNewEvent = useUiStore((s) => s.requestNewEvent)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const newNote = async () => {
    setOpen(false)
    const created = await createNote({ title: 'Untitled Note', content: '', tag: null, notebookId: null })
    navigate('/notes')
    if (created) useNotesStore.getState().selectNote(created.id)
  }

  const newTask = async () => {
    setOpen(false)
    const created = await createTask({ title: 'New task', status: 'TODO', priority: 'MEDIUM', subtasks: [] })
    navigate('/tasks')
    if (created) useTasksStore.getState().selectTask(created.id)
  }

  const newEvent = () => {
    setOpen(false)
    requestNewEvent()
    navigate('/calendar')
  }

  const items = [
    { label: 'New Note', shortcut: 'N', icon: FileText, onClick: newNote },
    { label: 'New Task', shortcut: 'T', icon: CheckSquare, onClick: newTask },
    { label: 'New Event', shortcut: 'E', icon: Calendar, onClick: newEvent },
  ]

  return (
    <div ref={ref} className="relative">
      <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen((o) => !o)}>
        Quick Add
      </Button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-48 overflow-hidden rounded-card border border-line bg-white py-1 shadow-popover">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink hover:bg-canvas"
            >
              <span className="flex items-center gap-2.5">
                <item.icon className="h-4 w-4 text-ink-muted" />
                {item.label}
              </span>
              <kbd className="rounded border border-line bg-canvas px-1.5 text-[10px] text-ink-subtle">
                {item.shortcut}
              </kbd>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Debounced global search with a results dropdown. */
function SearchBox() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounce the query -> API call.
  useEffect(() => {
    const q = query.trim()
    if (q.length === 0) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    const handle = window.setTimeout(async () => {
      try {
        const hits = await searchApi.search(q)
        setResults(hits)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => window.clearTimeout(handle)
  }, [query])

  // Close the dropdown when clicking outside.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const goTo = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    navigate(result.type === 'task' ? '/tasks' : '/notes')
  }

  const showDropdown = open && query.trim().length > 0

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search workspace..."
        aria-label="Search workspace"
        className="h-9 w-64 rounded-btn border border-line bg-canvas pl-9 pr-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
      />

      {showDropdown && (
        <div className="absolute right-0 z-40 mt-2 w-96 overflow-hidden rounded-card border border-line bg-white shadow-popover">
          {loading ? (
            <p className="px-4 py-3 text-sm text-ink-subtle">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-subtle">
              No results for “{query.trim()}”
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto py-1">
              {results.map((r) => (
                <li key={`${r.type}-${r.id}`}>
                  <button
                    onClick={() => goTo(r)}
                    className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-canvas"
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-btn',
                        r.type === 'task'
                          ? 'bg-brand-50 text-brand-600'
                          : 'bg-canvas text-ink-muted',
                      )}
                    >
                      {r.type === 'task' ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-ink">{r.title}</span>
                        <span className="shrink-0 text-[10px] uppercase tracking-wide text-ink-subtle">
                          {r.type}
                        </span>
                      </span>
                      {r.snippet && (
                        <span className="line-clamp-1 text-xs text-ink-muted">{r.snippet}</span>
                      )}
                      {r.context && (
                        <span className="text-xs text-ink-subtle">{r.context}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
