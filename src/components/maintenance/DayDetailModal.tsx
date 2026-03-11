import { useMemo } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { X, CalendarX } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { useTasksInRange } from '@/hooks/useMaintenanceTasks'
import { TaskRow } from './TaskRow'

interface DayDetailModalProps {
  date: string | null   // 'yyyy-MM-dd' — null = cerrado
  onClose: () => void
}

export function DayDetailModal({ date, onClose }: DayDetailModalProps) {
  const tasks = useTasksInRange(date ?? '', date ?? '')
  const plans = useLiveQuery(() => db.maintenance_plans.toArray())

  const planMap = useMemo(
    () => new Map(plans?.map((p) => [p.id, p]) ?? []),
    [plans]
  )

  const title = date
    ? format(parseISO(date + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es })
    : ''

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

          {/* Task list */}
          <div className="overflow-y-auto flex-1">
            {tasks === undefined ? (
              <div className="flex items-center justify-center py-10">
                <p className="text-sm text-muted-foreground">Cargando...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <CalendarX className="w-8 h-8" />
                <p className="text-sm">Sin tareas programadas para este día</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {tasks.map((task) => {
                  const plan = planMap.get(task.plan_id)
                  if (!plan) return null
                  return (
                    <TaskRow key={task.id} task={task} plan={plan} showPlanTitle />
                  )
                })}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
