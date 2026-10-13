import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

/** White surface container with subtle border and shadow. */
export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-card border border-line bg-surface shadow-card', className)}
      {...props}
    >
      {children}
    </div>
  )
}

/** Card header row with a title and optional action on the right. */
export function CardHeader({
  title,
  action,
  className,
}: {
  title: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between px-5 pt-5', className)}>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {action}
    </div>
  )
}
