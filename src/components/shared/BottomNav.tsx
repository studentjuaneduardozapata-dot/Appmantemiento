import { NavLink } from 'react-router-dom'
import {
  Home,
  Package,
  ClipboardList,
  AlertTriangle,
  QrCode,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Hoy',      path: '/',          icon: Home },
  { label: 'Activos',  path: '/assets',    icon: Package },
  { label: 'Fallas',   path: '/incidents', icon: AlertTriangle },
  { label: 'Historial', path: '/history',  icon: ClipboardList },
  { label: 'Escanear', path: '/scan',      icon: QrCode },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe bg-zinc-900 border-t border-zinc-800">
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs transition-colors',
                isActive ? 'text-white' : 'text-zinc-400'
              )
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] leading-tight">{label}</span>
          </NavLink>
        ))}

        {/* Botón discreto de administración */}
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center gap-0.5 px-3 h-full transition-colors',
              isActive ? 'text-zinc-300' : 'text-zinc-600'
            )
          }
        >
          <Settings className="w-4 h-4" />
          <span className="text-[9px] leading-tight">Admin</span>
        </NavLink>
      </div>
    </nav>
  )
}
