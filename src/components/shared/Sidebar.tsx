import { NavLink } from 'react-router-dom'
import {
  Home,
  Wrench,
  AlertTriangle,
  ClipboardList,
  BarChart2,
  QrCode,
  Settings,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSyncContext } from '@/contexts/SyncContext'

const NAV_ITEMS = [
  { label: 'Hoy', path: '/', icon: Home },
  { label: 'Activos', path: '/assets', icon: Wrench },
  { label: 'Fallas', path: '/incidents', icon: AlertTriangle },
  { label: 'Historial', path: '/history', icon: ClipboardList },
  { label: 'Resumen', path: '/summary', icon: BarChart2 },
  { label: 'Escanear QR', path: '/scan', icon: QrCode },
]

export function Sidebar() {
  const { isOnline, isSyncing, lastSync, triggerSync } = useSyncContext()

  return (
    <aside className="hidden md:flex flex-col w-56 h-screen fixed left-0 top-0 z-50 bg-sidebar text-sidebar-foreground">
      {/* Logo / Header */}
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Wrench className="w-6 h-6 text-primary" />
          <div>
            <p className="text-sm font-bold leading-tight text-sidebar-foreground">GMAO Planta</p>
            <p className="text-xs text-nav-inactive">Mantenimiento Industrial</p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-nav-inactive hover:bg-white/5'
              )
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer: estado sync + admin */}
      <div className="px-3 py-3 space-y-2 border-t border-sidebar-border">
        {/* Sync status */}
        <div className="flex items-center justify-between text-xs text-nav-inactive">
          <div className="flex items-center gap-1.5">
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-primary" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-destructive" />
            )}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
          <button
            onClick={triggerSync}
            disabled={isSyncing || !isOnline}
            className="hover:text-sidebar-foreground disabled:opacity-40 transition-colors"
            title="Sincronizar ahora"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isSyncing && 'animate-spin')} />
          </button>
        </div>
        {lastSync && (
          <p className="text-[10px] text-muted-foreground">
            Sync: {lastSync.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}

        {/* Admin */}
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors text-nav-inactive',
              isActive ? 'bg-white/10' : 'hover:bg-white/5'
            )
          }
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Administración</span>
        </NavLink>
      </div>
    </aside>
  )
}
