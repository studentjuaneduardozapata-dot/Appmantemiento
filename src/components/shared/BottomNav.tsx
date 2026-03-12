import { NavLink } from 'react-router-dom'
import {
  Home,
  Package,
  ClipboardList,
  AlertTriangle,
  QrCode,
  Settings,
} from 'lucide-react'

// ── Dark nav palette (mirrors Sidebar) ───────────────────────────────────────
const D = {
  bg:         '#2F3229',
  border:     'rgba(240,243,234,0.09)',
  textMuted:  'rgba(240,243,234,0.55)',
  textActive: '#F0F3EA',
  activePill: '#ABED8D',
  activeIcon: '#032100',
}

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
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe md:hidden"
      style={{ backgroundColor: D.bg, borderTop: `1px solid ${D.border}` }}
    >
      <div className="flex items-end justify-around h-16 px-1">
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            aria-label={label}
            style={{ touchAction: 'manipulation' }}
            className="relative flex flex-col items-center justify-end gap-0.5 flex-1 h-full pb-1.5
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          >
            {({ isActive }) => (
              <>
                {/* MD3 indicator pill behind icon */}
                <div className="relative flex items-center justify-center w-16 h-8 mb-0.5">
                  {isActive && (
                    <span
                      className="absolute inset-0 rounded-2xl"
                      style={{ backgroundColor: D.activePill }}
                      aria-hidden="true"
                    />
                  )}
                  <Icon
                    className="w-5 h-5 relative z-10"
                    style={{ color: isActive ? D.activeIcon : D.textMuted }}
                    aria-hidden="true"
                  />
                </div>
                {/* Label */}
                <span
                  className="text-[10px] leading-tight"
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

        {/* Admin — discrete */}
        <NavLink
          to="/admin"
          aria-label="Administración"
          style={{ touchAction: 'manipulation' }}
          className="relative flex flex-col items-center justify-end gap-0.5 px-2 h-full pb-1.5
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        >
          {({ isActive }) => (
            <>
              <div className="relative flex items-center justify-center w-10 h-8 mb-0.5">
                {isActive && (
                  <span
                    className="absolute inset-0 rounded-2xl"
                    style={{ backgroundColor: D.activePill }}
                    aria-hidden="true"
                  />
                )}
                <Settings
                  className="w-4 h-4 relative z-10"
                  style={{
                    color: isActive ? D.activeIcon : D.textMuted,
                    opacity: isActive ? 1 : 0.6,
                  }}
                  aria-hidden="true"
                />
              </div>
              <span
                className="text-[9px] leading-tight"
                style={{
                  fontFamily: "'Barlow Semi Condensed', sans-serif",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? D.textActive : D.textMuted,
                  opacity: isActive ? 1 : 0.6,
                }}
              >
                Admin
              </span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  )
}
