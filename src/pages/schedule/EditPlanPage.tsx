import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft } from 'lucide-react'
import { db } from '@/lib/db'
import { useMaintenancePlan, updateMaintenancePlan } from '@/hooks/useMaintenancePlans'
import { useTasksByPlan } from '@/hooks/useMaintenanceTasks'
import { PlanForm } from '@/components/maintenance/PlanForm'
import type { MaintenancePlanFormData, MaintenanceTaskFormData } from '@/types'

export default function EditPlanPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const plan = useMaintenancePlan(id!)
  const tasks = useTasksByPlan(id!)
  const allSteps = useLiveQuery(
    () =>
      db.task_steps
        .filter((s) => !s.deleted_at)
        .sortBy('sort_order'),
    []
  )

  const initialValues = useMemo(() => {
    if (!plan || !tasks || !allSteps) return undefined

    const stepsByTask = new Map<string, typeof allSteps>()
    for (const s of allSteps) {
      if (!stepsByTask.has(s.task_id)) stepsByTask.set(s.task_id, [])
      stepsByTask.get(s.task_id)!.push(s)
    }

    return {
      plan: {
        title: plan.title,
        description: plan.description,
        asset_ids: plan.asset_ids,
        type: plan.type,
      } as MaintenancePlanFormData,
      tasks: tasks.map((t) => ({
        id: t.id,
        description: t.description,
        frequency_days: t.frequency_days,
        steps: (stepsByTask.get(t.id) ?? []).map((s) => ({
          id: s.id,
          description: s.description,
          sort_order: s.sort_order,
        })),
      })) as MaintenanceTaskFormData[],
    }
  }, [plan, tasks, allSteps])

  async function handleSubmit(
    planData: MaintenancePlanFormData,
    taskData: MaintenanceTaskFormData[]
  ) {
    setIsSubmitting(true)
    try {
      await updateMaintenancePlan(id!, planData, taskData)
      navigate(`/schedule/plan/${id}`, { replace: true })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!initialValues) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    )
  }

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
          Editar plan
        </h1>
      </div>
      <PlanForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        initialValues={initialValues}
      />
    </div>
  )
}
