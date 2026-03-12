import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Loader2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { closeIncident } from '@/hooks/useIncidents'

interface ResolveIncidentDialogProps {
  open: boolean
  onClose: () => void
  incidentId: string
  assetId: string
}

export function ResolveIncidentDialog({
  open,
  onClose,
  incidentId,
  assetId,
}: ResolveIncidentDialogProps) {
  const [resolvedBy, setResolvedBy] = useState('')
  const [resolutionTime, setResolutionTime] = useState('')
  const [notes, setNotes] = useState('')
  const [restoreAsset, setRestoreAsset] = useState(true)
  const [saving, setSaving] = useState(false)

  const users = useLiveQuery(() => db.users.filter((u) => !u.deleted_at).toArray())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!resolvedBy) return
    setSaving(true)
    try {
      await closeIncident(incidentId, {
        resolved_by: resolvedBy,
        resolution_time: resolutionTime,
        notes: notes || undefined,
        restore_asset: restoreAsset,
        asset_id: assetId,
      })
      onClose()
      setResolvedBy('')
      setResolutionTime('')
      setNotes('')
      setRestoreAsset(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed z-50 bg-card rounded-xl shadow-xl p-5 w-[calc(100%-2rem)] max-w-sm left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="font-semibold text-foreground">
              Cerrar falla
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" aria-label="Cerrar" className="p-1 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-md">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Responsable */}
            <div>
              <label htmlFor="rid-resolved-by" className="gmao-label">
                Responsable <span className="text-destructive">*</span>
              </label>
              {users && users.length > 0 ? (
                <select
                  id="rid-resolved-by"
                  value={resolvedBy}
                  onChange={(e) => setResolvedBy(e.target.value)}
                  required
                  className="gmao-select"
                >
                  <option value="">Seleccionar...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="rid-resolved-by"
                  type="text"
                  value={resolvedBy}
                  onChange={(e) => setResolvedBy(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Nombre del responsable"
                  className="gmao-input"
                />
              )}
            </div>

            {/* Tiempo de resolución */}
            <div>
              <label htmlFor="rid-resolution-time" className="gmao-label">Tiempo de resolución</label>
              <input
                id="rid-resolution-time"
                type="text"
                value={resolutionTime}
                onChange={(e) => setResolutionTime(e.target.value)}
                placeholder="Ej: 2 horas 30 minutos"
                className="gmao-input"
              />
            </div>

            {/* Notas */}
            <div>
              <label htmlFor="rid-notes" className="gmao-label">Notas (opcional)</label>
              <textarea
                id="rid-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Observaciones sobre la resolución..."
                className="gmao-input resize-none"
              />
            </div>

            {/* Restaurar estado activo */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={restoreAsset}
                onChange={(e) => setRestoreAsset(e.target.checked)}
                className="w-4 h-4 rounded accent-green-600"
              />
              <span className="text-sm text-foreground">Restaurar activo a operativo</span>
            </label>

            <button
              type="submit"
              disabled={saving || !resolvedBy}
              className="w-full py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />Guardando…</>
                : 'Cerrar falla'}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
