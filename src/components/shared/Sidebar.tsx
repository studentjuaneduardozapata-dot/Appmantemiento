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
    <aside className="hidden md:flex flex-col w-56 h-screen fixed left-0 top-0 z-50"
      style={{ backgroundColor: 'var(--bg-header)', color: 'var(--text-header)' }}>
      {/* Logo / Header */}
      <div className="px-4 py-5" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        <div className="flex items-center gap-2">
          <Wrench className="w-6 h-6" style={{ color: 'var(--primary)' }} />
          <div>
            <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text-header)' }}>GMAO Planta</p>
            <p className="text-xs" style={{ color: '#71717a' }}>Mantenimiento Industrial</p>
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
                  ? 'text-primary-foreground'
                  : 'hover:bg-white/5'
              )
            }
            style={({ isActive }) =>
              isActive
                ? { backgroundColor: 'var(--primary)', color: 'var(--text-header)' }
                : { color: '#a1a1aa' }
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer: estado sync + admin */}
      <div className="px-3 py-3 space-y-2" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        {/* Sync status */}
        <div className="flex items-center justify-between text-xs" style={{ color: '#71717a' }}>
          <div className="flex items-center gap-1.5">
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
            ) : (
              <WifiOff className="w-3.5 h-3.5" style={{ color: 'var(--destructive)' }} />
            )}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
          <button
            onClick={triggerSync}
            disabled={isSyncing || !isOnline}
            className="hover:text-white disabled:opacity-40 transition-colors"
            title="Sincronizar ahora"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isSyncing && 'animate-spin')} />
          </button>
        </div>
        {lastSync && (
          <p className="text-[10px]" style={{ color: '#52525b' }}>
            Sync: {lastSync.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}

        {/* Admin */}
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors',
              isActive ? 'bg-white/10' : 'hover:bg-white/5'
            )
          }
          style={{ color: '#71717a' }}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Administración</span>
        </NavLink>
      </div>
    </aside>
  )
}
