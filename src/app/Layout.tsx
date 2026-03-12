import { Outlet } from 'react-router-dom'
import { BottomNav } from '@/components/shared/BottomNav'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

export function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Skip link for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md focus:text-sm focus:font-semibold"
      >
        Saltar al contenido
      </a>

      {/* Main content — md:ml-56 offsets the fixed sidebar on desktop */}
      <main id="main-content" className="flex-1 pb-16 md:pb-0 md:ml-56 min-h-screen">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Bottom nav (mobile only) */}
      <BottomNav />
    </div>
  )
}
