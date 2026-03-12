import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Edit2, Trash2, Wrench } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, addDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { db } from '@/lib/db'
import { useMaintenancePlans, deleteMaintenancePlan } from '@/hooks/useMaintenancePlans'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'

function getDateBadgeClass(dateStr: string, status: string): string {
  if (status === 'completada') return 'bg-gray-100 text-gray-400'
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  if (dateStr < todayStr) return 'bg-red-50 text-red-600'
  if (dateStr === todayStr) return 'bg-amber-50 text-amber-600'
  if (dateStr === tomorrowStr) return 'bg-amber-50 text-amber-500'
  return 'bg-green-50 text-green-700'
}

function formatShortDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr + 'T00:00:00'), "d MMM", { locale: es })
  } catch {
    return dateStr
  }
}

export default function PreventivePage() {
  const navigate = useNavigate()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')

  const plans = useMaintenancePlans()
  const assets = useLiveQuery(() => db.assets.filter((a) => !a.deleted_at).toArray())
  const allCategories = useLiveQuery(() => db.asset_categories.filter((c) => !c.deleted_at).toArray())
  const allTasks = useLiveQuery(() =>
    db.maintenance_tasks.filter((t) => !t.deleted_at).toArray()
  )

  const assetMap = useMemo(() => {
    const m = new Map<string, { name: string; category_id: string }>()
    for (const a of assets ?? []) m.set(a.id, { name: a.name, category_id: a.category_id })
    return m
  }, [assets])

  const categoryMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of allCategories ?? []) m.set(c.id, c.name)
    return m
  }, [allCategories])

  // Group tasks by plan_id keeping next_due_date + status for date badges
  const tasksByPlan = useMemo(() => {
    const m = new Map<string, { next_due_date: string; status: string }[]>()
    for (const t of allTasks ?? []) {
      if (!m.has(t.plan_id)) m.set(t.plan_id, [])
      m.get(t.plan_id)!.push({ next_due_date: t.next_due_date, status: t.status })
    }
    return m
  }, [allTasks])

  const preventivePlans = useMemo(
    () => (plans ?? []).filter((p) => p.type === 'preventivo'),
    [plans]
  )

  const grouped = useMemo(() => {
    const map = new Map<string, typeof preventivePlans>()
    for (const plan of preventivePlans) {
      const firstAsset = plan.asset_ids[0] ? assetMap.get(plan.asset_ids[0]) : undefined
      const catId = firstAsset?.category_id ?? '__sin_categoria__'
      if (!map.has(catId)) map.set(catId, [])
      map.get(catId)!.push(plan)
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === '__sin_categoria__') return 1
      if (b === '__sin_categoria__') return -1
      return (categoryMap.get(a) ?? '').localeCompare(categoryMap.get(b) ?? '')
    })
  }, [preventivePlans, assetMap, categoryMap])

  const isLoading = plans === undefined || assets === undefined

  async function handleDelete() {
    if (!deleteId) return
    await deleteMaintenancePlan(deleteId)
    setDeleteId(null)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
        <h1 className="flex-1 text-base font-semibold font-display text-foreground">Planes Preventivos</h1>
        <button
          type="button"
          onClick={() => navigate('/schedule/new-plan')}
          aria-label="Nuevo plan de mantenimiento"
          style={{ touchAction: 'manipulation' }}
          className="p-2 text-muted-foreground hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-md"
        >
          <Plus className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-40">
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      )}

      {!isLoading && preventivePlans.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 gap-3 px-6 text-center">
          <Wrench className="w-8 h-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No hay planes preventivos aún.</p>
          <button
            type="button"
            onClick={() => navigate('/schedule/new-plan')}
            className="text-sm text-primary hover:underline"
          >
            Crear el primero
          </button>
        </div>
      )}

      {!isLoading && grouped.length > 0 && (
        <div className="mx-4 mt-5 mb-8">
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <Accordion>
              {grouped.map(([catId, catPlans]) => {
                const categoryName =
                  catId === '__sin_categoria__'
                    ? 'Sin categoría'
                    : (categoryMap.get(catId) ?? 'Categoría desconocida')

                return (
                  <AccordionItem key={catId} value={catId}>
                    <AccordionTrigger>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{categoryName}</span>
                        <span className="text-[11px] font-normal text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
                          {catPlans.length}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="divide-y divide-border border-t border-border">
                        {catPlans.map((plan) => {
                          const assetNames = plan.asset_ids
                            .map((aid) => assetMap.get(aid)?.name)
                            .filter(Boolean) as string[]

                          const displayNames =
                            assetNames.length <= 2
                              ? assetNames.join(', ')
                              : `${assetNames.slice(0, 2).join(', ')} +${assetNames.length - 2} más`

                          const planTasks = tasksByPlan.get(plan.id) ?? []

                          // Unique dates: deduplicate, keep worst status per date
                          const dateMap = new Map<string, string>()
                          for (const t of planTasks) {
                            const existing = dateMap.get(t.next_due_date)
                            if (!existing || existing === 'completada') {
                              dateMap.set(t.next_due_date, t.status)
                            }
                          }
                          const uniqueDates = [...dateMap.entries()].sort(
                            ([a], [b]) => a.localeCompare(b)
                          )

                          return (
                            <div key={plan.id} className="flex items-start gap-3 px-4 py-3">
                              <button
                                type="button"
                                onClick={() => navigate(`/schedule/plan/${plan.id}`)}
                                className="flex-1 min-w-0 text-left"
                              >
                                <p className="text-sm font-medium text-foreground truncate">
                                  {plan.title}
                                </p>
                                {displayNames && (
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                    {displayNames}
                                  </p>
                                )}
                                {uniqueDates.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {uniqueDates.map(([dateStr, status]) => (
                                      <span
                                        key={dateStr}
                                        className={cn(
                                          'text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
                                          getDateBadgeClass(dateStr, status)
                                        )}
                                      >
                                        {formatShortDate(dateStr)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </button>
                              <div className="flex items-center gap-0.5 flex-shrink-0 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/schedule/plan/${plan.id}/edit`)}
                                  aria-label={`Editar plan ${plan.title}`}
                                  style={{ touchAction: 'manipulation' }}
                                  className="p-2 text-muted-foreground hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-md"
                                >
                                  <Edit2 className="w-4 h-4" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteId(plan.id)
                                    setDeleteName(plan.title)
                                  }}
                                  aria-label={`Eliminar plan ${plan.title}`}
                                  style={{ touchAction: 'manipulation' }}
                                  className="p-2 text-muted-foreground hover:text-destructive focus-visible:ring-2 focus-visible:ring-destructive focus-visible:outline-none rounded-md"
                                >
                                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar plan"
        description={`¿Eliminar el plan "${deleteName}" y todas sus tareas? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
