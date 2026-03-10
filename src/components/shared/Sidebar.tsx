import { NavLink } from 'react-router-dom'
import {
  Home,
  Wrench,
  AlertTriangle,
  ClipboardList,
  BarChart2,
  QrCode,
  Settings,
  RefreshCw,
  Zap,
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
    <aside
      className="hidden md:flex flex-col w-56 h-screen fixed left-0 top-0 z-50 sidebar-grid"
      style={{ background: 'var(--bg-header)' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight font-display tracking-wide">
              GMAO
            </p>
            <p className="text-[10px] text-nav-inactive leading-tight tracking-widest uppercase mt-0.5">
              AGROINSUMOS S.A.S
            </p>
          </div>
        </div>
      </div>

      {/* Nav label */}
      <div className="px-5 pt-4 pb-1.5">
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-nav-inactive/50 font-display">
          Navegación
        </span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-2 py-0.5 space-y-0.5 overflow-y-auto thin-scrollbar">
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 pl-3 pr-4 py-2.5 text-sm transition-all relative rounded-md',
                isActive
                  ? 'text-white bg-white/[0.07]'
                  : 'text-nav-inactive hover:text-white hover:bg-white/[0.04]'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                )}
                <Icon
                  className={cn(
                    'w-4 h-4 flex-shrink-0 transition-colors',
                    isActive ? 'text-primary' : 'text-nav-inactive group-hover:text-white/80'
                  )}
                />
                <span className="font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-3 py-3 space-y-2">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full flex-shrink-0',
                isOnline ? 'bg-green-400 animate-pulse-dot' : 'bg-red-400'
              )}
            />
            <span className="text-[11px] text-nav-inactive">
              {isOnline ? 'En línea' : 'Sin conexión'}
            </span>
          </div>
          <button
            onClick={triggerSync}
            disabled={isSyncing || !isOnline}
            className="p-1 rounded text-nav-inactive hover:text-white disabled:opacity-30 transition-colors"
            title="Sincronizar ahora"
          >
            <RefreshCw className={cn('w-3 h-3', isSyncing && 'animate-spin')} />
          </button>
        </div>

        {lastSync && (
          <p className="gmao-mono text-[10px] text-nav-inactive/40 px-2">
            Sync {lastSync.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}

        <NavLink
          to="/admin"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 px-2 py-2 rounded-md text-xs transition-colors',
              isActive
                ? 'bg-white/10 text-white'
                : 'text-nav-inactive hover:text-white hover:bg-white/[0.04]'
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
