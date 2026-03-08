import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/shared/Sidebar'
import { BottomNav } from '@/components/shared/BottomNav'

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar desktop */}
      <Sidebar />

      {/* Main content */}
      <main className="md:ml-56 pb-20 md:pb-0 min-h-screen">
        <Outlet />
      </main>

      {/* Bottom nav mobile */}
      <BottomNav />
    </div>
  )
}
