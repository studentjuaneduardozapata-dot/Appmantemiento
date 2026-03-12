import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { createAsset } from '@/hooks/useAssets'
import { AssetForm } from '@/components/assets/AssetForm'
import type { AssetFormData } from '@/types'

export default function AssetNewPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const parentId = searchParams.get('parent') ?? undefined
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(data: AssetFormData) {
    setIsSubmitting(true)
    try {
      const id = await createAsset(data)
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
        <h1 className="text-base font-semibold font-display text-foreground">Nuevo activo</h1>
      </div>

      <AssetForm
        initialValues={{ parent_asset_id: parentId }}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Crear activo"
      />
    </div>
  )
}
