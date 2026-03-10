import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Edit2, QrCode, Trash2, ArrowLeft } from 'lucide-react'
import { db } from '@/lib/db'
import { useAsset, softDeleteAsset, useAssetTrafficLight } from '@/hooks/useAssets'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { TrafficLight } from '@/components/shared/TrafficLight'
import { QRModal } from '@/components/assets/QRModal'
import { SubAssetsList } from '@/components/assets/SubAssetsList'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

const STATUS_LABELS: Record<string, string> = {
  operativo: 'Operativo',
  en_mantenimiento: 'En mantenimiento',
  fuera_de_servicio: 'Fuera de servicio',
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [qrOpen, setQrOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

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

      {/* Foto */}
      {imageSrc && (
        <div className="bg-card mb-3">
          <img
            src={imageSrc}
            alt={asset.name}
            className="w-full max-h-48 object-cover"
          />
        </div>
      )}

      {/* Info */}
      <div className="bg-card mx-4 mt-3 rounded-lg border border-border divide-y divide-border">
        <Row label="Categoría" value={category?.name ?? '—'} />
        <Row label="Área" value={area?.name ?? '—'} />
        <Row label="Estado" value={STATUS_LABELS[asset.status] ?? asset.status} />
      </div>

      {/* Specs */}
      {asset.specs.length > 0 && (
        <div className="mx-4 mt-3">
          <h2 className="gmao-section-title mb-2 px-1">
            Especificaciones técnicas
          </h2>
          <div className="bg-card rounded-lg border border-border divide-y divide-border">
            {asset.specs.map((s, i) => (
              <Row key={i} label={s.key} value={s.value} />
            ))}
          </div>
        </div>
      )}

      {/* QR */}
      <div className="mx-4 mt-3">
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
      <div className="mt-4 mb-8">
        <SubAssetsList parentId={id!} />
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right max-w-[60%]">
        {value}
      </span>
    </div>
  )
}
