import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Edit2, QrCode, Trash2, ArrowLeft, Tag, MapPin, Wrench, AlertTriangle, Plus, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { db } from '@/lib/db'
import { cn } from '@/lib/utils'
import { useAsset, softDeleteAsset, useAssetTrafficLight } from '@/hooks/useAssets'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { TrafficLight } from '@/components/shared/TrafficLight'
import { QRModal } from '@/components/assets/QRModal'
import { SubAssetsList } from '@/components/assets/SubAssetsList'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  operativo: { label: 'Operativo', className: 'bg-green-100 text-green-700' },
  en_mantenimiento: { label: 'En mantenimiento', className: 'bg-amber-100 text-amber-700' },
  fuera_de_servicio: { label: 'Fuera de servicio', className: 'bg-red-100 text-red-700' },
}

const PLAN_TYPE: Record<string, { label: string; className: string }> = {
  preventivo: { label: 'Preventivo', className: 'bg-blue-100 text-blue-700' },
  unico: { label: 'Único', className: 'bg-purple-100 text-purple-700' },
}

const INCIDENT_TYPE: Record<string, { label: string; className: string }> = {
  mecanica: { label: 'Mecánica', className: 'bg-orange-100 text-orange-700' },
  electrica: { label: 'Eléctrica', className: 'bg-yellow-100 text-yellow-700' },
  neumatica: { label: 'Neumática', className: 'bg-teal-100 text-teal-700' },
}

