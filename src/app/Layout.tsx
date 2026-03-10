import { Outlet } from 'react-router-dom'
import { BottomNav } from '@/components/shared/BottomNav'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

export function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Main content */}
      <main className="flex-1 pb-16 min-h-screen">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Bottom nav */}
      <BottomNav />
    </div>
  )
}
