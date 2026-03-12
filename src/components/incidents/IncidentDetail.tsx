import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { Incident, IncidentStatus } from '@/lib/db'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { ResolveIncidentDialog } from './ResolveIncidentDialog'

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
  onStatusChange: (newStatus: IncidentStatus) => Promise<void>
}

export function IncidentDetail({
  incident,
  assetName,
  onStatusChange,
}: IncidentDetailProps) {
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus>(incident.status)
  const [saving, setSaving] = useState(false)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [imgOpen, setImgOpen] = useState(false)
  const photoSrc = useObjectUrl(incident.photo_url)

  const statusChanged = selectedStatus !== incident.status

  async function handleSaveStatus() {
    if (selectedStatus === 'cerrada') {
      setResolveOpen(true)
      return
    }
    setSaving(true)
    try {
      await onStatusChange(selectedStatus)
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
      <div className="bg-card rounded-lg border border-border divide-y divide-border">
        <DetailRow label="Activo" value={assetName ?? '—'} />
        <DetailRow label="Reportado por" value={incident.reported_by} />
        <DetailRow
          label="Fecha"
          value={format(
            new Date(incident.reported_at),
            'dd MMM yyyy',
            { locale: es }
          )}
        />
        {incident.description && (
          <DetailRow label="Descripción" value={incident.description} />
        )}
        {incident.resolved_by && (
          <DetailRow label="Resuelto por" value={incident.resolved_by} />
        )}
        {incident.resolution_time && (
          <DetailRow label="Tiempo de resolución" value={incident.resolution_time} />
        )}
        {incident.notes && (
          <DetailRow label="Notas de resolución" value={incident.notes} />
        )}
        {incident.closed_at && !isNaN(new Date(incident.closed_at).getTime()) && (
          <DetailRow
            label="Cerrada el"
            value={format(new Date(incident.closed_at), 'dd MMM yyyy HH:mm', {
              locale: es,
            })}
          />
        )}
      </div>

      {/* Foto — clicable para lightbox */}
      {photoSrc && (
        <>
          <button
            type="button"
            onClick={() => setImgOpen(true)}
            aria-label="Ampliar imagen de evidencia"
            style={{ touchAction: 'manipulation' }}
            className="bg-card rounded-lg border border-border overflow-hidden w-full block focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <img
              src={photoSrc}
              alt="Evidencia"
              className="w-full max-h-48 object-cover"
            />
          </button>

          {imgOpen && (
            <div
              role="dialog"
              aria-label="Imagen de evidencia"
              aria-modal="true"
              tabIndex={-1}
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
              onClick={() => setImgOpen(false)}
              onKeyDown={(e) => e.key === 'Escape' && setImgOpen(false)}
            >
              <button
                type="button"
                onClick={() => setImgOpen(false)}
                aria-label="Cerrar imagen"
                style={{ touchAction: 'manipulation' }}
                className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                ✕
              </button>
              <img
                src={photoSrc}
                alt="Evidencia"
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </>
      )}

      {/* Cambio de estado */}
      {incident.status !== 'cerrada' && (
        <div className="bg-card rounded-lg border border-border p-4 space-y-3">
          <p className="gmao-section-title">Cambiar estado</p>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedStatus(opt.value)}
                className={cn(
                  'flex-1 py-2 text-xs font-medium rounded-lg border transition-colors',
                  selectedStatus === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-primary'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {statusChanged && (
            <button
              type="button"
              onClick={handleSaveStatus}
              disabled={saving}
              className="gmao-btn-primary py-2"
            >
              {saving ? 'Guardando...' : selectedStatus === 'cerrada' ? 'Cerrar falla...' : 'Guardar estado'}
            </button>
          )}
        </div>
      )}

      <ResolveIncidentDialog
        open={resolveOpen}
        onClose={() => {
          setResolveOpen(false)
          setSelectedStatus(incident.status)
        }}
        incidentId={incident.id}
        assetId={incident.asset_id}
      />
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between px-4 py-2.5 gap-3">
      <span className="text-sm text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  )
}
