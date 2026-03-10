import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { db } from '@/lib/db'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'

type TypeFilter = 'all' | 'mantenimiento' | 'falla'

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  mecanica: 'Mecánica',
  electrica: 'Eléctrica',
  neumatica: 'Neumática',
}

function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export default function HistoryPage() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [assetFilter, setAssetFilter] = useState('')
  const [areaFilter, setAreaFilter] = useState('')
  const [dateFrom, setDateFrom] = useState(() => toDateStr(subDays(new Date(), 30)))
  const [dateTo, setDateTo] = useState(() => toDateStr(new Date()))

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

      {/* Filters */}
      <div className="bg-white border-b border-border px-4 py-3 space-y-3">
        <div className="flex gap-2">
          {(['all', 'mantenimiento', 'falla'] as TypeFilter[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={cn('gmao-period-btn', typeFilter === t ? 'gmao-period-btn-active' : 'gmao-period-btn-inactive')}
            >
              {t === 'all' ? 'Todo' : t === 'mantenimiento' ? 'Mantenimiento' : 'Fallas'}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="gmao-input-sm flex-1">
            <option value="">Todas las áreas</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)} className="gmao-input-sm flex-1">
            <option value="">Todos los activos</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        <div className="flex gap-2 items-center">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="gmao-input-sm flex-1" />
          <span className="text-xs text-muted-foreground font-display">—</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="gmao-input-sm flex-1" />
        </div>
      </div>

      {/* List */}
      <div className="px-4 py-3 space-y-2">
        {data === undefined ? (
          <p className="text-center text-sm text-muted-foreground py-8">Cargando...</p>
        ) : entries.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Sin registros en el período seleccionado</p>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className={cn('gmao-card px-4 py-3', entry.kind === 'mantenimiento' ? 'strip-green' : 'strip-orange')}
            >
              <div className="flex items-start gap-3">
                <span className={cn(
                  'mt-0.5 flex-shrink-0 gmao-badge text-[9px]',
                  entry.kind === 'mantenimiento' ? 'gmao-badge-green' : 'gmao-badge-orange'
                )}>
                  {entry.kind === 'mantenimiento' ? 'MANT' : 'FALLA'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{entry.assetName}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.label}</p>
                  {entry.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 italic">{entry.notes}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="gmao-mono text-muted-foreground">
                      {format(new Date(entry.date.includes('T') ? entry.date : entry.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: es })}
                    </span>
                    {entry.areaName && <span className="text-[10px] text-muted-foreground/60">· {entry.areaName}</span>}
                    <span className="text-[10px] text-muted-foreground/60">· {entry.who}</span>
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
