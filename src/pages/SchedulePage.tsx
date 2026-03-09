import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { startOfWeek, addWeeks, startOfMonth, addMonths } from 'date-fns'
import { CalendarDays, LayoutGrid, Plus } from 'lucide-react'
import { WeekView } from '@/components/maintenance/WeekView'
import { MonthView } from '@/components/maintenance/MonthView'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'

type ViewMode = 'week' | 'month'

export default function SchedulePage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<ViewMode>('week')
  const [weekAnchor, setWeekAnchor] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()))

  function handleWeekChange(dir: -1 | 1) {
    setWeekAnchor((prev) => addWeeks(prev, dir))
  }

  function handleMonthChange(dir: -1 | 1) {
    setMonthAnchor((prev) => addMonths(prev, dir))
  }

  function handleDayClick(dateStr: string) {
    // Switch to week view centered on that date
    const date = new Date(dateStr + 'T00:00:00')
    setWeekAnchor(startOfWeek(date, { weekStartsOn: 1 }))
    setMode('week')
  }

  function handleTaskClick(_taskId: string, planId: string) {
    navigate(`/schedule/plan/${planId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Cronograma"
        action={
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setMode('week')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  mode === 'week' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
                )}
              >
                <CalendarDays className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setMode('month')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  mode === 'month' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => navigate('/schedule/new-plan')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Plan
            </button>
          </div>
        }
      />

      <div className="bg-white border border-gray-200 mx-0 mt-0">
        {mode === 'week' ? (
          <WeekView
            weekStart={weekAnchor}
            onWeekChange={handleWeekChange}
            onTaskClick={handleTaskClick}
          />
        ) : (
          <MonthView
            month={monthAnchor}
            onMonthChange={handleMonthChange}
            onDayClick={handleDayClick}
          />
        )}
      </div>
    </div>
  )
}
