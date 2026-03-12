import { useState } from 'react'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { MaintenanceTask, MaintenancePlan } from '@/lib/db'
import { completeTask } from '@/hooks/useMaintenanceTasks'
import { useStepsByTask } from '@/hooks/useMaintenanceSteps'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetCloseButton,
  SheetBody,
  SheetFooter,
} from '@/components/ui/sheet'

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
  const [checkedStepIds, setCheckedStepIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const users = useLiveQuery(() => db.users.toArray())
  const steps = useStepsByTask(task.id)

  function toggleStep(id: string) {
    setCheckedStepIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!completedBy) return
    setSaving(true)
    try {
      await completeTask(task, plan, {
        completed_by: completedBy,
        completed_at: completedAt,
        notes: notes || undefined,
        completed_step_ids: checkedStepIds.length > 0 ? checkedStepIds : undefined,
      })
      onClose()
      setCompletedBy('')
      setNotes('')
      setCheckedStepIds([])
      setCompletedAt(format(new Date(), 'yyyy-MM-dd'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" overlayVariant="light" aria-label="Completar tarea">
        {/* Header */}
        <SheetHeader side="bottom">
          <div className="flex items-center justify-between">
            <SheetTitle>Completar tarea</SheetTitle>
            <SheetCloseButton label="Cerrar" />
          </div>
          <SheetDescription className="mt-1 line-clamp-2">{task.description}</SheetDescription>
        </SheetHeader>

        {/* Form body */}
        <SheetBody>
          <form id="complete-task-form" onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
            {/* Quién completó */}
            <div>
              <label htmlFor="ctd-completed-by" className="gmao-label">
                Completado por <span className="text-destructive" aria-hidden="true">*</span>
              </label>
              {users && users.length > 0 ? (
                <select
                  id="ctd-completed-by"
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
                  id="ctd-completed-by"
                  type="text"
                  value={completedBy}
                  onChange={(e) => setCompletedBy(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Nombre"
                  className="gmao-input"
                />
              )}
            </div>

            {/* Fecha */}
            <div>
              <label htmlFor="ctd-completed-at" className="gmao-label">
                Fecha de ejecución
              </label>
              <input
                id="ctd-completed-at"
                type="date"
                value={completedAt}
                onChange={(e) => setCompletedAt(e.target.value)}
                autoComplete="off"
                className="gmao-input"
              />
            </div>

            {/* Sub-pasos */}
            {steps && steps.length > 0 && (
              <div>
                <label className="gmao-label mb-2">Sub-pasos (opcional)</label>
                <div className="space-y-1.5 border border-border rounded-lg p-2.5">
                  {steps.map((step) => (
                    <label key={step.id} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checkedStepIds.includes(step.id)}
                        onChange={() => toggleStep(step.id)}
                        className="accent-primary w-4 h-4 flex-shrink-0"
                      />
                      <span className="text-sm text-foreground">{step.description}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {checkedStepIds.length}/{steps.length} sub-pasos marcados
                </p>
              </div>
            )}

            {/* Notas */}
            <div>
              <label htmlFor="ctd-notes" className="gmao-label">
                Notas (opcional)
              </label>
              <textarea
                id="ctd-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Observaciones..."
                className="gmao-input resize-none"
              />
            </div>
          </form>
        </SheetBody>

        {/* Sticky submit */}
        <SheetFooter>
          <button
            type="submit"
            form="complete-task-form"
            disabled={saving || !completedBy}
            className="gmao-btn-primary flex items-center justify-center gap-1.5"
            style={{ backgroundColor: saving || !completedBy ? undefined : '#16a34a' }}
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />Guardando…</>
              : 'Marcar como completada'}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
