import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Small rounded tag used for note labels and categories. */
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md bg-canvas px-2 py-0.5 text-xs font-medium text-ink-muted',
        className,
      )}
    >
      {children}
    </span>
  )
}

type DotColor = 'red' | 'orange' | 'green' | 'purple' | 'gray'

const dotColors: Record<DotColor, string> = {
  red: 'bg-accent-red',
  orange: 'bg-accent-orange',
  green: 'bg-accent-green',
  purple: 'bg-accent-purple',
  gray: 'bg-accent-gray',
}

/** Colored status dot used for task priority. */
export function Dot({ color }: { color: DotColor }) {
  return <span className={cn('h-2 w-2 shrink-0 rounded-full', dotColors[color])} />
}
