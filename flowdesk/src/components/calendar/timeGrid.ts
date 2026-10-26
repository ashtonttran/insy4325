import type { CSSProperties } from 'react'
import { timeToHours } from '@/lib/calendar'
import type { CalendarEvent } from '@/api/eventsApi'

/** Shared constants and geometry for the week/day time grids. */
export const DAY_START = 7 // 7 AM
export const DAY_END = 20 // 8 PM
export const HOUR_PX = 48

export const GRID_HEIGHT = (DAY_END - DAY_START + 1) * HOUR_PX

export function hoursRange(): number[] {
  return Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i)
}

/** Absolute top/height for a timed event within the grid. */
export function eventStyle(e: CalendarEvent): CSSProperties {
  const start = timeToHours(e.startTime)
  const end = e.endTime ? timeToHours(e.endTime) : start + 1
  const top = (Math.max(start, DAY_START) - DAY_START) * HOUR_PX
  const height = Math.max((end - Math.max(start, DAY_START)) * HOUR_PX, 22)
  return { top: `${top}px`, height: `${height}px` }
}
