import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, addDays, startOfMonth, endOfMonth, addMonths, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertTriangle,
  Clock,
  Calendar,
  QrCode,
  Wifi,
  WifiOff,
  RefreshCw,
  Settings,
  Plus,
  Zap,
  ListChecks,
} from 'lucide-react'
import { db } from '@/lib/db'
import type { MaintenanceTask, Incident } from '@/lib/db'
import { cn } from '@/lib/utils'
import { useSyncContext } from '@/contexts/SyncContext'
import { MonthView } from '@/components/maintenance/MonthView'
import { DayDetailModal } from '@/components/maintenance/DayDetailModal'
import { useIncidentsInRange } from '@/hooks/useIncidents'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

function tomorrowStr(): string {
  return format(addDays(new Date(), 1), 'yyyy-MM-dd')
}

function endOfWeekStr(): string {
  return format(addDays(new Date(), 7), 'yyyy-MM-dd')
}

// ─── StatusCard (compact 2×2 grid card) ───────────────────────────────────────

interface StatusCardProps {
  title: string
  count: number
  icon: React.ReactNode
  colorClass: string
  borderClass: string
  bgClass: string
  badgeClass: string
  emptyText: string
  children: React.ReactNode
  extraCount?: number
}

function StatusCard({
  title,
  count,
  icon,
  colorClass,
  borderClass,
  bgClass,
  badgeClass,
  emptyText,
  children,
  extraCount,
}: StatusCardProps) {
  return (
    <div className={cn('rounded-xl border-l-4 bg-card shadow-sm overflow-hidden flex flex-col', borderClass)}>
      {/* Header */}
      <div className={cn('flex items-center gap-1.5 px-3 py-2', bgClass)}>
        <span className={cn('flex-shrink-0', colorClass)}>{icon}</span>
        <span className={cn('font-semibold text-xs flex-1 truncate', colorClass)}>{title}</span>
        <span
          className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0',
            count > 0 ? badgeClass : 'bg-gray-400'
          )}
        >
          {count}
        </span>
      </div>
      {/* Body */}
      <div className="flex-1 divide-y divide-gray-50">
        {count === 0 ? (
          <p className="px-3 py-2 text-[11px] text-gray-400">{emptyText}</p>
        ) : (
          <>
            {children}
            {extraCount != null && extraCount > 0 && (
              <p className="px-3 py-1.5 text-[10px] text-gray-400">+{extraCount} más</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Compact row helpers ───────────────────────────────────────────────────────

function TaskCompactRow({ task, planTitle }: { task: MaintenanceTask; planTitle?: string }) {
  return (
    <div className="px-3 py-1.5">
      <p className="text-[11px] font-medium text-gray-800 truncate">{task.description}</p>
      {planTitle && <p className="text-[10px] text-gray-400 truncate">{planTitle}</p>}
    </div>
  )
}

function IncidentCompactRow({ incident, assetName }: { incident: Incident; assetName?: string }) {
  return (
    <div className="px-3 py-1.5 flex items-center gap-1.5">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-gray-800 truncate">
          {assetName ?? 'Activo desconocido'}
        </p>
        {incident.description && (
          <p className="text-[10px] text-gray-400 truncate">{incident.description}</p>
        )}
      </div>
      <span
        className={cn(
          'flex-shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full',
          incident.status === 'abierta'
            ? 'bg-red-100 text-red-700'
            : 'bg-orange-100 text-orange-700'
        )}
      >
        {incident.status === 'abierta' ? 'Abierta' : 'Progreso'}
      </span>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function TodayPage() {
  const navigate = useNavigate()
  const { isOnline, isSyncing, lastSync, triggerSync } = useSyncContext()

  // ── Cronograma state ──
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  function handleMonthChange(dir: -1 | 1) {
    setMonthAnchor((prev) => addMonths(prev, dir))
  }

  const monthFrom = format(startOfMonth(monthAnchor), 'yyyy-MM-dd')
  const monthTo = format(endOfMonth(monthAnchor), 'yyyy-MM-dd')
  const calendarIncidents = useIncidentsInRange(monthFrom, monthTo)

  // ── Prioridades del día ──
  const today = todayStr()
  const tomorrow = tomorrowStr()
  const endOfWeek = endOfWeekStr()

  const overdueTasks = useLiveQuery(
    () =>
      db.maintenance_tasks
        .where('next_due_date')
        .below(today)
        .and((t) => t.status === 'pendiente' && !t.deleted_at)
        .toArray(),
    [today]
  )

  const todayTasks = useLiveQuery(
    () =>
      db.maintenance_tasks
        .where('next_due_date')
        .equals(today)
        .and((t) => t.status === 'pendiente' && !t.deleted_at)
        .toArray(),
    [today]
  )

  const openIncidents = useLiveQuery(() =>
    db.incidents
      .where('status')
      .anyOf(['abierta', 'en_progreso'])
      .and((i) => !i.deleted_at)
      .toArray()
  )

  const weekTasks = useLiveQuery(
    () =>
      db.maintenance_tasks
        .where('next_due_date')
        .between(tomorrow, endOfWeek, true, true)
        .and((t) => t.status === 'pendiente' && !t.deleted_at)
        .toArray(),
    [tomorrow, endOfWeek]
  )

  const allPlans = useLiveQuery(() =>
    db.maintenance_plans.filter((p) => !p.deleted_at).toArray()
  )
  const allAssets = useLiveQuery(() => db.assets.toArray())

  const planMap = useMemo(() => new Map(allPlans?.map((p) => [p.id, p.title]) ?? []), [allPlans])
  const assetMap = useMemo(() => new Map(allAssets?.map((a) => [a.id, a.name]) ?? []), [allAssets])

  const selectedDayIncidents = useMemo(() => {
    if (!selectedDay || !calendarIncidents) return []
    return calendarIncidents.filter((inc) => getIncidentDayKey(inc) === selectedDay)
  }, [selectedDay, calendarIncidents])

  const isLoading =
    overdueTasks === undefined ||
    todayTasks === undefined ||
    openIncidents === undefined ||
    weekTasks === undefined

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  const dateLabel = format(new Date(), "EEEE d 'de' MMMM", { locale: es })

  const MAX_ITEMS = 3

  return (
    <div className="relative max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-foreground capitalize">{dateLabel}</h1>
            <p className="text-xs text-muted-foreground">Panel de hoy</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs">
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-primary" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-red-500" />
              )}
            </div>
            <button
              onClick={triggerSync}
              disabled={isSyncing || !isOnline}
              className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40 transition-colors"
              title={
                lastSync
                  ? `Última sync: ${format(lastSync, 'HH:mm')}`
                  : 'Sincronizar'
              }
            >
              <RefreshCw
                className={cn('w-4 h-4 text-foreground', isSyncing && 'animate-spin')}
              />
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors md:hidden"
              title="Administración"
            >
              <Settings className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-4">
        {/* ── 2×2 Status Grid ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Vencidas */}
          <StatusCard
            title="Vencidas"
            count={overdueTasks.length}
            colorClass="text-red-700"
            borderClass="border-red-500"
            bgClass="bg-red-50"
            badgeClass="bg-red-500"
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            emptyText="Sin tareas vencidas"
            extraCount={overdueTasks.length - MAX_ITEMS}
          >
            {overdueTasks.slice(0, MAX_ITEMS).map((task) => (
              <TaskCompactRow
                key={task.id}
                task={task}
                planTitle={planMap.get(task.plan_id)}
              />
            ))}
          </StatusCard>

          {/* Hoy */}
          <StatusCard
            title="Hoy"
            count={todayTasks.length}
            colorClass="text-amber-700"
            borderClass="border-amber-400"
            bgClass="bg-amber-50"
            badgeClass="bg-amber-500"
            icon={<Clock className="w-3.5 h-3.5" />}
            emptyText="Sin tareas para hoy"
            extraCount={todayTasks.length - MAX_ITEMS}
          >
            {todayTasks.slice(0, MAX_ITEMS).map((task) => (
              <TaskCompactRow
                key={task.id}
                task={task}
                planTitle={planMap.get(task.plan_id)}
              />
            ))}
          </StatusCard>

          {/* Fallas abiertas */}
          <StatusCard
            title="Fallas"
            count={openIncidents.length}
            colorClass="text-orange-700"
            borderClass="border-orange-400"
            bgClass="bg-orange-50"
            badgeClass="bg-orange-500"
            icon={<Zap className="w-3.5 h-3.5" />}
            emptyText="Sin fallas abiertas"
            extraCount={openIncidents.length - MAX_ITEMS}
          >
            {openIncidents.slice(0, MAX_ITEMS).map((incident) => (
              <IncidentCompactRow
                key={incident.id}
                incident={incident}
                assetName={assetMap.get(incident.asset_id)}
              />
            ))}
          </StatusCard>

          {/* Esta semana */}
          <StatusCard
            title="Esta semana"
            count={weekTasks.length}
            colorClass="text-green-700"
            borderClass="border-green-400"
            bgClass="bg-green-50"
            badgeClass="bg-green-500"
            icon={<Calendar className="w-3.5 h-3.5" />}
            emptyText="Sin tareas esta semana"
            extraCount={weekTasks.length - MAX_ITEMS}
          >
            {weekTasks.slice(0, MAX_ITEMS).map((task) => (
              <TaskCompactRow
                key={task.id}
                task={task}
                planTitle={planMap.get(task.plan_id)}
              />
            ))}
          </StatusCard>
        </div>

        {/* ── Cronograma ── */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-foreground">Cronograma</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/schedule/preventive')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
              >
                <ListChecks className="w-3.5 h-3.5" />
                Preventivos
              </button>
              <button
                onClick={() => navigate('/schedule/new-plan')}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                Plan
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <MonthView
              month={monthAnchor}
              onMonthChange={handleMonthChange}
              onDayClick={(date) => setSelectedDay(date)}
              incidents={calendarIncidents ?? []}
            />
          </div>
        </div>

        <DayDetailModal
          date={selectedDay}
          onClose={() => setSelectedDay(null)}
          incidents={selectedDayIncidents}
        />

        {/* Spacer para FAB */}
        <div className="h-16" />
      </div>

      {/* FAB — Escanear QR */}
      <button
        onClick={() => navigate('/scan')}
        className="fixed bottom-20 right-4 md:bottom-6 z-40 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center"
        aria-label="Escanear QR"
      >
        <QrCode className="w-6 h-6" />
      </button>
    </div>
  )
}
