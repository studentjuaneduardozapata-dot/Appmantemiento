import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { startOfMonth, addMonths, endOfMonth, format } from 'date-fns'
import { Plus } from 'lucide-react'
import { MonthView } from '@/components/maintenance/MonthView'
import { DayDetailModal } from '@/components/maintenance/DayDetailModal'
import { PageHeader } from '@/components/shared/PageHeader'
import { useIncidentsInRange } from '@/hooks/useIncidents'

export default function SchedulePage() {
  const navigate = useNavigate()
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const monthFrom = format(startOfMonth(monthAnchor), 'yyyy-MM-dd')
  const monthTo = format(endOfMonth(monthAnchor), 'yyyy-MM-dd')
  const incidents = useIncidentsInRange(monthFrom, monthTo)

  function handleMonthChange(dir: -1 | 1) {
    setMonthAnchor((prev) => addMonths(prev, dir))
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Cronograma"
        action={
          <button
            onClick={() => navigate('/schedule/new-plan')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-md hover:brightness-90 transition-all font-display tracking-wide"
          >
            <Plus className="w-3.5 h-3.5" />
            Plan
          </button>
        }
      />

      <div className="gmao-card mx-0 mt-0 rounded-none border-x-0 border-b-0">
        <MonthView
          month={monthAnchor}
          onMonthChange={handleMonthChange}
          onDayClick={(date) => setSelectedDay(date)}
          incidents={incidents ?? []}
        />
      </div>

      <DayDetailModal
        date={selectedDay}
        onClose={() => setSelectedDay(null)}
      />
    </div>
  )
}
