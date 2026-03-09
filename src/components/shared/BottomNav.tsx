import { NavLink } from 'react-router-dom'
import {
  Home,
  Wrench,
  AlertTriangle,
  ClipboardList,
  BarChart2,
  QrCode,
} from 'lucide-react'

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
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe md:hidden"
      style={{ backgroundColor: '#18181b', borderTop: '1px solid #27272a' }}
    >
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs transition-colors"
            style={({ isActive }) =>
              isActive
                ? { color: '#6ab04c' }
                : { color: '#71717a' }
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
