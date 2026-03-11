import { useMemo } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { X, CalendarX, AlertTriangle } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { Incident, MaintenanceTask } from '@/lib/db'
import { useTasksInRange } from '@/hooks/useMaintenanceTasks'
import { TaskRow } from './TaskRow'
import { cn } from '@/lib/utils'

interface DayDetailModalProps {
  date: string | null   // 'yyyy-MM-dd' — null = cerrado
  onClose: () => void
  incidents?: Incident[]
}

const INCIDENT_TYPE_LABEL: Record<string, string> = {
  mecanica: 'Mecánica',
  electrica: 'Eléctrica',
  neumatica: 'Neumática',
}

const INCIDENT_STATUS_LABEL: Record<string, string> = {
  abierta: 'Abierta',
  en_progreso: 'En progreso',
  cerrada: 'Cerrada',
}

function getIncidentStatusClass(status: string): string {
  if (status === 'abierta') return 'text-red-600 bg-red-50'
  if (status === 'en_progreso') return 'text-amber-600 bg-amber-50'
  return 'text-gray-500 bg-gray-100'
}

export function DayDetailModal({ date, onClose, incidents = [] }: DayDetailModalProps) {
  const tasks = useTasksInRange(date ?? '', date ?? '')
  const plans = useLiveQuery(() => db.maintenance_plans.toArray())
  const assets = useLiveQuery(() => db.assets.toArray())

  // When viewing today, also fetch overdue tasks (due before today, still pending)
  const overdueTasks = useLiveQuery(
    async () => {
      const todayStr = format(new Date(), 'yyyy-MM-dd')
      if (date !== todayStr) return [] as MaintenanceTask[]
      return db.maintenance_tasks
        .where('next_due_date')
        .below(todayStr)
        .and((t) => t.status === 'pendiente' && !t.deleted_at)
        .toArray()
    },
    [date]
  )

  const planMap = useMemo(
    () => new Map(plans?.map((p) => [p.id, p]) ?? []),
    [plans]
  )

  const assetMap = useMemo(
    () => new Map(assets?.map((a) => [a.id, a]) ?? []),
    [assets]
  )

  // Merge overdue tasks (sorted oldest first) + tasks due on this day
  const displayTasks = useMemo<MaintenanceTask[]>(() => {
    const regular = tasks ?? []
    const overdue = overdueTasks ?? []
    return [...overdue, ...regular].sort(
      (a, b) => a.next_due_date.localeCompare(b.next_due_date)
    )
  }, [tasks, overdueTasks])

  const title = date
    ? format(parseISO(date + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es })
    : ''

  const isLoading = tasks === undefined || overdueTasks === undefined
  const hasNoData = !isLoading && displayTasks.length === 0 && incidents.length === 0

  return (
    <Dialog.Root open={!!date} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed z-50 bg-background rounded-xl shadow-xl w-[calc(100%-2rem)] max-w-lg left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[80vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card flex-shrink-0">
            <Dialog.Title className="text-sm font-bold text-foreground capitalize font-display">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <p className="text-sm text-muted-foreground">Cargando...</p>
              </div>
            ) : hasNoData ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <CalendarX className="w-8 h-8" />
                <p className="text-sm">Sin actividad registrada para este día</p>
              </div>
            ) : (
              <div>
                {/* Sección de tareas de mantenimiento */}
                {displayTasks.length > 0 && (
                  <div>
                    <p className="px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground bg-secondary/40 border-b border-border">
                      Mantenimiento
                    </p>
                    <div className="divide-y divide-border">
                      {displayTasks.map((task) => {
                        const plan = planMap.get(task.plan_id)
                        if (!plan) return null
                        return (
                          <TaskRow key={task.id} task={task} plan={plan} showPlanTitle />
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Sección de fallas */}
                {incidents.length > 0 && (
                  <div>
                    <p className="px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground bg-secondary/40 border-b border-border">
                      Fallas
                    </p>
                    <div className="divide-y divide-border">
                      {incidents.map((inc) => {
                        const asset = assetMap.get(inc.asset_id)
                        return (
                          <div key={inc.id} className="px-4 py-3 flex items-start gap-3">
                            <AlertTriangle className={cn(
                              'w-4 h-4 mt-0.5 flex-shrink-0',
                              inc.status === 'cerrada' ? 'text-orange-400' : 'text-red-500'
                            )} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {asset?.name ?? 'Activo desconocido'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {INCIDENT_TYPE_LABEL[inc.type] ?? inc.type}
                                {inc.reported_by ? ` · Reportó: ${inc.reported_by}` : ''}
                              </p>
                              {inc.description && (
                                <p className="text-xs text-muted-foreground/80 mt-0.5 truncate">
                                  {inc.description}
                                </p>
                              )}
                            </div>
                            <span className={cn(
                              'text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0',
                              getIncidentStatusClass(inc.status)
                            )}>
                              {INCIDENT_STATUS_LABEL[inc.status] ?? inc.status}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
