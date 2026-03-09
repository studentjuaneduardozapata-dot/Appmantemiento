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
      db.areas.orderBy('sort_order').toArray(),
      db.maintenance_plans.toArray(),
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
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Historial" />

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-3">
        {/* Type filter */}
        <div className="flex gap-2">
          {(['all', 'mantenimiento', 'falla'] as TypeFilter[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={cn(
                'flex-1 text-xs font-medium py-1.5 rounded-lg border transition-colors',
                typeFilter === t
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              )}
            >
              {t === 'all' ? 'Todo' : t === 'mantenimiento' ? 'Mantenimiento' : 'Fallas'}
            </button>
          ))}
        </div>

        {/* Area + asset selects */}
        <div className="flex gap-2">
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700"
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
            className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700"
          >
            <option value="">Todos los activos</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700"
          />
          <span className="text-xs text-gray-400">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700"
          />
        </div>
      </div>

      {/* List */}
      <div className="px-4 py-3 space-y-2">
        {data === undefined ? (
          <p className="text-center text-sm text-gray-400 py-8">Cargando...</p>
        ) : entries.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">
            Sin registros en el período seleccionado
          </p>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white rounded-xl border border-gray-200 px-4 py-3"
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
                  <p className="text-sm font-medium text-gray-900 truncate">{entry.assetName}</p>
                  <p className="text-xs text-gray-500 truncate">{entry.label}</p>
                  {entry.notes && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{entry.notes}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] text-gray-400">
                      {format(
                        new Date(
                          entry.date.includes('T') ? entry.date : entry.date + 'T00:00:00'
                        ),
                        'dd/MM/yyyy',
                        { locale: es }
                      )}
                    </span>
                    {entry.areaName && (
                      <span className="text-[10px] text-gray-400">· {entry.areaName}</span>
                    )}
                    <span className="text-[10px] text-gray-400">· {entry.who}</span>
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
