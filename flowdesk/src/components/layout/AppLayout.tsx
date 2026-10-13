import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export interface AppLayoutProps {
  title: string
  subtitle?: string
  /** When true, content fills the area with no padding/scroll (page manages its own). */
  flush?: boolean
  children: ReactNode
}

/** Shared application shell: sidebar + top bar + content. */
export function AppLayout({ title, subtitle, flush = false, children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} subtitle={subtitle} />
        {flush ? (
          <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
        ) : (
          <main className="flex-1 overflow-auto p-6">{children}</main>
        )}
      </div>
    </div>
  )
}
