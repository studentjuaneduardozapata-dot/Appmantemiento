import { NavLink } from 'react-router-dom'
import {
  Home,
  Wrench,
  AlertTriangle,
  ClipboardList,
  QrCode,
  Settings,
  RefreshCw,
  Leaf,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSyncContext } from '@/contexts/SyncContext'

// ── Dark nav palette (MD3 inverse-surface) ────────────────────────────────────
const D = {
  bg:          '#2F3229',
  border:      'rgba(240,243,234,0.09)',
  textMuted:   'rgba(240,243,234,0.55)',
  textActive:  '#F0F3EA',
  activePill:  '#ABED8D',   // md-primary-container
  activeIcon:  '#032100',   // md-on-primary-container
  hoverBg:     'rgba(240,243,234,0.07)',
  logoTint:    'rgba(171,237,141,0.15)',
  logoIcon:    '#ABED8D',
}

const NAV_ITEMS = [
  { label: 'Hoy',      path: '/',          icon: Home },
  { label: 'Activos',  path: '/assets',    icon: Wrench },
  { label: 'Fallas',   path: '/incidents', icon: AlertTriangle },
  { label: 'Historial', path: '/history',  icon: ClipboardList },
  { label: 'Escanear', path: '/scan',      icon: QrCode },
]

export function Sidebar() {
  const { isOnline, isSyncing, lastSync, triggerSync } = useSyncContext()

  return (
    <aside
      className="hidden md:flex flex-col w-20 h-screen fixed left-0 top-0 z-50"
      style={{ backgroundColor: D.bg, borderRight: `1px solid ${D.border}` }}
      aria-label="Navegación principal"
    >
      {/* Logo mark */}
      <div
        className="flex flex-col items-center py-5 gap-1.5"
        style={{ borderBottom: `1px solid ${D.border}` }}
      >
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: D.logoTint }}
        >
          <Leaf className="w-5 h-5" style={{ color: D.logoIcon }} aria-hidden="true" />
        </div>
        <span
          className="text-[9px] font-bold uppercase tracking-widest"
          style={{ color: D.textMuted, fontFamily: "'Barlow Semi Condensed', sans-serif" }}
        >
          GMAO
        </span>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 py-2 overflow-y-auto no-scrollbar" aria-label="Menú principal">
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            aria-label={label}
            style={{ touchAction: 'manipulation' }}
            className="flex flex-col items-center px-2 py-1 w-full
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          >
            {({ isActive }) => (
              <>
                {/* Indicator pill + icon */}
                <div className="relative flex items-center justify-center w-full h-8 mb-0.5">
                  {isActive && (
                    <span
                      className="absolute inset-x-1 inset-y-0 rounded-[28px]"
                      style={{ backgroundColor: D.activePill }}
                      aria-hidden="true"
                    />
                  )}
                  <Icon
                    className="w-[18px] h-[18px] relative z-10"
                    style={{ color: isActive ? D.activeIcon : D.textMuted }}
                    aria-hidden="true"
                  />
                </div>
                {/* Label */}
                <span
                  className="text-[10px] text-center leading-tight w-full"
                  style={{
                    fontFamily: "'Barlow Semi Condensed', sans-serif",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? D.textActive : D.textMuted,
                  }}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer — sync status + admin */}
      <div
        className="py-3 flex flex-col items-center gap-2"
        style={{ borderTop: `1px solid ${D.border}` }}
      >
        {/* Online indicator */}
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: isOnline ? '#4CAF50' : '#EF5350' }}
          title={isOnline ? 'En línea' : 'Sin conexión'}
          aria-label={isOnline ? 'Conectado' : 'Sin conexión'}
        />

        {/* Sync button */}
        <button
          onClick={triggerSync}
          disabled={isSyncing || !isOnline}
          className="p-2 rounded-xl disabled:opacity-30
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{ color: D.textMuted, touchAction: 'manipulation' }}
          aria-label={isSyncing ? 'Sincronizando…' : 'Sincronizar ahora'}
        >
          <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} aria-hidden="true" />
        </button>

        {lastSync && (
          <p
            className="text-[8px] text-center leading-tight px-1"
            style={{ color: D.textMuted, fontFamily: "'JetBrains Mono', monospace" }}
          >
            {lastSync.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}

        {/* Admin link */}
        <NavLink
          to="/admin"
          aria-label="Administración"
          style={{ touchAction: 'manipulation' }}
          className="p-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        >
          {({ isActive }) => (
            <Settings
              className="w-4 h-4"
              style={{ color: isActive ? D.activePill : D.textMuted }}
              aria-hidden="true"
            />
          )}
        </NavLink>
      </div>
    </aside>
  )
}
