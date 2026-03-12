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
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe bg-sidebar border-t border-sidebar-border md:hidden"
    >
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            aria-label={label}
            style={{ touchAction: 'manipulation' }}
            className={({ isActive }) =>
              cn(
                'relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                isActive ? 'text-white' : 'text-nav-inactive'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute top-0 left-0 right-0 h-[2px] bg-primary rounded-b" aria-hidden="true" />
                )}
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span className="text-[10px] leading-tight">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Botón discreto de administración */}
        <NavLink
          to="/admin"
          aria-label="Administración"
          style={{ touchAction: 'manipulation' }}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center gap-0.5 px-3 h-full',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
              isActive ? 'text-sidebar-foreground' : 'text-nav-inactive/50'
            )
          }
        >
          <Settings className="w-4 h-4" aria-hidden="true" />
          <span className="text-[9px] leading-tight">Admin</span>
        </NavLink>
      </div>
    </nav>
  )
}
