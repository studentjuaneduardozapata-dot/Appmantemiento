import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { startOfMonth, addMonths, endOfMonth, format, parseISO } from 'date-fns'
import { Plus } from 'lucide-react'
import { MonthView } from '@/components/maintenance/MonthView'
import { DayDetailModal } from '@/components/maintenance/DayDetailModal'
import { PageHeader } from '@/components/shared/PageHeader'
import { useIncidentsInRange } from '@/hooks/useIncidents'
import type { Incident } from '@/lib/db'

/**
 * Retorna la clave de fecha local (yyyy-MM-dd) que corresponde a un incidente
 * para efectos del modal de detalle del día:
 * - Cerrado: se usa closed_at (fecha de cierre)
 * - Abierto/En progreso: se usa reported_at (fecha de reporte)
 * Usa format(parseISO()) para respetar el timezone local del dispositivo.
 */
function getIncidentDayKey(inc: Incident): string | null {
  const raw = inc.status === 'cerrada'
    ? (inc.closed_at ?? inc.reported_at)
    : inc.reported_at
  if (!raw) return null
  try {
    return format(parseISO(raw), 'yyyy-MM-dd')
  } catch {
    return raw.slice(0, 10)
  }
}

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

  // Filtrar los incidentes del día seleccionado para el modal
  const selectedDayIncidents = useMemo(() => {
    if (!selectedDay || !incidents) return []
    return incidents.filter((inc) => getIncidentDayKey(inc) === selectedDay)
  }, [selectedDay, incidents])

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
        incidents={selectedDayIncidents}
      />
    </div>
  )
}
