import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAsset, updateAsset } from '@/hooks/useAssets'
import { AssetForm } from '@/components/assets/AssetForm'
import type { AssetFormData } from '@/types'

export default function AssetEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const asset = useAsset(id!)

  if (asset === undefined) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-gray-400">Cargando...</p>
      </div>
    )
  }

  async function handleSubmit(data: AssetFormData) {
    setIsSubmitting(true)
    try {
      await updateAsset(id!, data)
      navigate(`/assets/${id}`, { replace: true })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card border-b-2 border-primary px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Volver"
          style={{ touchAction: 'manipulation' }}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-md"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <h1 className="text-base font-semibold font-display text-foreground">Editar activo</h1>
      </div>

      <AssetForm
        initialValues={{
          name: asset.name,
          category_id: asset.category_id,
          area_id: asset.area_id,
          parent_asset_id: asset.parent_asset_id,
          image_url: asset.image_url,
          specs: asset.specs,
          status: asset.status,
        }}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Guardar cambios"
        excludeAssetId={id}
      />
    </div>
  )
}
