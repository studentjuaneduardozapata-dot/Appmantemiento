import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { IncidentFormData } from '@/types'
import { ImagePicker } from '@/components/shared/ImagePicker'
import { cn } from '@/lib/utils'

const schema = z.object({
  asset_id: z.string().min(1, 'Selecciona un activo'),
  type: z.enum(['mecanica', 'electrica', 'neumatica']),
  reported_by: z.string().min(1, 'Selecciona quién reporta'),
  description: z.string().optional(),
  photo_url: z.string().optional(),
  reported_at: z.string().min(1),
})

const TYPES = [
  { value: 'mecanica', label: 'Mecánica', color: 'border-orange-300 data-[active]:bg-orange-50 data-[active]:border-orange-500 data-[active]:text-orange-700' },
  { value: 'electrica', label: 'Eléctrica', color: 'border-yellow-300 data-[active]:bg-yellow-50 data-[active]:border-yellow-500 data-[active]:text-yellow-700' },
  { value: 'neumatica', label: 'Neumática', color: 'border-teal-300 data-[active]:bg-teal-50 data-[active]:border-teal-500 data-[active]:text-teal-700' },
] as const

interface IncidentFormProps {
  initialValues?: Partial<IncidentFormData>
  onSubmit: (data: IncidentFormData) => Promise<void>
  isSubmitting: boolean
}

export function IncidentForm({ initialValues, onSubmit, isSubmitting }: IncidentFormProps) {
  const users = useLiveQuery(() => db.users.filter((u) => !u.deleted_at).toArray())
  const areas = useLiveQuery(() => db.areas.orderBy('sort_order').filter((a) => !a.deleted_at).toArray())
  const allAssets = useLiveQuery(() => db.assets.filter((a) => !a.deleted_at).toArray())
  const allCategories = useLiveQuery(() => db.asset_categories.filter((c) => !c.deleted_at).toArray())

  const [filterAreaId, setFilterAreaId] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState('')

  const availableCategories = useMemo(() => {
    if (!allAssets || !allCategories) return []
    const pool = filterAreaId ? allAssets.filter((a) => a.area_id === filterAreaId) : allAssets
    const catIds = new Set(pool.map((a) => a.category_id))
    return allCategories.filter((c) => catIds.has(c.id))
  }, [filterAreaId, allAssets, allCategories])

  const filteredAssets = useMemo(() => {
    if (!allAssets) return []
    return allAssets.filter((a) => {
      if (filterAreaId && a.area_id !== filterAreaId) return false
      if (filterCategoryId && a.category_id !== filterCategoryId) return false
      return true
    })
  }, [filterAreaId, filterCategoryId, allAssets])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<IncidentFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      asset_id: initialValues?.asset_id ?? '',
      type: initialValues?.type ?? 'mecanica',
      reported_by: initialValues?.reported_by ?? '',
      description: initialValues?.description ?? '',
      photo_url: initialValues?.photo_url ?? '',
      reported_at: initialValues?.reported_at ?? format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const selectedType = watch('type')

  function handleAreaChange(areaId: string) {
    setFilterAreaId(areaId)
    setFilterCategoryId('')
    setValue('asset_id', '')
  }

  function handleCategoryChange(catId: string) {
    setFilterCategoryId(catId)
    setValue('asset_id', '')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-4 py-4">
      {/* Área (filtro) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
        <select
          value={filterAreaId}
          onChange={(e) => handleAreaChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todas las áreas</option>
          {areas?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* Categoría (filtro) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
        <select
          value={filterCategoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todas las categorías</option>
          {availableCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Activo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Activo <span className="text-red-500">*</span>
        </label>
        <select
          {...register('asset_id')}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Seleccionar activo...</option>
          {filteredAssets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        {errors.asset_id && (
          <p className="text-xs text-red-500 mt-1">{errors.asset_id.message}</p>
        )}
      </div>

      {/* Tipo de falla */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de falla <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              data-active={selectedType === t.value ? '' : undefined}
              onClick={() => setValue('type', t.value)}
              className={cn(
                'py-3 text-sm font-medium border-2 rounded-lg transition-colors text-gray-600',
                t.color,
                selectedType === t.value && 'ring-0'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quién reporta */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Quién reporta <span className="text-red-500">*</span>
        </label>
        {users && users.length > 0 ? (
          <select
            {...register('reported_by')}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Seleccionar...</option>
            {users.map((u) => (
              <option key={u.id} value={u.name}>
                {u.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            {...register('reported_by')}
            placeholder="Nombre de quien reporta"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        )}
        {errors.reported_by && (
          <p className="text-xs text-red-500 mt-1">{errors.reported_by.message}</p>
        )}
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción (opcional)
        </label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Describe brevemente la falla..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      {/* Foto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Foto (opcional)
        </label>
        <ImagePicker
          value={watch('photo_url')}
          onChange={(v) => setValue('photo_url', v)}
          onClear={() => setValue('photo_url', '')}
        />
      </div>

      {/* Fecha */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
        <input
          {...register('reported_at')}
          type="date"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Guardando...' : 'Reportar falla'}
      </button>
    </form>
  )
}
