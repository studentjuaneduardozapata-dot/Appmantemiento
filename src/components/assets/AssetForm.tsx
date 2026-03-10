import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { AssetFormData } from '@/types'
import { ImagePicker } from '@/components/shared/ImagePicker'
import { SpecsEditor } from '@/components/shared/SpecsEditor'
import { AssetSelector } from '@/components/shared/AssetSelector'

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
  category_id: z.string().min(1, 'Requerido'),
  area_id: z.string().min(1, 'Requerido'),
  parent_asset_id: z.string().optional(),
  image_url: z.string().optional(),
  specs: z.array(z.object({ key: z.string(), value: z.string() })),
  status: z.enum(['operativo', 'en_mantenimiento', 'fuera_de_servicio']),
})

interface AssetFormProps {
  initialValues?: Partial<AssetFormData>
  onSubmit: (data: AssetFormData) => Promise<void>
  isSubmitting: boolean
  submitLabel?: string
  excludeAssetId?: string
}

export function AssetForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel = 'Guardar',
  excludeAssetId,
}: AssetFormProps) {
  const categories = useLiveQuery(() =>
    db.asset_categories.orderBy('sort_order').filter((c) => !c.deleted_at).toArray()
  )
  const areas = useLiveQuery(() => db.areas.orderBy('sort_order').filter((a) => !a.deleted_at).toArray())

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AssetFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialValues?.name ?? '',
      category_id: initialValues?.category_id ?? '',
      area_id: initialValues?.area_id ?? '',
      parent_asset_id: initialValues?.parent_asset_id ?? '',
      image_url: initialValues?.image_url ?? '',
      specs: initialValues?.specs ?? [],
      status: initialValues?.status ?? 'operativo',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-4 py-4">
      {/* Foto */}
      <div>
        <label className="gmao-label">Foto</label>
        <Controller
          control={control}
          name="image_url"
          render={({ field }) => (
            <ImagePicker
              value={field.value}
              onChange={field.onChange}
              onClear={() => field.onChange('')}
            />
          )}
        />
      </div>

      {/* Nombre */}
      <div>
        <label className="gmao-label">
          Nombre <span className="text-destructive">*</span>
        </label>
        <input
          {...register('name')}
          className="gmao-input"
          placeholder="Ej: Ensacadora 1"
        />
        {errors.name && (
          <p className="gmao-error">{errors.name.message}</p>
        )}
      </div>

      {/* Categoría */}
      <div>
        <label className="gmao-label">
          Categoría <span className="text-destructive">*</span>
        </label>
        <select
          {...register('category_id')}
          className="gmao-select"
        >
          <option value="">Seleccionar...</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.category_id && (
          <p className="gmao-error">{errors.category_id.message}</p>
        )}
      </div>

      {/* Área */}
      <div>
        <label className="gmao-label">
          Área <span className="text-destructive">*</span>
        </label>
        <select
          {...register('area_id')}
          className="gmao-select"
        >
          <option value="">Seleccionar...</option>
          {areas?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        {errors.area_id && (
          <p className="gmao-error">{errors.area_id.message}</p>
        )}
      </div>

      {/* Activo padre */}
      <div>
        <label className="gmao-label">
          Activo padre (opcional)
        </label>
        <Controller
          control={control}
          name="parent_asset_id"
          render={({ field }) => (
            <AssetSelector
              value={field.value ?? ''}
              onChange={field.onChange}
              placeholder="Sin activo padre"
              excludeId={excludeAssetId}
            />
          )}
        />
      </div>

      {/* Estado */}
      <div>
        <label className="gmao-label">Estado</label>
        <select
          {...register('status')}
          className="gmao-select"
        >
          <option value="operativo">Operativo</option>
          <option value="en_mantenimiento">En mantenimiento</option>
          <option value="fuera_de_servicio">Fuera de servicio</option>
        </select>
      </div>

      {/* Especificaciones */}
      <div>
        <label className="gmao-label mb-2">
          Especificaciones técnicas
        </label>
        <Controller
          control={control}
          name="specs"
          render={({ field }) => (
            <SpecsEditor value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="gmao-btn-primary"
      >
        {isSubmitting ? 'Guardando...' : submitLabel}
      </button>
    </form>
  )
}
