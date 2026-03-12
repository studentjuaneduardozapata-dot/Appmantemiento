import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, subDays, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { SlidersHorizontal, X, Wrench, AlertTriangle, User, MapPin, FileText, Calendar } from 'lucide-react'
import { db } from '@/lib/db'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetCloseButton,
  SheetBody,
} from '@/components/ui/sheet'

type TypeFilter = 'all' | 'mantenimiento' | 'falla'
type Period = '15d' | '1m' | 'custom'

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  mecanica: 'Mecánica',
  electrica: 'Eléctrica',
  neumatica: 'Neumática',
}

const INCIDENT_STATUS_LABELS: Record<string, string> = {
  abierta: 'Abierta',
  en_progreso: 'En progreso',
  cerrada: 'Cerrada',
}

function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

// ─── Detail Sheet ─────────────────────────────────────────────────────────────

interface Entry {
  id: string
  kind: 'mantenimiento' | 'falla'
  date: string
  assetName: string
  areaName: string
  who: string
  label: string
  notes?: string
  // extra detail fields
  planTitle?: string
  incidentStatus?: string
  incidentType?: string
  resolvedBy?: string
  resolutionTime?: string
  closedAt?: string
}

function DetailSheet({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  const isMaint = entry?.kind === 'mantenimiento'

  return (
    <Sheet open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" aria-label="Detalle del registro">
        <SheetHeader side="right">
          <div className="flex items-center justify-between">
            <SheetTitle>
              {isMaint ? 'Mantenimiento' : 'Falla'}
            </SheetTitle>
            <SheetCloseButton label="Cerrar detalle" />
          </div>
        </SheetHeader>

        <SheetBody>
          {entry && (
            <div className="px-4 py-5 space-y-5">
              {/* Asset + area */}
              <div>
                <p className="text-xl font-bold font-display text-foreground leading-tight">
                  {entry.assetName}
                </p>
                {entry.areaName && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">{entry.areaName}</p>
                  </div>
                )}
              </div>

              <div className="h-px bg-border" aria-hidden="true" />

              {/* Type badge + date */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'text-xs font-bold px-3 py-1 rounded-full',
                    isMaint
                      ? 'bg-green-100 text-green-800'
                      : 'bg-orange-100 text-orange-800'
                  )}
                >
                  {isMaint ? entry.planTitle ?? entry.label : INCIDENT_TYPE_LABELS[entry.incidentType ?? ''] ?? entry.label}
                </span>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{format(new Date(entry.date), "d 'de' MMMM yyyy", { locale: es })}</span>
                </div>
              </div>

              {/* Status (fallas only) */}
              {!isMaint && entry.incidentStatus && (
                <div className="flex items-center gap-2">
                  <span className="gmao-label">Estado</span>
                  <span
                    className={cn(
                      'text-xs font-semibold px-2.5 py-0.5 rounded-full',
                      entry.incidentStatus === 'abierta' ? 'bg-red-50 text-red-700' :
                      entry.incidentStatus === 'en_progreso' ? 'bg-amber-50 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    )}
                  >
                    {INCIDENT_STATUS_LABELS[entry.incidentStatus] ?? entry.incidentStatus}
                  </span>
                </div>
              )}

              {/* Who */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary/60 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {isMaint ? 'Completado por' : 'Reportado por'}
                  </p>
                  <p className="text-sm text-foreground mt-0.5">{entry.who || '—'}</p>
                </div>
              </div>

              {/* Resolved by (fallas cerradas) */}
              {!isMaint && entry.resolvedBy && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-4 h-4 text-green-700" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Resuelto por</p>
                    <p className="text-sm text-foreground mt-0.5">{entry.resolvedBy}</p>
                    {entry.resolutionTime && (
                      <p className="text-xs text-muted-foreground mt-0.5">Tiempo: {entry.resolutionTime}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {entry.notes && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {isMaint ? 'Notas' : 'Descripción'}
                    </p>
                  </div>
                  <p className="text-sm text-foreground bg-muted rounded-lg px-3 py-2.5 leading-relaxed">
                    {entry.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [period, setPeriod] = useState<Period>('1m')
  const [customFrom, setCustomFrom] = useState(() => toDateStr(subDays(new Date(), 30)))
  const [customTo, setCustomTo] = useState(() => toDateStr(new Date()))
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [assetFilter, setAssetFilter] = useState('')
  const [areaFilter, setAreaFilter] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)

  const dateFrom =
    period === '15d'
      ? toDateStr(subDays(new Date(), 15))
      : period === '1m'
        ? toDateStr(subMonths(new Date(), 1))
        : customFrom
  const dateTo = period === 'custom' ? customTo : toDateStr(new Date())

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useLiveQuery(async () => {
    const todayLocal = toDateStr(new Date())
    const [logs, allIncidents, tasks] = await Promise.all([
      db.maintenance_logs
        .where('completed_at')
        .between(dateFrom, dateTo + 'T99', true, true)
        .toArray(),
      db.incidents.filter((i) => !i.deleted_at).toArray(),
      db.maintenance_tasks.toArray(),
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
    return {
      totalLogs: logs.length,
      incidentsReported: incidentsInRange.length,
      incidentsClosed: incidentsClosed.length,
      tasksOverdue,
    }
  }, [dateFrom, dateTo])

  // ── Timeline data ──────────────────────────────────────────────────────────
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
      areaMap:  new Map(areas.map((a) => [a.id, a.name])),
      planMap:  new Map(plans.map((p) => [p.id, p.title])),
      logs,
      incidents,
    }
  }, [dateFrom, dateTo])

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
          planTitle: planMap.get(log.plan_id),
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
          incidentType: inc.type,
          incidentStatus: inc.status,
          notes: inc.description,
          resolvedBy: inc.resolved_by,
          resolutionTime: inc.resolution_time,
          closedAt: inc.closed_at,
        })
      }
    }

    result.sort((a, b) => b.date.localeCompare(a.date))
    return result
  }, [data, typeFilter, assetFilter, areaFilter])

  const areas = data?.areas ?? []
  const assets = data?.assets ?? []

  const activeFilterCount =
    (typeFilter !== 'all' ? 1 : 0) +
    (assetFilter ? 1 : 0) +
    (areaFilter ? 1 : 0)

  return (
    <div className="min-h-screen bg-background">

      {/* ── Inline header + period ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-background px-4 pt-4 pb-3">
        <div className="flex items-baseline justify-between mb-3">
          <h1 className="text-2xl font-bold font-display text-foreground">Historial</h1>
          <div className="flex gap-1.5">
            {(['15d', '1m', 'custom'] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
                style={{ touchAction: 'manipulation' }}
                className={cn(
                  'text-xs font-semibold px-3 py-1 rounded-full border',
                  'transition-colors duration-150',
                  period === p
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-muted-foreground border-border hover:border-foreground/30'
                )}
              >
                {p === '15d' ? '15d' : p === '1m' ? '1 mes' : 'Custom'}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date range */}
        {period === 'custom' && (
          <div className="flex gap-2 items-center mb-3">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              aria-label="Fecha desde"
              autoComplete="off"
              className="gmao-input-sm flex-1"
            />
            <span className="text-xs text-muted-foreground" aria-hidden="true">—</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              aria-label="Fecha hasta"
              autoComplete="off"
              className="gmao-input-sm flex-1"
            />
          </div>
        )}
      </div>

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      {stats !== undefined && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-4 gap-0 border border-border rounded-xl overflow-hidden">
            {[
              { value: stats.totalLogs,           label: 'Mant.',    color: 'text-green-600' },
              { value: stats.incidentsReported,   label: 'Fallas',   color: 'text-orange-500' },
              { value: stats.incidentsClosed,     label: 'Resueltas',color: 'text-blue-600' },
              { value: stats.tasksOverdue,        label: 'Vencidas', color: 'text-red-500' },
            ].map((s, i) => (
              <div
                key={i}
                className={cn(
                  'flex flex-col items-center py-3 px-1',
                  i < 3 && 'border-r border-border'
                )}
              >
                <span className={cn('text-xl font-bold tabular-nums gmao-stat-num', s.color)}
                  style={{ fontSize: '1.25rem' }}>
                  {s.value}
                </span>
                <span className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5 font-semibold"
                  style={{ fontFamily: "'Barlow Semi Condensed', sans-serif" }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2">
          {/* Type chips */}
          <div className="flex gap-1.5 flex-1">
            {(['all', 'mantenimiento', 'falla'] as TypeFilter[]).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={typeFilter === t}
                onClick={() => setTypeFilter(t)}
                style={{ touchAction: 'manipulation' }}
                className={cn(
                  'text-xs font-semibold px-3 py-1.5 rounded-full border',
                  'transition-colors duration-150',
                  typeFilter === t
                    ? t === 'mantenimiento'
                      ? 'bg-green-600 text-white border-green-600'
                      : t === 'falla'
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-foreground text-background border-foreground'
                    : 'bg-transparent text-muted-foreground border-border hover:border-foreground/30'
                )}
              >
                {t === 'all' ? 'Todo' : t === 'mantenimiento' ? 'Mant.' : 'Fallas'}
              </button>
            ))}
          </div>

          {/* Filters toggle */}
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-label={`Filtros${activeFilterCount > 0 ? ` (${activeFilterCount} activos)` : ''}`}
            style={{ touchAction: 'manipulation' }}
            className={cn(
              'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border',
              'transition-colors duration-150',
              filtersOpen || activeFilterCount > 0
                ? 'bg-accent border-border text-foreground'
                : 'bg-transparent text-muted-foreground border-border'
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Expandable filter selects */}
        {filtersOpen && (
          <div className="flex gap-2 mt-2.5">
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              aria-label="Filtrar por área"
              className="gmao-input-sm flex-1"
            >
              <option value="">Todas las áreas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <select
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              aria-label="Filtrar por activo"
              className="gmao-input-sm flex-1"
            >
              <option value="">Todos los activos</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Active filter pills */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {assetFilter && (
              <span className="inline-flex items-center gap-1 text-xs bg-accent text-foreground px-2 py-0.5 rounded-full">
                {assets.find((a) => a.id === assetFilter)?.name}
                <button
                  type="button"
                  onClick={() => setAssetFilter('')}
                  aria-label="Quitar filtro de activo"
                  style={{ touchAction: 'manipulation' }}
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </span>
            )}
            {areaFilter && (
              <span className="inline-flex items-center gap-1 text-xs bg-accent text-foreground px-2 py-0.5 rounded-full">
                {areas.find((a) => a.id === areaFilter)?.name}
                <button
                  type="button"
                  onClick={() => setAreaFilter('')}
                  aria-label="Quitar filtro de área"
                  style={{ touchAction: 'manipulation' }}
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Timeline ──────────────────────────────────────────────────────── */}
      <div className="pb-6">
        {data === undefined ? (
          <p className="text-center text-sm text-muted-foreground py-10">Cargando...</p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 px-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-1">
              {typeFilter === 'falla'
                ? <AlertTriangle className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
                : <Wrench className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
              }
            </div>
            <p className="text-sm font-medium text-foreground">Sin registros</p>
            <p className="text-xs text-muted-foreground">No hay actividad en el período seleccionado</p>
          </div>
        ) : (
          <div>
            {entries.map((entry, idx) => {
              const isMaint = entry.kind === 'mantenimiento'
              // Group by date: show date divider when date changes
              const dateKey = entry.date.slice(0, 10)
              const prevDateKey = idx > 0 ? entries[idx - 1].date.slice(0, 10) : null
              const showDateDivider = dateKey !== prevDateKey

              return (
                <div key={entry.id}>
                  {showDateDivider && (
                    <div className="px-4 pt-4 pb-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
                        style={{ fontFamily: "'Barlow Semi Condensed', sans-serif" }}>
                        {format(new Date(dateKey + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es })}
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedEntry(entry)}
                    style={{ touchAction: 'manipulation' }}
                    className={cn(
                      'w-full text-left flex items-stretch gap-0',
                      'px-4 py-3 border-b border-border/50',
                      'hover:bg-accent/40',
                      'transition-colors duration-100',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary'
                    )}
                    aria-label={`Ver detalle: ${entry.assetName}, ${isMaint ? 'mantenimiento' : 'falla'}, ${format(new Date(entry.date), 'dd/MM/yyyy')}`}
                  >
                    {/* Left color strip */}
                    <span
                      className="flex-shrink-0 w-0.5 rounded-full mr-3 self-stretch"
                      style={{
                        backgroundColor: isMaint ? '#16a34a' : '#f97316',
                        minHeight: '100%',
                      }}
                      aria-hidden="true"
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate flex-1">
                          {entry.assetName}
                        </p>
                        <span
                          className={cn(
                            'flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full',
                            isMaint
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          )}
                        >
                          {isMaint ? 'MANT' : 'FALLA'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {isMaint
                          ? entry.planTitle ?? entry.label
                          : INCIDENT_TYPE_LABELS[entry.incidentType ?? ''] ?? entry.label
                        }
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] text-muted-foreground gmao-mono">
                          {format(new Date(entry.date), 'HH:mm')}
                        </span>
                        {entry.areaName && (
                          <span className="text-[10px] text-muted-foreground">· {entry.areaName}</span>
                        )}
                        {entry.who && (
                          <span className="text-[10px] text-muted-foreground truncate">· {entry.who}</span>
                        )}
                      </div>
                    </div>

                    {/* Chevron hint */}
                    <span className="ml-2 flex-shrink-0 self-center text-border text-lg leading-none">›</span>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Detail Sheet ──────────────────────────────────────────────────── */}
      <DetailSheet entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </div>
  )
}
