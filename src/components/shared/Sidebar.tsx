import { NavLink } from 'react-router-dom'
import {
  Home,
  Wrench,
  CalendarDays,
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
  { label: 'Cronograma', path: '/schedule', icon: CalendarDays },
  { label: 'Fallas', path: '/incidents', icon: AlertTriangle },
  { label: 'Historial', path: '/history', icon: ClipboardList },
  { label: 'Resumen', path: '/summary', icon: BarChart2 },
  { label: 'Escanear QR', path: '/scan', icon: QrCode },
]

export function Sidebar() {
  const { isOnline, isSyncing, lastSync, triggerSync } = useSyncContext()

  return (
    <aside className="hidden md:flex flex-col w-56 h-screen fixed left-0 top-0 bg-gray-900 text-white z-50">
      {/* Logo / Header */}
      <div className="px-4 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Wrench className="w-6 h-6 text-blue-400" />
          <div>
            <p className="text-sm font-bold text-white leading-tight">GMAO Planta</p>
            <p className="text-xs text-gray-400">Mantenimiento Industrial</p>
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
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer: estado sync + admin */}
      <div className="px-3 py-3 border-t border-gray-700 space-y-2">
        {/* Sync status */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
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
          <p className="text-[10px] text-gray-500">
            Sync: {lastSync.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}

        {/* Admin */}
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors',
              isActive
                ? 'bg-gray-700 text-white'
                : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'
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
