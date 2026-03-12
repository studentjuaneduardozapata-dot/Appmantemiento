import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { createMaintenancePlan } from '@/hooks/useMaintenancePlans'
import { PlanForm } from '@/components/maintenance/PlanForm'
import type { MaintenancePlanFormData, MaintenanceTaskFormData } from '@/types'

export default function NewPlanPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const assetId = searchParams.get('assetId') ?? undefined

  // If assetId is provided, pre-load it to build initialValues
  const preAsset = useLiveQuery(
    () => (assetId ? db.assets.get(assetId) : Promise.resolve(undefined)),
    [assetId]
  )

  async function handleSubmit(
    plan: MaintenancePlanFormData,
    tasks: MaintenanceTaskFormData[]
  ) {
    setIsSubmitting(true)
    try {
      const id = await createMaintenancePlan(plan, tasks)
      navigate(`/schedule/plan/${id}`, { replace: true })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Build initialValues only when we have the pre-asset resolved (or no assetId at all)
  const ready = !assetId || preAsset !== undefined
  const initialValues = assetId && preAsset
    ? {
        plan: {
          title: '',
          description: '',
          type: 'preventivo' as const,
          asset_ids: [assetId],
        },
        tasks: [{ description: '', frequency_days: 7, steps: [] }],
      }
    : undefined

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card border-b-2 border-primary px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Volver"
          style={{ touchAction: 'manipulation' }}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-md"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <h1 className="text-base font-semibold font-display text-foreground">Nuevo plan de mantenimiento</h1>
      </div>
      {ready && (
        <PlanForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          initialValues={initialValues}
          preselectedAssetId={assetId}
        />
      )}
    </div>
  )
}
