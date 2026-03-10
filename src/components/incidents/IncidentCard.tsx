import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { Incident } from '@/lib/db'

const TYPE_LABELS: Record<string, string> = {
  mecanica: 'Mecánica',
  electrica: 'Eléctrica',
  neumatica: 'Neumática',
}

const TYPE_BADGE: Record<string, string> = {
  mecanica:  'gmao-badge gmao-badge-orange',
  electrica: 'gmao-badge gmao-badge-amber',
  neumatica: 'gmao-badge gmao-badge-blue',
}

const STATUS_LABELS: Record<string, string> = {
  abierta:    'Abierta',
  en_progreso: 'En progreso',
  cerrada:    'Cerrada',
}

const STATUS_BADGE: Record<string, string> = {
  abierta:    'gmao-badge gmao-badge-red',
  en_progreso: 'gmao-badge gmao-badge-amber',
  cerrada:    'gmao-badge gmao-badge-green',
}

const STATUS_STRIP: Record<string, string> = {
  abierta:    'strip-red',
  en_progreso: 'strip-amber',
  cerrada:    'strip-green',
}

interface IncidentCardProps {
  incident: Incident
  assetName?: string
  onClick?: () => void
}

export function IncidentCard({ incident, assetName, onClick }: IncidentCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3.5 hover:bg-accent/60 border-b border-border last:border-0 transition-colors bg-white',
        STATUS_STRIP[incident.status]
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="font-semibold text-sm text-foreground truncate flex-1">
          {assetName ?? '—'}
        </span>
        <span className={STATUS_BADGE[incident.status]}>
          {STATUS_LABELS[incident.status]}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={TYPE_BADGE[incident.type]}>
          {TYPE_LABELS[incident.type]}
        </span>
        {incident.description && (
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
            {incident.description}
          </span>
        )}
      </div>

      <p className="gmao-mono text-muted-foreground mt-1.5 text-[11px]">
        {format(new Date(incident.reported_at + 'T00:00:00'), 'dd MMM yyyy', { locale: es })}
        <span className="mx-1.5 opacity-40">·</span>
        {incident.reported_by}
      </p>
    </button>
  )
}
