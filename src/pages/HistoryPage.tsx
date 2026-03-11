import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, subDays, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { db } from '@/lib/db'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'

type TypeFilter = 'all' | 'mantenimiento' | 'falla'
type Period = '15d' | '1m' | 'custom'

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  mecanica: 'Mecánica',
  electrica: 'Eléctrica',
  neumatica: 'Neumática',
}

function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function StatCard({ title, value, color, bg }: { title: string; value: number; color: string; bg: string }) {
  return (
    <div className={cn('rounded-xl p-3 border border-border', bg)}>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{title}</p>
    </div>
  )
}

export default function HistoryPage() {
  const [period, setPeriod] = useState<Period>('1m')
  const [customFrom, setCustomFrom] = useState(() => toDateStr(subDays(new Date(), 30)))
  const [customTo, setCustomTo] = useState(() => toDateStr(new Date()))

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [assetFilter, setAssetFilter] = useState('')
  const [areaFilter, setAreaFilter] = useState('')

  const dateFrom =
    period === '15d'
      ? toDateStr(subDays(new Date(), 15))
      : period === '1m'
        ? toDateStr(subMonths(new Date(), 1))
        : customFrom
  const dateTo = period === 'custom' ? customTo : toDateStr(new Date())

  // ── Summary stats ────────────────────────────────────────────────────────────
  const stats = useLiveQuery(async () => {
    const todayLocal = toDateStr(new Date())
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
    const incidentsClosed = allIncidents.filter(
      (i) =>
        i.status === 'cerrada' &&
        i.closed_at &&
        i.closed_at >= dateFrom &&
        i.closed_at <= dateTo + 'T99'
    )
    const tasksOverdue = tasks.filter(
      (t) => t.status === 'pendiente' && t.next_due_date < todayLocal
    ).length
    const incidentsByAsset = new Map<string, number>()
    for (const inc of incidentsInRange) {
      incidentsByAsset.set(inc.asset_id, (incidentsByAsset.get(inc.asset_id) ?? 0) + 1)
    }
    const assetNameMap = new Map(assets.map((a) => [a.id, a.name]))
    const topAssets = [...incidentsByAsset.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, count]) => ({ id, name: assetNameMap.get(id) ?? '?', count }))
    return {
      totalLogs: logs.length,
      incidentsReported: incidentsInRange.length,
      incidentsClosed: incidentsClosed.length,
      tasksOverdue,
      topAssets,
    }
  }, [dateFrom, dateTo])

  // ── History timeline ─────────────────────────────────────────────────────────
  const data = useLiveQuery(async () => {
    const [assets, areas, plans, logs, incidents] = await Promise.all([
      db.assets.filter((a) => !a.deleted_at).toArray(),
      db.areas.orderBy('sort_order').filter((a) => !a.deleted_at).toArray(),
      db.maintenance_plans.filter((p) => !p.deleted_at).toArray(),
      db.maintenance_logs
        .where('completed_at')
        .between(dateFrom, dateTo + 'T99', true, true)
        .toArray(),
      db.incidents
        .where('reported_at')
        .between(dateFrom, dateTo, true, true)
        .filter((i) => !i.deleted_at)
        .toArray(),
    ])
    return {
      assets,
      areas,
      assetMap: new Map(assets.map((a) => [a.id, a])),
      areaMap: new Map(areas.map((a) => [a.id, a.name])),
      planMap: new Map(plans.map((p) => [p.id, p.title])),
      logs,
      incidents,
    }
  }, [dateFrom, dateTo])

  type Entry = {
    id: string
    kind: 'mantenimiento' | 'falla'
    date: string
    assetName: string
    areaName: string
    who: string
    label: string
    notes?: string
  }

  const entries = useMemo((): Entry[] => {
    if (!data) return []
    const { assetMap, areaMap, planMap, logs, incidents } = data
    const result: Entry[] = []

    if (typeFilter !== 'falla') {
      for (const log of logs) {
        const asset = assetMap.get(log.asset_id)
        if (assetFilter && log.asset_id !== assetFilter) continue
        if (areaFilter && asset?.area_id !== areaFilter) continue
        result.push({
          id: log.id,
          kind: 'mantenimiento',
          date: log.completed_at,
          assetName: asset?.name ?? 'Activo desconocido',
          areaName: asset ? (areaMap.get(asset.area_id) ?? '') : '',
          who: log.completed_by,
          label: planMap.get(log.plan_id) ?? 'Plan desconocido',
          notes: log.notes,
        })
      }
    }

    if (typeFilter !== 'mantenimiento') {
      for (const inc of incidents) {
        const asset = assetMap.get(inc.asset_id)
        if (assetFilter && inc.asset_id !== assetFilter) continue
        if (areaFilter && asset?.area_id !== areaFilter) continue
        result.push({
          id: inc.id,
          kind: 'falla',
          date: inc.reported_at,
          assetName: asset?.name ?? 'Activo desconocido',
          areaName: asset ? (areaMap.get(asset.area_id) ?? '') : '',
          who: inc.reported_by,
          label: INCIDENT_TYPE_LABELS[inc.type] ?? inc.type,
          notes: inc.description,
        })
      }
    }

    result.sort((a, b) => b.date.localeCompare(a.date))
    return result
  }, [data, typeFilter, assetFilter, areaFilter])

  const areas = data?.areas ?? []
  const assets = data?.assets ?? []

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Historial" />

      {/* ── Period selector ───────────────────────────────────────────────── */}
      <div className="bg-card border-b border-border px-4 py-3 space-y-2">
        <div className="flex gap-2">
          {(['15d', '1m', 'custom'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                'flex-1 text-xs font-medium py-1.5 rounded-lg border transition-colors',
                period === p
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:bg-accent/50'
              )}
            >
              {p === '15d' ? '15 días' : p === '1m' ? '1 mes' : 'Personalizado'}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="gmao-input-sm flex-1"
            />
            <span className="text-xs text-muted-foreground">—</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="gmao-input-sm flex-1"
            />
          </div>
        )}
      </div>

      {/* ── Summary stats ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-2 space-y-3">
        {stats === undefined ? (
          <p className="text-center text-sm text-muted-foreground py-4">Cargando...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                title="Mantenimientos completados"
                value={stats.totalLogs}
                color="text-green-600"
                bg="bg-green-50"
              />
              <StatCard
                title="Fallas reportadas"
                value={stats.incidentsReported}
                color="text-orange-600"
                bg="bg-orange-50"
              />
              <StatCard
                title="Fallas resueltas"
                value={stats.incidentsClosed}
                color="text-blue-600"
                bg="bg-blue-50"
              />
              <StatCard
                title="Tareas vencidas"
                value={stats.tasksOverdue}
                color="text-red-600"
                bg="bg-red-50"
              />
            </div>

            {stats.topAssets.length > 0 && (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border">
                  <h2 className="gmao-section-title">Activos con más fallas</h2>
                </div>
                <div className="divide-y divide-border">
                  {stats.topAssets.map((a, i) => (
                    <div key={a.id} className="flex items-center justify-between px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                        <span className="text-sm text-foreground truncate">{a.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-orange-600">{a.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Timeline filters ──────────────────────────────────────────────── */}
      <div className="bg-card border-y border-border px-4 py-3 space-y-3">
        <div className="flex gap-2">
          {(['all', 'mantenimiento', 'falla'] as TypeFilter[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={cn(
                'flex-1 text-xs font-medium py-1.5 rounded-lg border transition-colors',
                typeFilter === t
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:bg-accent/50'
              )}
            >
              {t === 'all' ? 'Todo' : t === 'mantenimiento' ? 'Mantenimiento' : 'Fallas'}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="gmao-input-sm flex-1"
          >
            <option value="">Todas las áreas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            value={assetFilter}
            onChange={(e) => setAssetFilter(e.target.value)}
            className="gmao-input-sm flex-1"
          >
            <option value="">Todos los activos</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Timeline list ─────────────────────────────────────────────────── */}
      <div className="px-4 py-3 space-y-2">
        {data === undefined ? (
          <p className="text-center text-sm text-muted-foreground py-8">Cargando...</p>
        ) : entries.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Sin registros en el período seleccionado
          </p>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-card rounded-xl border border-border px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'mt-0.5 flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full',
                    entry.kind === 'mantenimiento'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-orange-100 text-orange-700'
                  )}
                >
                  {entry.kind === 'mantenimiento' ? 'MANT' : 'FALLA'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{entry.assetName}</p>
                  <p className="text-xs text-muted-foreground truncate">{entry.label}</p>
                  {entry.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{entry.notes}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(entry.date), 'dd/MM/yyyy', { locale: es })}
                    </span>
                    {entry.areaName && (
                      <span className="text-[10px] text-muted-foreground">· {entry.areaName}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground">· {entry.who}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
