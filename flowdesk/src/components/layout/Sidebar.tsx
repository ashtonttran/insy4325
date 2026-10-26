import { NavLink } from 'react-router-dom'
import { Activity, Calendar, CheckSquare, FileText, LayoutDashboard, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/cn'
import { useUserStore } from '@/store/userStore'
import { useUiStore } from '@/store/uiStore'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/notes', label: 'Notes', icon: FileText },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
]

/** The shared sidebar body: logo, nav links, and the account block. */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const profile = useUserStore((s) => s.profile)
  const fullName = useUserStore((s) => s.fullName)()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white">
          <Activity className="h-4 w-4" />
        </span>
        <span className="text-base font-bold text-ink">FlowDesk</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center justify-between rounded-btn px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-ink-muted hover:bg-canvas hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className="flex items-center gap-3">
                  <Icon className="h-[18px] w-[18px]" />
                  {label}
                </span>
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <NavLink
        to="/profile"
        onClick={onNavigate}
        className="flex items-center gap-3 border-t border-line px-4 py-4 hover:bg-canvas"
      >
        <Avatar src={profile.avatar} name={fullName} size="sm" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-ink">{fullName}</span>
          <span className="block truncate text-xs text-ink-subtle">{profile.email}</span>
        </span>
      </NavLink>
    </div>
  )
}

/**
 * Navigation rail. On large screens it's a fixed 240px rail; on small screens
 * it collapses into an off-canvas drawer toggled from the top bar.
 */
export function Sidebar() {
  const open = useUiStore((s) => s.mobileNavOpen)
  const close = useUiStore((s) => s.closeMobileNav)

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!open}
      >
        <div
          className={cn(
            'absolute inset-0 bg-black/30 transition-opacity',
            open ? 'opacity-100' : 'opacity-0',
          )}
          onClick={close}
        />
        <aside
          className={cn(
            'absolute left-0 top-0 h-full w-64 border-r border-line bg-surface shadow-popover transition-transform',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
          role="dialog"
          aria-label="Navigation"
        >
          <button
            onClick={close}
            aria-label="Close navigation"
            className="absolute right-2 top-3 rounded p-1.5 text-ink-subtle hover:bg-canvas hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
          <SidebarContent onNavigate={close} />
        </aside>
      </div>
    </>
  )
}
