import { useState } from 'react'
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MaintenanceTask, MaintenancePlan } from '@/lib/db'
import { CompleteTaskDialog } from './CompleteTaskDialog'

interface TaskRowProps {
  task: MaintenanceTask
  plan: MaintenancePlan
  showPlanTitle?: boolean
}

function getDueDateInfo(dateStr: string): { label: string; strip: string; badgeClass: string } {
  const date = parseISO(dateStr)
  if (isPast(date) && !isToday(date)) {
    return { label: 'Vencida', strip: 'strip-red', badgeClass: 'gmao-badge gmao-badge-red' }
  }
  if (isToday(date)) {
    return { label: 'Hoy', strip: 'strip-amber', badgeClass: 'gmao-badge gmao-badge-amber' }
  }
  if (isTomorrow(date)) {
    return { label: 'Mañana', strip: 'strip-amber', badgeClass: 'gmao-badge gmao-badge-amber' }
  }
  return {
    label: format(date, 'dd MMM', { locale: es }),
    strip: 'strip-green',
    badgeClass: 'gmao-badge gmao-badge-green',
  }
}

export function TaskRow({ task, plan, showPlanTitle }: TaskRowProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const isCompleted = task.status === 'completada'
  const { label, strip, badgeClass } = getDueDateInfo(task.next_due_date)

  return (
    <>
      <div
        className={cn(
          'flex items-start gap-3 px-4 py-3.5 border-b border-border last:border-0 bg-white transition-colors',
          strip,
          isCompleted && 'opacity-55'
        )}
      >
        <div className="flex-1 min-w-0">
          {showPlanTitle && (
            <p className="text-[11px] font-semibold text-primary uppercase tracking-wide font-display mb-0.5 truncate">
              {plan.title}
            </p>
          )}
          <p className="text-sm font-medium text-foreground leading-snug">{task.description}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={badgeClass}>
              <Clock className="w-2.5 h-2.5 mr-1" />
              {label}
            </span>
            <span className="gmao-mono text-muted-foreground">
              c/{task.frequency_days}d
            </span>
          </div>
        </div>

        {!isCompleted && (
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors font-display"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completar
          </button>
        )}

        {isCompleted && (
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
        )}
      </div>

      <CompleteTaskDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        task={task}
        plan={plan}
      />
    </>
  )
}
