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
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-1 -ml-1 text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-gray-900">Nuevo activo</h1>
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
