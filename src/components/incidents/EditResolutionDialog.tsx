import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Loader2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { updateIncident } from '@/hooks/useIncidents'

interface EditResolutionDialogProps {
  open: boolean
  onClose: () => void
  incidentId: string
  initialResolvedBy: string
  initialResolutionTime: string
  initialNotes: string
}

export function EditResolutionDialog({
  open,
  onClose,
  incidentId,
  initialResolvedBy,
  initialResolutionTime,
  initialNotes,
}: EditResolutionDialogProps) {
  const [resolvedBy, setResolvedBy] = useState(initialResolvedBy)
  const [resolutionTime, setResolutionTime] = useState(initialResolutionTime)
  const [notes, setNotes] = useState(initialNotes)
  const [saving, setSaving] = useState(false)

  const users = useLiveQuery(() => db.users.filter((u) => !u.deleted_at).toArray())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!resolvedBy) return
    setSaving(true)
    try {
      await updateIncident(incidentId, {
        resolved_by: resolvedBy,
        resolution_time: resolutionTime || undefined,
        notes: notes || undefined,
      })
      onClose()
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
              Editar resolución
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Formulario para editar los datos de resolución de la falla cerrada.
            </Dialog.Description>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Cerrar"
                className="p-1 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-md"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Responsable */}
            <div>
              <label htmlFor="erid-resolved-by" className="gmao-label">
                Responsable <span className="text-destructive">*</span>
              </label>
              {users && users.length > 0 ? (
                <select
                  id="erid-resolved-by"
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
                  id="erid-resolved-by"
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
              <label htmlFor="erid-resolution-time" className="gmao-label">
                Tiempo de resolución
              </label>
              <input
                id="erid-resolution-time"
                type="text"
                value={resolutionTime}
                onChange={(e) => setResolutionTime(e.target.value)}
                placeholder="Ej: 2 horas 30 minutos"
                className="gmao-input"
              />
            </div>

            {/* Notas */}
            <div>
              <label htmlFor="erid-notes" className="gmao-label">Notas (opcional)</label>
              <textarea
                id="erid-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Observaciones sobre la resolución..."
                className="gmao-input resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !resolvedBy}
              className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-full disabled:opacity-50 flex items-center justify-center gap-1.5"
              style={{ touchAction: 'manipulation' }}
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />Guardando…</>
                : 'Guardar cambios'}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
