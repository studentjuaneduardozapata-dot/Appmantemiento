import { useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isToday,
  isPast,
  isSameMonth,
  parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTasksInRange } from '@/hooks/useMaintenanceTasks'
import type { Incident } from '@/lib/db'
import { cn } from '@/lib/utils'

interface MonthViewProps {
  month: Date
  onMonthChange: (direction: -1 | 1) => void
  onDayClick: (date: string) => void
  incidents?: Incident[]
}

function getDotColor(dateStr: string, status: string): string {
  if (status === 'completada') return 'bg-gray-400'
  const date = parseISO(dateStr)
  if (isPast(date) && !isToday(date)) return 'bg-red-500'
  if (isToday(date)) return 'bg-amber-400'
  return 'bg-green-500'
}

export function MonthView({ month, onMonthChange, onDayClick, incidents = [] }: MonthViewProps) {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const from = format(monthStart, 'yyyy-MM-dd')
  const to = format(monthEnd, 'yyyy-MM-dd')
  const tasks = useTasksInRange(from, to)

  const tasksByDay = useMemo(() => {
    const map = new Map<string, typeof tasks>()
    for (const task of tasks ?? []) {
      const key = task.next_due_date
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(task)
    }
    return map
  }, [tasks])

  const incidentsByDay = useMemo(() => {
    const map = new Map<string, Incident[]>()
    for (const inc of incidents) {
      const key = inc.reported_at.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(inc)
    }
    return map
  }, [incidents])

  // Build calendar weeks
  const weeks: Date[][] = []
  let current = calStart
  while (current <= calEnd) {
    const week = Array.from({ length: 7 }, (_, i) => addDays(current, i))
    weeks.push(week)
    current = addDays(current, 7)
  }

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-border">
        <button type="button" onClick={() => onMonthChange(-1)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-foreground capitalize font-display tracking-wide">
          {format(month, 'MMMM yyyy', { locale: es })}
        </span>
        <button type="button" onClick={() => onMonthChange(1)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-border bg-secondary/40">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
          <div key={d} className="py-1.5 text-center gmao-mono text-muted-foreground/70">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-border last:border-0">
          {week.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd')
            const dayTasks = tasksByDay.get(dayKey) ?? []
            const dayIncidents = incidentsByDay.get(dayKey) ?? []
            const inMonth = isSameMonth(day, month)
            const today = isToday(day)

            const hasOpenIncident = dayIncidents.some(
              (i) => i.status === 'abierta' || i.status === 'en_progreso'
            )
            const hasClosedIncident = dayIncidents.some((i) => i.status === 'cerrada')

            return (
              <button
                key={dayKey}
                type="button"
                onClick={() => onDayClick(dayKey)}
                className={cn(
                  'min-h-[52px] p-1 flex flex-col items-center border-r border-border/50 last:border-0 transition-colors hover:bg-accent/50',
                  !inMonth && 'opacity-25',
                  today && 'bg-primary/[0.06]'
                )}
              >
                <span
                  className={cn(
                    'gmao-mono w-6 h-6 flex items-center justify-center rounded-md text-xs',
                    today
                      ? 'bg-primary text-white font-bold'
                      : 'text-foreground'
                  )}
                >
                  {format(day, 'd')}
                </span>

                {/* Task dots */}
                {dayTasks.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
                    {dayTasks.slice(0, 4).map((task) => (
                      <span
                        key={task.id}
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          getDotColor(task.next_due_date, task.status)
                        )}
                      />
                    ))}
                    {dayTasks.length > 4 && (
                      <span className="text-[9px] text-muted-foreground leading-none">
                        +{dayTasks.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Incident dots */}
                {(hasOpenIncident || hasClosedIncident) && (
                  <div className="flex gap-0.5 mt-0.5 justify-center">
                    {hasOpenIncident && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    )}
                    {hasClosedIncident && (
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
