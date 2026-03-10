import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { format } from 'date-fns'
import { X } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { MaintenanceTask, MaintenancePlan } from '@/lib/db'
import { completeTask } from '@/hooks/useMaintenanceTasks'

interface CompleteTaskDialogProps {
  open: boolean
  onClose: () => void
  task: MaintenanceTask
  plan: MaintenancePlan
}

export function CompleteTaskDialog({
  open,
  onClose,
  task,
  plan,
}: CompleteTaskDialogProps) {
  const [completedBy, setCompletedBy] = useState('')
  const [completedAt, setCompletedAt] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const users = useLiveQuery(() => db.users.toArray())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!completedBy) return
    setSaving(true)
    try {
      await completeTask(task, plan, {
        completed_by: completedBy,
        completed_at: completedAt,
        notes: notes || undefined,
      })
      onClose()
      setCompletedBy('')
      setNotes('')
      setCompletedAt(format(new Date(), 'yyyy-MM-dd'))
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
              Completar tarea
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <p className="text-sm text-muted-foreground mb-4 bg-muted rounded-lg px-3 py-2">
            {task.description}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quién completó */}
            <div>
              <label className="gmao-label">
                Completado por <span className="text-destructive">*</span>
              </label>
              {users && users.length > 0 ? (
                <select
                  value={completedBy}
                  onChange={(e) => setCompletedBy(e.target.value)}
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
                  type="text"
                  value={completedBy}
                  onChange={(e) => setCompletedBy(e.target.value)}
                  required
                  placeholder="Nombre"
                  className="gmao-input"
                />
              )}
            </div>

            {/* Fecha */}
            <div>
              <label className="gmao-label">
                Fecha de ejecución
              </label>
              <input
                type="date"
                value={completedAt}
                onChange={(e) => setCompletedAt(e.target.value)}
                className="gmao-input"
              />
            </div>

            {/* Notas */}
            <div>
              <label className="gmao-label">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Observaciones..."
                className="gmao-input resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !completedBy}
              className="w-full py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Marcar como completada'}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
