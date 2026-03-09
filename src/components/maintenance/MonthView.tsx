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
import { cn } from '@/lib/utils'

interface MonthViewProps {
  month: Date
  onMonthChange: (direction: -1 | 1) => void
  onDayClick: (date: string) => void
}

function getDotColor(dateStr: string, status: string): string {
  if (status === 'completada') return 'bg-gray-400'
  const date = parseISO(dateStr + 'T00:00:00')
  if (isPast(date) && !isToday(date)) return 'bg-red-500'
  if (isToday(date)) return 'bg-amber-400'
  return 'bg-green-500'
}

export function MonthView({ month, onMonthChange, onDayClick }: MonthViewProps) {
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
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <button
          type="button"
          onClick={() => onMonthChange(-1)}
          className="p-1.5 text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-gray-800 capitalize">
          {format(month, 'MMMM yyyy', { locale: es })}
        </span>
        <button
          type="button"
          onClick={() => onMonthChange(1)}
          className="p-1.5 text-gray-500 hover:text-gray-700"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
          <div
            key={d}
            className="py-1.5 text-center text-xs font-medium text-gray-400 uppercase"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-gray-100 last:border-0">
          {week.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd')
            const dayTasks = tasksByDay.get(dayKey) ?? []
            const inMonth = isSameMonth(day, month)
            const today = isToday(day)

            return (
              <button
                key={dayKey}
                type="button"
                onClick={() => onDayClick(dayKey)}
                className={cn(
                  'min-h-[52px] p-1 flex flex-col items-center border-r border-gray-50 last:border-0',
                  !inMonth && 'opacity-30',
                  today && 'bg-blue-50'
                )}
              >
                <span
                  className={cn(
                    'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                    today
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700'
                  )}
                >
                  {format(day, 'd')}
                </span>

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
                      <span className="text-[9px] text-gray-400 leading-none">
                        +{dayTasks.length - 4}
                      </span>
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
