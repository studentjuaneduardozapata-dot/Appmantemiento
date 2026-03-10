import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, subDays, subMonths } from 'date-fns'
import { db } from '@/lib/db'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'

type Period = '15d' | '1m' | 'custom'

function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function StatCard({
  title,
  value,
  color,
  bg,
  accent,
}: {
  title: string
  value: number
  color: string
  bg: string
  accent: string
}) {
  return (
    <div className={cn('rounded-lg border border-border overflow-hidden shadow-card', bg)}>
      <div className={cn('h-[3px] w-full', accent)} />
      <div className="px-4 py-3">
        <p className={cn('font-display text-3xl font-bold tabular-nums leading-none', color)}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1.5 leading-tight">{title}</p>
      </div>
    </div>
  )
}

export default function SummaryPage() {
  const [period, setPeriod] = useState<Period>('15d')
  const [customFrom, setCustomFrom] = useState(() => toDateStr(subDays(new Date(), 30)))
  const [customTo, setCustomTo] = useState(() => toDateStr(new Date()))

  const today = toDateStr(new Date())
  const dateFrom =
    period === '15d'
      ? toDateStr(subDays(new Date(), 15))
      : period === '1m'
        ? toDateStr(subMonths(new Date(), 1))
        : customFrom
  const dateTo = period === 'custom' ? customTo : today

  const stats = useLiveQuery(async () => {
    const todayLocal = format(new Date(), 'yyyy-MM-dd')

    const [logs, allIncidents, tasks, assets] = await Promise.all([
      db.maintenance_logs
        .where('completed_at')
        .between(dateFrom, dateTo + 'T99', true, true)
        .toArray(),
      db.incidents.filter((i) => !i.deleted_at).toArray(),
      db.maintenance_tasks.toArray(),
      db.assets.filter((a) => !a.deleted_at).toArray(),
    ])

    const incidentsInRange = allIncidents.filter(
      (i) => i.reported_at >= dateFrom && i.reported_at <= dateTo
    )
    const incidentsClosedInRange = allIncidents.filter(
      (i) =>
        i.status === 'cerrada' &&
        i.closed_at &&
        i.closed_at >= dateFrom &&
        i.closed_at <= dateTo + 'T99'
    )

    const tasksPending = tasks.filter((t) => t.status === 'pendiente').length
    const tasksOverdue = tasks.filter(
      (t) => t.status === 'pendiente' && t.next_due_date < todayLocal
    ).length

    const newAssetsCount = assets.filter(
      (a) => a.created_at >= dateFrom && a.created_at <= dateTo + 'T99'
    ).length

    // Top assets by incidents in range
    const incidentsByAsset = new Map<string, number>()
    for (const inc of incidentsInRange) {
      incidentsByAsset.set(inc.asset_id, (incidentsByAsset.get(inc.asset_id) ?? 0) + 1)
    }
    const topAssetIds = [...incidentsByAsset.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    const assetNameMap = new Map(assets.map((a) => [a.id, a.name]))
    const missingIds = topAssetIds.map(([id]) => id).filter((id) => !assetNameMap.has(id))
    if (missingIds.length > 0) {
      const extra = await db.assets.where('id').anyOf(missingIds).toArray()
      extra.forEach((a) => assetNameMap.set(a.id, a.name))
    }

    const topAssets = topAssetIds.map(([id, count]) => ({
      id,
      name: assetNameMap.get(id) ?? 'Desconocido',
      count,
    }))

    return {
      totalLogs: logs.length,
      tasksPending,
      tasksOverdue,
      incidentsReported: incidentsInRange.length,
      incidentsClosed: incidentsClosedInRange.length,
      newAssetsCount,
      topAssets,
    }
  }, [dateFrom, dateTo])

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Resumen" />

      {/* Period selector */}
      <div className="bg-white border-b border-border px-4 py-3 space-y-2">
        <div className="flex gap-2">
          {(['15d', '1m', 'custom'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn('gmao-period-btn', period === p ? 'gmao-period-btn-active' : 'gmao-period-btn-inactive')}
            >
              {p === '15d' ? '15 días' : p === '1m' ? '1 mes' : 'Personalizado'}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex gap-2 items-center">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="gmao-input-sm flex-1" />
            <span className="text-xs text-muted-foreground font-display">—</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="gmao-input-sm flex-1" />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="px-4 py-4 space-y-3">
        {stats === undefined ? (
          <p className="text-center text-sm text-muted-foreground py-8">Cargando...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard title="Mantenimientos completados" value={stats.totalLogs}           color="text-green-600"  bg="bg-white" accent="bg-green-500"  />
              <StatCard title="Fallas reportadas"          value={stats.incidentsReported}   color="text-orange-600" bg="bg-white" accent="bg-orange-500" />
              <StatCard title="Fallas resueltas"           value={stats.incidentsClosed}     color="text-blue-600"   bg="bg-white" accent="bg-blue-500"   />
              <StatCard title="Activos nuevos"             value={stats.newAssetsCount}      color="text-purple-600" bg="bg-white" accent="bg-purple-500" />
              <StatCard title="Tareas pendientes"          value={stats.tasksPending}        color="text-gray-600"   bg="bg-white" accent="bg-gray-400"   />
              <StatCard title="Tareas vencidas"            value={stats.tasksOverdue}        color="text-red-600"    bg="bg-white" accent="bg-red-500"    />
            </div>

            {stats.topAssets.length > 0 && (
              <div className="gmao-card">
                <div className="px-4 py-3 border-b border-border">
                  <h2 className="gmao-section-title">Activos con más fallas</h2>
                </div>
                <div className="divide-y divide-border">
                  {stats.topAssets.map((a, i) => (
                    <div key={a.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="gmao-mono text-muted-foreground w-4">{i + 1}</span>
                        <span className="text-sm font-medium text-foreground truncate">{a.name}</span>
                      </div>
                      <span className="font-display text-sm font-bold text-orange-600">{a.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
