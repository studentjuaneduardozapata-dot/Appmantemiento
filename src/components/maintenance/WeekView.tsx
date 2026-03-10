import { useMemo } from 'react'
import { format, addDays, isToday, isPast, isTomorrow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { useTasksInRange } from '@/hooks/useMaintenanceTasks'
import { cn } from '@/lib/utils'

interface WeekViewProps {
  weekStart: Date
  onWeekChange: (direction: -1 | 1) => void
  onTaskClick: (taskId: string, planId: string) => void
}

function getTaskChipColor(dateStr: string, status: string): string {
  if (status === 'completada') return 'bg-gray-200 text-gray-500'
  const date = parseISO(dateStr + 'T00:00:00')
  if (isPast(date) && !isToday(date)) return 'bg-red-100 text-red-700'
  if (isToday(date) || isTomorrow(date)) return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}

export function WeekView({ weekStart, onWeekChange, onTaskClick }: WeekViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const from = format(weekStart, 'yyyy-MM-dd')
  const to = format(days[6], 'yyyy-MM-dd')

  const tasks = useTasksInRange(from, to)
  const plans = useLiveQuery(() => db.maintenance_plans.toArray())
  const planMap = useMemo(
    () => new Map(plans?.map((p) => [p.id, p]) ?? []),
    [plans]
  )

  const tasksByDay = useMemo(() => {
    const map = new Map<string, typeof tasks>()
    for (const task of tasks ?? []) {
      const key = task.next_due_date
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(task)
    }
    return map
  }, [tasks])

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-border">
        <button type="button" onClick={() => onWeekChange(-1)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="gmao-mono text-foreground font-medium">
          {format(weekStart, 'dd MMM', { locale: es })} — {format(days[6], 'dd MMM yyyy', { locale: es })}
        </span>
        <button type="button" onClick={() => onWeekChange(1)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Days grid — horizontal scroll on mobile */}
      <div className="overflow-x-auto">
        <div className="flex min-w-[600px]">
          {days.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd')
            const dayTasks = tasksByDay.get(dayKey) ?? []
            const today = isToday(day)

            return (
              <div
                key={dayKey}
                className="flex-1 min-w-[80px] border-r border-border last:border-r-0"
              >
                {/* Day header */}
                <div className={cn('px-2 py-2 text-center border-b border-border', today && 'bg-primary/[0.06]')}>
                  <p className={cn('gmao-mono uppercase', today ? 'text-primary' : 'text-muted-foreground/60')}>
                    {format(day, 'EEE', { locale: es })}
                  </p>
                  <p className={cn('text-sm font-bold mt-0.5 font-display', today ? 'text-primary' : 'text-foreground')}>
                    {format(day, 'd')}
                  </p>
                </div>

                {/* Tasks */}
                <div className="px-1 py-1.5 space-y-1 min-h-[80px]">
                  {dayTasks.map((task) => {
                    const plan = planMap.get(task.plan_id)
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => onTaskClick(task.id, task.plan_id)}
                        className={cn(
                          'w-full text-left px-1.5 py-1 rounded text-xs leading-tight',
                          getTaskChipColor(task.next_due_date, task.status)
                        )}
                      >
                        <p className="font-medium truncate">{task.description}</p>
                        {plan && (
                          <p className="truncate opacity-70">{plan.title}</p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