const INCIDENT_STATUS: Record<string, { label: string; className: string }> = {
  abierta: { label: 'Abierta', className: 'bg-red-100 text-red-700' },
  en_progreso: { label: 'En progreso', className: 'bg-amber-100 text-amber-700' },
  cerrada: { label: 'Cerrada', className: 'bg-green-100 text-green-700' },
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [qrOpen, setQrOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [imgOpen, setImgOpen] = useState(false)

  const asset = useAsset(id!)
  const light = useAssetTrafficLight(id!)
  const imageSrc = useObjectUrl(asset?.image_url)

  const area = useLiveQuery(
    () => (asset ? db.areas.get(asset.area_id) : undefined),
    [asset?.area_id]
  )
  const category = useLiveQuery(
    () => (asset ? db.asset_categories.get(asset.category_id) : undefined),
    [asset?.category_id]
  )

  // Plans linked to this asset
  const linkedPlans = useLiveQuery(
    async () => {
      if (!id) return [] as import('@/lib/db').MaintenancePlan[]
      const arr = await db.maintenance_plans
        .filter((p) => !p.deleted_at && p.asset_ids.includes(id))
        .toArray()
      return arr.sort((a, b) => a.title.localeCompare(b.title))
    },
    [id]
  )

  // Incident history for this asset
  const assetIncidents = useLiveQuery(
    () =>
      db.incidents
        .filter((i) => !i.deleted_at && i.asset_id === id!)
        .toArray()
        .then((arr) => arr.sort((a, b) => b.reported_at.localeCompare(a.reported_at))),
    [id]
  )

  if (asset === undefined) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (asset === null) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-muted-foreground">Activo no encontrado</p>
      </div>
    )
  }

  async function handleDelete() {
    await softDeleteAsset(id!)
    navigate('/assets', { replace: true })
  }

  const statusConfig = STATUS_CONFIG[asset.status] ?? { label: asset.status, className: 'bg-gray-100 text-gray-600' }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-1 -ml-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <TrafficLight status={light} />
          <h1 className="text-base font-semibold text-foreground truncate">
            {asset.name}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/assets/${id}/edit`)}
          className="p-1.5 text-muted-foreground hover:text-primary"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="p-1.5 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Foto cuadrada — clicable para lightbox */}
      {imageSrc && (
        <>
          <button
            type="button"
            onClick={() => setImgOpen(true)}
            className="bg-card mb-3 w-full block"
          >
            <img
              src={imageSrc}
              alt={asset.name}
              className="w-full aspect-square object-cover"
            />
          </button>

          {imgOpen && (
            <div
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
              onClick={() => setImgOpen(false)}
            >
              <img
                src={imageSrc}
                alt={asset.name}
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </>
      )}

      {/* Badges: Categoría, Área, Estado */}
      <div className="px-4 mt-3 flex flex-wrap gap-2">
        {category && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
            <Tag className="w-3.5 h-3.5" />
            {category.name}
          </span>
        )}
        {area && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-medium">
            <MapPin className="w-3.5 h-3.5" />
            {area.name}
          </span>
        )}
        <span className={cn('inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium', statusConfig.className)}>
          {statusConfig.label}
        </span>
      </div>

      {/* Specs */}
      {asset.specs.length > 0 && (
        <div className="mx-4 mt-4">
          <h2 className="gmao-section-title mb-2 px-1">Especificaciones técnicas</h2>
          <div className="bg-card rounded-lg border border-border divide-y divide-border">
            {asset.specs.map((s, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-muted-foreground">{s.key}</span>
                <span className="text-sm font-medium text-foreground text-right max-w-[60%]">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR */}
      <div className="mx-4 mt-4">
        <button
          type="button"
          onClick={() => setQrOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-card border border-border rounded-lg text-sm font-medium text-primary hover:bg-accent/50"
        >
          <QrCode className="w-4 h-4" />
          Ver código QR
        </button>
      </div>

      {/* Sub-activos */}
      <div className="mt-4">
        <SubAssetsList parentId={id!} />
      </div>

      {/* Planes de Mantenimiento */}
      <div className="mx-4 mt-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="gmao-section-title flex items-center gap-1.5">
            <Wrench className="w-4 h-4" />
            Planes de Mantenimiento
          </h2>
          <button
            type="button"
            onClick={() => navigate(`/schedule/new-plan?assetId=${id}`)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
          >
            <Plus className="w-3.5 h-3.5" />
            Añadir plan
          </button>
        </div>
        {!linkedPlans || linkedPlans.length === 0 ? (
          <div className="bg-card rounded-lg border border-border px-4 py-4 text-center">
            <p className="text-sm text-muted-foreground">Sin planes asociados</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border divide-y divide-border">
            {linkedPlans.map((plan) => {
              const pt = PLAN_TYPE[plan.type] ?? PLAN_TYPE.preventivo
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => navigate(`/schedule/plan/${plan.id}`)}
                  className="w-full flex items-center justify-between px-4 py-3 gap-3 text-left hover:bg-accent/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{plan.title}</p>
                    {plan.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{plan.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', pt.className)}>
                      {pt.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Historial de Fallas */}
      <div className="mx-4 mt-4 mb-8">
        <h2 className="gmao-section-title mb-2 px-1 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4" />
          Historial de Fallas
        </h2>
        {!assetIncidents || assetIncidents.length === 0 ? (
          <div className="bg-card rounded-lg border border-border px-4 py-4 text-center">
            <p className="text-sm text-muted-foreground">Sin fallas registradas</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border divide-y divide-border">
            {assetIncidents.map((incident) => {
              const it = INCIDENT_TYPE[incident.type]
              const is = INCIDENT_STATUS[incident.status]
              return (
                <button
                  key={incident.id}
                  type="button"
                  onClick={() => navigate(`/incidents/${incident.id}`)}
                  className="w-full flex items-start justify-between px-4 py-3 gap-3 text-left hover:bg-accent/50"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {it && (
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', it.className)}>
                          {it.label}
                        </span>
                      )}
                      {is && (
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', is.className)}>
                          {is.label}
                        </span>
                      )}
                    </div>
                    {incident.description && (
                      <p className="text-xs text-muted-foreground truncate">{incident.description}</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
                    {format(new Date(incident.reported_at), 'dd MMM yyyy', { locale: es })}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <QRModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        assetId={asset.id}
        assetName={asset.name}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar activo"
        description={`¿Eliminar "${asset.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}
