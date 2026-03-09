import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { Incident, IncidentStatus } from '@/lib/db'
import { useObjectUrl } from '@/hooks/useObjectUrl'

const TYPE_LABELS: Record<string, string> = {
  mecanica: 'Mecánica',
  electrica: 'Eléctrica',
  neumatica: 'Neumática',
}

const STATUS_OPTIONS: { value: IncidentStatus; label: string }[] = [
  { value: 'abierta', label: 'Abierta' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'cerrada', label: 'Cerrada' },
]

const STATUS_COLORS: Record<string, string> = {
  abierta: 'bg-red-100 text-red-700',
  en_progreso: 'bg-amber-100 text-amber-700',
  cerrada: 'bg-green-100 text-green-700',
}

interface IncidentDetailProps {
  incident: Incident
  assetName?: string
  onStatusChange: (newStatus: IncidentStatus, resolutionTime?: string) => Promise<void>
}

export function IncidentDetail({
  incident,
  assetName,
  onStatusChange,
}: IncidentDetailProps) {
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus>(incident.status)
  const [resolutionTime, setResolutionTime] = useState(incident.resolution_time ?? '')
  const [saving, setSaving] = useState(false)
  const photoSrc = useObjectUrl(incident.photo_url)

  const statusChanged = selectedStatus !== incident.status

  async function handleSaveStatus() {
    setSaving(true)
    try {
      await onStatusChange(
        selectedStatus,
        selectedStatus === 'cerrada' ? resolutionTime : undefined
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 px-4 py-4">
      {/* Badge de tipo */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-700">
          {TYPE_LABELS[incident.type]}
        </span>
        <span
          className={cn(
            'text-xs px-2 py-1 rounded-full font-medium',
            STATUS_COLORS[incident.status]
          )}
        >
          {STATUS_OPTIONS.find((s) => s.value === incident.status)?.label}
        </span>
      </div>

      {/* Info */}
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
        <DetailRow label="Activo" value={assetName ?? '—'} />
        <DetailRow label="Reportado por" value={incident.reported_by} />
        <DetailRow
          label="Fecha"
          value={format(
            new Date(incident.reported_at + 'T00:00:00'),
            'dd MMM yyyy',
            { locale: es }
          )}
        />
        {incident.description && (
          <DetailRow label="Descripción" value={incident.description} />
        )}
        {incident.resolution_time && (
          <DetailRow label="Tiempo de resolución" value={incident.resolution_time} />
        )}
        {incident.closed_at && (
          <DetailRow
            label="Cerrada el"
            value={format(new Date(incident.closed_at), 'dd MMM yyyy HH:mm', {
              locale: es,
            })}
          />
        )}
      </div>

      {/* Foto */}
      {photoSrc && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <img
            src={photoSrc}
            alt="Evidencia"
            className="w-full max-h-48 object-cover"
          />
        </div>
      )}

      {/* Cambio de estado */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <p className="text-sm font-medium text-gray-700">Cambiar estado</p>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelectedStatus(opt.value)}
              className={cn(
                'flex-1 py-2 text-xs font-medium rounded-lg border transition-colors',
                selectedStatus === opt.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {selectedStatus === 'cerrada' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Tiempo de resolución (opcional)
            </label>
            <input
              type="text"
              value={resolutionTime}
              onChange={(e) => setResolutionTime(e.target.value)}
              placeholder="Ej: 2 horas 30 minutos"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {statusChanged && (
          <button
            type="button"
            onClick={handleSaveStatus}
            disabled={saving}
            className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar estado'}
          </button>
        )}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between px-4 py-2.5 gap-3">
      <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}
