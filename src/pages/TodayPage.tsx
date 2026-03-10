import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, addDays, startOfWeek, addWeeks, startOfMonth, addMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertTriangle,
  Clock,
  Calendar,
  QrCode,
  RefreshCw,
  Settings,
  CalendarDays,
  LayoutGrid,
  Plus,
  CheckCircle2,
  Zap,
} from 'lucide-react'
import { db } from '@/lib/db'
import type { MaintenanceTask, Incident } from '@/lib/db'
import { cn } from '@/lib/utils'
import { useSyncContext } from '@/contexts/SyncContext'
import { WeekView } from '@/components/maintenance/WeekView'
import { MonthView } from '@/components/maintenance/MonthView'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr()     { return format(new Date(), 'yyyy-MM-dd') }
function tomorrowStr()  { return format(addDays(new Date(), 1), 'yyyy-MM-dd') }
function endOfWeekStr() { return format(addDays(new Date(), 7), 'yyyy-MM-dd') }

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  count: number
  icon: React.ReactNode
  accentClass: string
  textClass: string
  bgClass: string
  children?: React.ReactNode
  extraCount?: number
}

function KpiCard({ label, count, icon, accentClass, textClass, bgClass, children, extraCount }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden flex flex-col shadow-card">
      <div className={cn('h-[3px] w-full', accentClass)} />
      <div className={cn('flex items-center gap-2 px-3 pt-2.5 pb-1', bgClass)}>
        <span className={cn('flex-shrink-0', textClass)}>{icon}</span>
        <span className={cn('text-[10px] font-bold uppercase tracking-[0.08em] font-display flex-1 truncate', textClass)}>
          {label}
        </span>
        <span className={cn(
          'font-display text-2xl font-bold tabular-nums flex-shrink-0',
          count > 0 ? textClass : 'text-muted-foreground/30'
        )}>
          {count}
        </span>
      </div>
      <div className="flex-1 divide-y divide-border/50">
        {count === 0 ? (
          <div className="flex items-center gap-1.5 px-3 py-2">
            <CheckCircle2 className="w-3 h-3 text-muted-foreground/30" />
            <p className="text-[11px] text-muted-foreground/50">Sin pendientes</p>
          </div>
        ) : (
          <>
            {children}
            {extraCount != null && extraCount > 0 && (
              <p className="px-3 py-1.5 gmao-mono text-muted-foreground/50">
                +{extraCount} más
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Compact rows ─────────────────────────────────────────────────────────────

function TaskCompact({ task, planTitle }: { task: MaintenanceTask; planTitle?: string }) {
  return (
    <div className="px-3 py-1.5">
      <p className="text-[11px] font-medium text-foreground truncate leading-snug">{task.description}</p>
      {planTitle && <p className="gmao-mono text-muted-foreground/50 truncate mt-0.5">{planTitle}</p>}
    </div>
  )
}

function IncidentCompact({ incident, assetName }: { incident: Incident; assetName?: string }) {
  return (
    <div className="px-3 py-1.5 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-foreground truncate">{assetName ?? '—'}</p>
        {incident.description && (
          <p className="gmao-mono text-muted-foreground/50 truncate mt-0.5">{incident.description}</p>
        )}
      </div>
      <span className={cn(
        'flex-shrink-0 gmao-badge text-[9px]',
        incident.status === 'abierta' ? 'gmao-badge-red' : 'gmao-badge-amber'
      )}>
        {incident.status === 'abierta' ? 'Abierta' : 'Prog.'}
      </span>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────

type ViewMode = 'week' | 'month'

export default function TodayPage() {
  const navigate = useNavigate()
  const { isOnline, isSyncing, lastSync, triggerSync } = useSyncContext()

  const [mode, setMode]             = useState<ViewMode>('month')
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()))

  const handleWeekChange  = (dir: -1 | 1) => setWeekAnchor(prev => addWeeks(prev, dir))
  const handleMonthChange = (dir: -1 | 1) => setMonthAnchor(prev => addMonths(prev, dir))

  function handleDayClick(dateStr: string) {
    setWeekAnchor(startOfWeek(new Date(dateStr + 'T00:00:00'), { weekStartsOn: 1 }))
    setMode('week')
  }

  function handleTaskClick(_taskId: string, planId: string) {
    navigate(`/schedule/plan/${planId}`)
  }

  const today     = todayStr()
  const tomorrow  = tomorrowStr()
  const endOfWeek = endOfWeekStr()

  const overdueTasks = useLiveQuery(
    () => db.maintenance_tasks.where('next_due_date').below(today)
      .and(t => t.status === 'pendiente' && !t.deleted_at).toArray(),
    [today]
  )
  const todayTasks = useLiveQuery(
    () => db.maintenance_tasks.where('next_due_date').equals(today)
      .and(t => t.status === 'pendiente' && !t.deleted_at).toArray(),
    [today]
  )
  const openIncidents = useLiveQuery(
    () => db.incidents.where('status').anyOf(['abierta', 'en_progreso'])
      .and(i => !i.deleted_at).toArray()
  )
  const weekTasks = useLiveQuery(
    () => db.maintenance_tasks.where('next_due_date').between(tomorrow, endOfWeek, true, true)
      .and(t => t.status === 'pendiente' && !t.deleted_at).toArray(),
    [tomorrow, endOfWeek]
  )

  const allPlans  = useLiveQuery(() => db.maintenance_plans.filter(p => !p.deleted_at).toArray())
  const allAssets = useLiveQuery(() => db.assets.toArray())

  const planMap  = new Map(allPlans?.map(p => [p.id, p.title]) ?? [])
  const assetMap = new Map(allAssets?.map(a => [a.id, a.name]) ?? [])

  const isLoading = overdueTasks === undefined || todayTasks === undefined ||
                    openIncidents === undefined || weekTasks === undefined

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-5 h-5 animate-spin text-primary" />
      </div>
    )
  }

  const dateLabel = format(new Date(), "EEEE d 'de' MMMM", { locale: es })
  const MAX = 3

  return (
    <div className="relative max-w-2xl mx-auto">

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-white border-b-2 border-primary px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-foreground font-display capitalize leading-tight">
              {dateLabel}
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-display uppercase tracking-wider">
              Panel de operaciones
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn(
              'w-2 h-2 rounded-full',
              isOnline ? 'bg-green-400 animate-pulse-dot' : 'bg-red-400'
            )} />
            <button
              onClick={triggerSync}
              disabled={isSyncing || !isOnline}
              className="p-1.5 rounded-md hover:bg-accent disabled:opacity-40 transition-colors"
              title={lastSync ? `Última sync: ${format(lastSync, 'HH:mm')}` : 'Sincronizar'}
            >
              <RefreshCw className={cn('w-4 h-4 text-foreground/50', isSyncing && 'animate-spin')} />
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="p-1.5 rounded-md hover:bg-accent transition-colors md:hidden"
            >
              <Settings className="w-4 h-4 text-foreground/50" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* ── KPI Grid 2×2 ── */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            label="Vencidas"
            count={overdueTasks.length}
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            accentClass="bg-red-500"
            textClass="text-red-600"
            bgClass="bg-red-50/50"
            extraCount={overdueTasks.length - MAX}
          >
            {overdueTasks.slice(0, MAX).map(t => (
              <TaskCompact key={t.id} task={t} planTitle={planMap.get(t.plan_id)} />
            ))}
          </KpiCard>

          <KpiCard
            label="Hoy"
            count={todayTasks.length}
            icon={<Clock className="w-3.5 h-3.5" />}
            accentClass="bg-amber-400"
            textClass="text-amber-600"
            bgClass="bg-amber-50/50"
            extraCount={todayTasks.length - MAX}
          >
            {todayTasks.slice(0, MAX).map(t => (
              <TaskCompact key={t.id} task={t} planTitle={planMap.get(t.plan_id)} />
            ))}
          </KpiCard>

          <KpiCard
            label="Fallas"
            count={openIncidents.length}
            icon={<Zap className="w-3.5 h-3.5" />}
            accentClass="bg-orange-500"
            textClass="text-orange-600"
            bgClass="bg-orange-50/50"
            extraCount={openIncidents.length - MAX}
          >
            {openIncidents.slice(0, MAX).map(inc => (
              <IncidentCompact key={inc.id} incident={inc} assetName={assetMap.get(inc.asset_id)} />
            ))}
          </KpiCard>

          <KpiCard
            label="Esta semana"
            count={weekTasks.length}
            icon={<Calendar className="w-3.5 h-3.5" />}
            accentClass="bg-green-500"
            textClass="text-green-700"
            bgClass="bg-green-50/50"
            extraCount={weekTasks.length - MAX}
          >
            {weekTasks.slice(0, MAX).map(t => (
              <TaskCompact key={t.id} task={t} planTitle={planMap.get(t.plan_id)} />
            ))}
          </KpiCard>
        </div>

        {/* ── Cronograma ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-foreground font-display uppercase tracking-[0.1em]">
              Cronograma
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex bg-secondary border border-border rounded-md p-0.5">
                <button
                  type="button"
                  onClick={() => setMode('week')}
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    mode === 'week' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setMode('month')}
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    mode === 'month' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={() => navigate('/schedule/new-plan')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-md hover:brightness-90 transition-all font-display tracking-wide"
              >
                <Plus className="w-3.5 h-3.5" />
                Plan
              </button>
            </div>
          </div>

          <div className="gmao-card">
            {mode === 'week' ? (
              <WeekView weekStart={weekAnchor} onWeekChange={handleWeekChange} onTaskClick={handleTaskClick} />
            ) : (
              <MonthView month={monthAnchor} onMonthChange={handleMonthChange} onDayClick={handleDayClick} />
            )}
          </div>
        </div>

        <div className="h-20" />
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/scan')}
        className="fixed bottom-20 right-4 md:bottom-6 z-40 w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:brightness-90 active:scale-95 transition-all flex items-center justify-center"
        aria-label="Escanear QR"
      >
        <QrCode className="w-6 h-6" />
      </button>
    </div>
  )
}
