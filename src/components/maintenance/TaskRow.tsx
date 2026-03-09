import { useState } from 'react'
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MaintenanceTask, MaintenancePlan } from '@/lib/db'
import { CompleteTaskDialog } from './CompleteTaskDialog'

interface TaskRowProps {
  task: MaintenanceTask
  plan: MaintenancePlan
  showPlanTitle?: boolean
}

function getDueDateLabel(dateStr: string): { label: string; color: string } {
  const date = parseISO(dateStr + 'T00:00:00')
  if (isPast(date) && !isToday(date)) {
    return { label: 'Vencida', color: 'text-red-600' }
  }
  if (isToday(date)) return { label: 'Hoy', color: 'text-amber-600' }
  if (isTomorrow(date)) return { label: 'Mañana', color: 'text-amber-500' }
  return {
    label: format(date, 'dd MMM', { locale: es }),
    color: 'text-green-600',
  }
}

const STATUS_STYLES: Record<string, string> = {
  pendiente: 'bg-amber-50 text-amber-700',
  completada: 'bg-green-50 text-green-700',
  vencida: 'bg-red-50 text-red-700',
}

export function TaskRow({ task, plan, showPlanTitle }: TaskRowProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { label, color } = getDueDateLabel(task.next_due_date)
  const isCompleted = task.status === 'completada'

  return (
    <>
      <div
        className={cn(
          'flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-0',
          isCompleted && 'opacity-60'
        )}
      >
        <div className="flex-1 min-w-0">
          {showPlanTitle && (
            <p className="text-xs text-blue-600 font-medium mb-0.5 truncate">
              {plan.title}
            </p>
          )}
          <p className="text-sm text-gray-900">{task.description}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={cn('text-xs font-medium', color)}>{label}</span>
            <span className="text-xs text-gray-400">
              cada {task.frequency_days} días
            </span>
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                STATUS_STYLES[task.status]
              )}
            >
              {task.status}
            </span>
          </div>
        </div>

        {!isCompleted && (
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completar
          </button>
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
