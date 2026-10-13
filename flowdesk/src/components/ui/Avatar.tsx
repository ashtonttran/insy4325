import { cn } from '@/lib/cn'

export interface AvatarProps {
  /** Image URL. If omitted/empty, a generic silhouette placeholder is shown. */
  src?: string
  /** Full name, used for alt text. */
  name: string
  size?: 'sm' | 'md'
  className?: string
}

/** Generic person silhouette (white on gray), matching the default avatar look. */
function PlaceholderAvatar({ dims, className, name }: { dims: string; className?: string; name: string }) {
  return (
    <span
      className={cn('inline-flex items-center justify-center overflow-hidden rounded-full bg-ink-subtle/40', dims, className)}
      role="img"
      aria-label={name}
    >
      <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
        <rect width="48" height="48" fill="#c3c7cf" />
        <circle cx="24" cy="19" r="9" fill="#ffffff" />
        <path d="M8 44c0-9 7.2-14 16-14s16 5 16 14z" fill="#ffffff" />
      </svg>
    </span>
  )
}

/** Circular user avatar; falls back to a silhouette placeholder when no image is set. */
export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const dims = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', dims, className)}
      />
    )
  }
  return <PlaceholderAvatar dims={dims} className={className} name={name} />
}
