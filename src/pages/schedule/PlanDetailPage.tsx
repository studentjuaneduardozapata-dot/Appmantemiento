import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Trash2, Pencil } from 'lucide-react'
import { useState } from 'react'
import { db } from '@/lib/db'
import { useMaintenancePlan, deleteMaintenancePlan } from '@/hooks/useMaintenancePlans'
import { useTasksByPlan } from '@/hooks/useMaintenanceTasks'
import { TaskRow } from '@/components/maintenance/TaskRow'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

const TYPE_LABELS: Record<string, string> = {
  unico: 'Único',
  preventivo: 'Preventivo',
}

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const plan = useMaintenancePlan(id!)
  const tasks = useTasksByPlan(id!)
  const assets = useLiveQuery(() => db.assets.toArray())
  const assetMap = new Map(assets?.map((a) => [a.id, a.name]) ?? [])

  if (plan === undefined) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  async function handleDelete() {
    await deleteMaintenancePlan(id!)
    navigate('/', { replace: true })
  }

  const assetNames = plan.asset_ids.map((aid) => assetMap.get(aid) ?? aid).join(', ')

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-1 -ml-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-base font-semibold text-foreground truncate">
          {plan.title}
        </h1>
        <button
          type="button"
          onClick={() => navigate(`/schedule/plan/${id}/edit`)}
          className="p-1.5 text-muted-foreground hover:text-primary"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="p-1.5 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Plan info */}
      <div className="bg-card mx-4 mt-3 rounded-lg border border-border divide-y divide-border">
        <InfoRow label="Tipo" value={TYPE_LABELS[plan.type] ?? plan.type} />
        {assetNames && <InfoRow label="Activos" value={assetNames} />}
        {plan.description && <InfoRow label="Descripción" value={plan.description} />}
      </div>

      {/* Tasks */}
      <div className="mx-4 mt-4 mb-8">
        <h2 className="gmao-section-title mb-2 px-1">
          Tareas ({tasks?.length ?? 0})
        </h2>
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          {tasks === undefined ? (
            <p className="text-center text-sm text-muted-foreground py-6">Cargando...</p>
          ) : tasks.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">Sin tareas</p>
          ) : (
            tasks.map((task) => (
              <TaskRow key={task.id} task={task} plan={plan} />
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar plan"
        description={`¿Eliminar el plan "${plan.title}" y todas sus tareas?`}
        confirmLabel="Eliminar"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between px-4 py-2.5 gap-3">
      <span className="text-sm text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  )
}
