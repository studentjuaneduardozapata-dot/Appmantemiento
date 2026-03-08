import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  QrCode,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react'
import { db } from '@/lib/db'
import type { MaintenanceTask, Incident } from '@/lib/db'
import { cn } from '@/lib/utils'
import { useSyncContext } from '@/contexts/SyncContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

function tomorrowStr(): string {
  return format(addDays(new Date(), 1), 'yyyy-MM-dd')
}

function endOfWeekStr(): string {
  return format(addDays(new Date(), 7), 'yyyy-MM-dd')
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

interface SectionProps {
  title: string
  count: number
  colorClass: string
  borderClass: string
  bgClass: string
  icon: React.ReactNode
  children: React.ReactNode
  emptyText: string
}

function Section({
  title,
  count,
  colorClass,
  borderClass,
  bgClass,
  icon,
  children,
  emptyText,
}: SectionProps) {
  return (
    <div className={cn('rounded-xl border-l-4 bg-white shadow-sm overflow-hidden', borderClass)}>
      <div className={cn('flex items-center gap-2 px-4 py-3', bgClass)}>
        <span className={colorClass}>{icon}</span>
        <h2 className={cn('font-semibold text-sm', colorClass)}>
          {title}
        </h2>
        <span
          className={cn(
            'ml-auto text-xs font-bold px-2 py-0.5 rounded-full text-white',
            count > 0
              ? colorClass.includes('red')
                ? 'bg-red-500'
                : colorClass.includes('yellow') || colorClass.includes('amber')
                  ? 'bg-amber-500'
                  : colorClass.includes('orange')
                    ? 'bg-orange-500'
                    : 'bg-green-500'
              : 'bg-gray-400'
          )}
        >
          {count}
        </span>
      </div>
      <div className="divide-y divide-gray-100">
        {count === 0 ? (
          <p className="px-4 py-3 text-sm text-gray-400">{emptyText}</p>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

interface TaskRowProps {
  task: MaintenanceTask
  planTitle?: string
}

function TaskRow({ task, planTitle }: TaskRowProps) {
  return (
    <div className="px-4 py-3">
      <p className="text-sm font-medium text-gray-900 line-clamp-1">{task.description}</p>
      {planTitle && (
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{planTitle}</p>
      )}
      <p className="text-xs text-gray-400 mt-0.5">
        Vence: {format(new Date(task.next_due_date + 'T00:00:00'), 'dd/MM/yyyy')}
      </p>
    </div>
  )
}

interface IncidentRowProps {
  incident: Incident
  assetName?: string
}

function IncidentRow({ incident, assetName }: IncidentRowProps) {
  const typeLabel: Record<string, string> = {
    mecanica: 'Mecánica',
    electrica: 'Eléctrica',
    neumatica: 'Neumática',
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 line-clamp-1">
            {assetName ?? 'Activo desconocido'}
          </p>
          {incident.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
              {incident.description}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">
            {typeLabel[incident.type] ?? incident.type} — Reportada:{' '}
            {format(new Date(incident.reported_at), 'dd/MM/yyyy', { locale: es })}
          </p>
        </div>
        <span
          className={cn(
            'flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full',
            incident.status === 'abierta'
              ? 'bg-red-100 text-red-700'
              : 'bg-orange-100 text-orange-700'
          )}
        >
          {incident.status === 'abierta' ? 'Abierta' : 'En progreso'}
        </span>
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function TodayPage() {
  const navigate = useNavigate()
  const { isOnline, isSyncing, lastSync, triggerSync } = useSyncContext()

  const today = todayStr()
  const tomorrow = tomorrowStr()
  const endOfWeek = endOfWeekStr()

  // Tareas vencidas (antes de hoy, pendientes)
  const overdueTasks = useLiveQuery(
    () =>
      db.maintenance_tasks
        .where('next_due_date')
        .below(today)
        .and((t) => t.status === 'pendiente')
        .toArray(),
    [today]
  )

  // Tareas de hoy
  const todayTasks = useLiveQuery(
    () =>
      db.maintenance_tasks
        .where('next_due_date')
        .equals(today)
        .and((t) => t.status === 'pendiente')
        .toArray(),
    [today]
  )

  // Fallas abiertas o en progreso
  const openIncidents = useLiveQuery(() =>
    db.incidents
      .where('status')
      .anyOf(['abierta', 'en_progreso'])
      .and((i) => !i.deleted_at)
      .toArray()
  )

  // Tareas de esta semana (mañana a 7 días)
  const weekTasks = useLiveQuery(
    () =>
      db.maintenance_tasks
        .where('next_due_date')
        .between(tomorrow, endOfWeek, true, true)
        .and((t) => t.status === 'pendiente')
        .toArray(),
    [tomorrow, endOfWeek]
  )

  // Planes para enriquecer tareas con título
  const allPlans = useLiveQuery(() => db.maintenance_plans.toArray())

  // Assets para enriquecer incidents con nombre
  const allAssets = useLiveQuery(() => db.assets.toArray())

  const planMap = new Map(allPlans?.map((p) => [p.id, p.title]) ?? [])
  const assetMap = new Map(allAssets?.map((a) => [a.id, a.name]) ?? [])

  const isLoading =
    overdueTasks === undefined ||
    todayTasks === undefined ||
    openIncidents === undefined ||
    weekTasks === undefined

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    )
  }

  const dateLabel = format(new Date(), "EEEE d 'de' MMMM", { locale: es })

  return (
    <div className="relative max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900 capitalize">{dateLabel}</h1>
            <p className="text-xs text-gray-500">Panel de hoy</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Online indicator */}
            <div className="flex items-center gap-1 text-xs">
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-red-500" />
              )}
            </div>
            {/* Sync button */}
            <button
              onClick={triggerSync}
              disabled={isSyncing || !isOnline}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
              title={
                lastSync
                  ? `Última sync: ${format(lastSync, 'HH:mm')}`
                  : 'Sincronizar'
              }
            >
              <RefreshCw
                className={cn('w-4 h-4 text-gray-600', isSyncing && 'animate-spin')}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-3">
        {/* 1. Vencidas */}
        <Section
          title="Vencidas"
          count={overdueTasks.length}
          colorClass="text-red-700"
          borderClass="border-red-500"
          bgClass="bg-red-50"
          icon={<AlertTriangle className="w-4 h-4" />}
          emptyText="Sin tareas vencidas"
        >
          {overdueTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              planTitle={planMap.get(task.plan_id)}
            />
          ))}
        </Section>

        {/* 2. Hoy */}
        <Section
          title="Hoy"
          count={todayTasks.length}
          colorClass="text-amber-700"
          borderClass="border-amber-400"
          bgClass="bg-amber-50"
          icon={<Clock className="w-4 h-4" />}
          emptyText="Sin tareas programadas para hoy"
        >
          {todayTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              planTitle={planMap.get(task.plan_id)}
            />
          ))}
        </Section>

        {/* 3. Fallas abiertas */}
        <Section
          title="Fallas abiertas"
          count={openIncidents.length}
          colorClass="text-orange-700"
          borderClass="border-orange-400"
          bgClass="bg-orange-50"
          icon={<CheckCircle2 className="w-4 h-4" />}
          emptyText="Sin fallas abiertas"
        >
          {openIncidents.map((incident) => (
            <IncidentRow
              key={incident.id}
              incident={incident}
              assetName={assetMap.get(incident.asset_id)}
            />
          ))}
        </Section>

        {/* 4. Esta semana */}
        <Section
          title="Esta semana"
          count={weekTasks.length}
          colorClass="text-green-700"
          borderClass="border-green-400"
          bgClass="bg-green-50"
          icon={<Calendar className="w-4 h-4" />}
          emptyText="Sin tareas programadas esta semana"
        >
          {weekTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              planTitle={planMap.get(task.plan_id)}
            />
          ))}
        </Section>

        {/* Spacer para FAB */}
        <div className="h-16" />
      </div>

      {/* FAB — Escanear QR */}
      <button
        onClick={() => navigate('/scan')}
        className="fixed bottom-20 right-4 md:bottom-6 z-40 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center"
        aria-label="Escanear QR"
      >
        <QrCode className="w-6 h-6" />
      </button>
    </div>
  )
}
