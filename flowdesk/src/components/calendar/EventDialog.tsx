import { useEffect, useState } from 'react'
import { Repeat, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useEventsStore } from '@/store/eventsStore'
import type { CalendarEvent, EventInput, EventRecurrence, EventTone } from '@/api/eventsApi'

const TONES: { value: EventTone; label: string; swatch: string }[] = [
  { value: 'purple', label: 'Purple', swatch: 'bg-brand-500' },
  { value: 'amber', label: 'Amber', swatch: 'bg-amber-400' },
  { value: 'green', label: 'Green', swatch: 'bg-emerald-500' },
  { value: 'red', label: 'Red', swatch: 'bg-red-500' },
]

const RECURRENCES: { value: EventRecurrence; label: string }[] = [
  { value: 'NONE', label: 'Does not repeat' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Every 2 weeks' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'EVERY_N_DAYS', label: 'Every N days' },
]

export interface EventDialogProps {
  /** Existing event to edit, or null to create. */
  event: CalendarEvent | null
  /** Default date (ISO) when creating. */
  defaultDate: string
  onClose: () => void
}

/** Modal for creating or editing a calendar event. */
export function EventDialog({ event, defaultDate, onClose }: EventDialogProps) {
  const createEvent = useEventsStore((s) => s.createEvent)
  const updateEvent = useEventsStore((s) => s.updateEvent)
  const deleteEvent = useEventsStore((s) => s.deleteEvent)

  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [tone, setTone] = useState<EventTone>('purple')
  const [recurrence, setRecurrence] = useState<EventRecurrence>('NONE')
  const [recurrenceInterval, setRecurrenceInterval] = useState(2)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setLocation(event.location ?? '')
      setDate(event.date)
      setStartTime(event.startTime ? event.startTime.slice(0, 5) : '')
      setEndTime(event.endTime ? event.endTime.slice(0, 5) : '')
      setTone(event.tone)
      setRecurrence(event.recurrence)
      setRecurrenceInterval(event.recurrenceInterval || 2)
    } else {
      setDate(defaultDate)
    }
  }, [event, defaultDate])

  const save = async () => {
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    if (!date) {
      setError('Date is required.')
      return
    }
    const input: EventInput = {
      title: title.trim(),
      location: location.trim() || null,
      date,
      startTime: startTime || null,
      endTime: endTime || null,
      tone,
      recurrence,
      recurrenceInterval,
      notebookId: event?.notebookId ?? null,
    }
    const result = event ? await updateEvent(event.id, input) : await createEvent(input)
    if (result) onClose()
    else setError('Could not save the event.')
  }

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} aria-hidden />
      <div
        className="fixed left-1/2 top-1/2 z-40 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card border border-line bg-white p-5 shadow-popover"
        role="dialog"
        aria-label={event ? 'Edit event' : 'New event'}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">{event ? 'Edit Event' : 'New Event'}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-ink-subtle hover:bg-canvas hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-btn border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            className="w-full rounded-btn border border-line bg-white px-3 py-2 text-sm font-medium text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (optional)"
            className="w-full rounded-btn border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-subtle">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-btn border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-subtle">Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-btn border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-subtle">End</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-btn border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-subtle">Color</label>
            <div className="flex gap-2">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  aria-label={t.label}
                  className={`h-7 w-7 rounded-full ${t.swatch} ${
                    tone === t.value ? 'ring-2 ring-offset-2 ring-ink' : ''
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ink-subtle">
              <Repeat className="h-3.5 w-3.5" /> Repeat
            </label>
            <div className="flex items-center gap-2">
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as EventRecurrence)}
                className="block w-full rounded-btn border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
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
                    className="w-16 rounded-btn border border-line bg-white px-2 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                  <span className="text-xs text-ink-subtle">days</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
          {event ? (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={async () => {
                await deleteEvent(event.id)
                onClose()
              }}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={save}>
              {event ? 'Save' : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
