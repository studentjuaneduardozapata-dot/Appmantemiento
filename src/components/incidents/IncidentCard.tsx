import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { Incident } from '@/lib/db'

const TYPE_LABELS: Record<string, string> = {
  mecanica: 'Mecánica',
  electrica: 'Eléctrica',
  neumatica: 'Neumática',
}

const TYPE_COLORS: Record<string, string> = {
  mecanica: 'bg-orange-100 text-orange-700',
  electrica: 'bg-yellow-100 text-yellow-700',
  neumatica: 'bg-blue-100 text-blue-700',
}

const STATUS_LABELS: Record<string, string> = {
  abierta: 'Abierta',
  en_progreso: 'En progreso',
  cerrada: 'Cerrada',
}

const STATUS_COLORS: Record<string, string> = {
  abierta: 'bg-red-100 text-red-700',
  en_progreso: 'bg-amber-100 text-amber-700',
  cerrada: 'bg-green-100 text-green-700',
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
      className="w-full text-left px-4 py-3 hover:bg-accent/60 border-b border-border last:border-0"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-medium text-sm text-foreground truncate flex-1">
          {assetName ?? '—'}
        </span>
        <span
          className={cn(
            'text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0',
            STATUS_COLORS[incident.status]
          )}
        >
          {STATUS_LABELS[incident.status]}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={cn(
            'text-xs px-2 py-0.5 rounded-full font-medium',
            TYPE_COLORS[incident.type]
          )}
        >
          {TYPE_LABELS[incident.type]}
        </span>
        {incident.description && (
          <span className="text-xs text-muted-foreground truncate max-w-[180px]">
            {incident.description}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {format(new Date(incident.reported_at + 'T00:00:00'), 'dd MMM yyyy', { locale: es })} ·{' '}
        {incident.reported_by}
      </p>
    </button>
  )
}
