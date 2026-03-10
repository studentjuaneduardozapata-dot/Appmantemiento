import { NavLink } from 'react-router-dom'
import {
  Home,
  Wrench,
  AlertTriangle,
  ClipboardList,
  BarChart2,
  QrCode,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Hoy', path: '/', icon: Home },
  { label: 'Activos', path: '/assets', icon: Wrench },
  { label: 'Fallas', path: '/incidents', icon: AlertTriangle },
  { label: 'Historial', path: '/history', icon: ClipboardList },
  { label: 'Resumen', path: '/summary', icon: BarChart2 },
  { label: 'QR', path: '/scan', icon: QrCode },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe md:hidden bg-sidebar border-t border-sidebar-border">
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs transition-colors',
                isActive ? 'text-primary' : 'text-nav-inactive'
              )
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] leading-tight">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
