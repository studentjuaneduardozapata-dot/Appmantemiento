import { useState, useMemo } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { MaintenancePlanFormData, MaintenanceTaskFormData } from '@/types'

const taskSchema = z.object({
  description: z.string().min(1, 'Requerido'),
  frequency_days: z.coerce.number().int().min(1, 'Mínimo 1 día'),
})

const schema = z.object({
  title: z.string().min(1, 'Requerido'),
  description: z.string().optional(),
  type: z.enum(['unico', 'preventivo']),
  asset_ids: z.array(z.string()).min(1, 'Selecciona al menos un activo'),
  tasks: z.array(taskSchema).min(1, 'Agrega al menos una tarea'),
})

type PlanFormValues = MaintenancePlanFormData & { tasks: MaintenanceTaskFormData[] }

interface PlanFormProps {
  onSubmit: (
    plan: MaintenancePlanFormData,
    tasks: MaintenanceTaskFormData[]
  ) => Promise<void>
  isSubmitting: boolean
}

export function PlanForm({ onSubmit, isSubmitting }: PlanFormProps) {
  const assets = useLiveQuery(() => db.assets.filter((a) => !a.deleted_at).toArray())
  const areas = useLiveQuery(() => db.areas.orderBy('sort_order').filter((a) => !a.deleted_at).toArray())
  const allCategories = useLiveQuery(() => db.asset_categories.filter((c) => !c.deleted_at).toArray())

  const [filterAreaId, setFilterAreaId] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState('')

  const availableCategories = useMemo(() => {
    if (!assets || !allCategories) return []
    const pool = filterAreaId ? assets.filter((a) => a.area_id === filterAreaId) : assets
    const catIds = new Set(pool.map((a) => a.category_id))
    return allCategories.filter((c) => catIds.has(c.id))
  }, [filterAreaId, assets, allCategories])

  const visibleAssets = useMemo(() => {
    if (!assets) return []
    return assets.filter((a) => {
      if (filterAreaId && a.area_id !== filterAreaId) return false
      if (filterCategoryId && a.category_id !== filterCategoryId) return false
      return true
    })
  }, [filterAreaId, filterCategoryId, assets])

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      type: 'preventivo',
      asset_ids: [],
      tasks: [{ description: '', frequency_days: 7 }],
    },
  })

  const { fields, append, remove } = useFieldArray<PlanFormValues, 'tasks'>({
    control,
    name: 'tasks',
  })

  const selectedAssetIds = watch('asset_ids')

  function toggleAsset(id: string, current: string[], onChange: (v: string[]) => void) {
    if (current.includes(id)) {
      onChange(current.filter((x) => x !== id))
    } else {
      onChange([...current, id])
    }
  }

  function handleAreaChange(areaId: string) {
    setFilterAreaId(areaId)
    setFilterCategoryId('')
  }

  async function handleFormSubmit(data: PlanFormValues) {
    const { tasks, ...planData } = data
    await onSubmit(planData, tasks)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5 px-4 py-4">
      {/* Título */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Título <span className="text-red-500">*</span>
        </label>
        <input
          {...register('title')}
          placeholder="Ej: Mantenimiento preventivo ensacadora"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {errors.title && (
          <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
        )}
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción (opcional)
        </label>
        <textarea
          {...register('description')}
          rows={2}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      {/* Tipo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-3">
          {([['preventivo', 'Preventivo (recurrente)'], ['unico', 'Único (una sola vez)']] as const).map(
            ([val, lbl]) => (
              <label key={val} className="flex-1 flex items-center gap-2 cursor-pointer">
                <input {...register('type')} type="radio" value={val} className="accent-primary" />
                <span className="text-sm text-gray-700">{lbl}</span>
              </label>
            )
          )}
        </div>
      </div>

      {/* Activos asociados con cascada */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Activos asociados <span className="text-red-500">*</span>
        </label>

        {/* Filtros Área / Categoría */}
        <div className="flex gap-2 mb-2">
          <select
            value={filterAreaId}
            onChange={(e) => handleAreaChange(e.target.value)}
            className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-card focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Todas las áreas</option>
            {areas?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-card focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Todas las categorías</option>
            {availableCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <Controller
          control={control}
          name="asset_ids"
          render={({ field }) => (
            <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {visibleAssets.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">
                  Sin activos en esta selección
                </p>
              )}
              {visibleAssets.map((asset) => (
                <label
                  key={asset.id}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedAssetIds.includes(asset.id)}
                    onChange={() => toggleAsset(asset.id, field.value, field.onChange)}
                    className="accent-primary"
                  />
                  <span className="text-sm text-gray-800">{asset.name}</span>
                </label>
              ))}
            </div>
          )}
        />
        {errors.asset_ids && (
          <p className="text-xs text-red-500 mt-1">{errors.asset_ids.message}</p>
        )}
        {selectedAssetIds.length > 0 && (
          <p className="text-xs text-primary mt-1">
            {selectedAssetIds.length} activo(s) seleccionado(s)
          </p>
        )}
      </div>

      {/* Tareas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tareas <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1.5">
                <input
                  {...register(`tasks.${index}.description`)}
                  placeholder="Descripción de la tarea"
                  className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    Cada
                  </span>
                  <input
                    {...register(`tasks.${index}.frequency_days`)}
                    type="number"
                    min={1}
                    className="w-16 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-center"
                  />
                  <span className="text-xs text-gray-500">días</span>
                </div>
                {errors.tasks?.[index]?.description && (
                  <p className="text-xs text-red-500">
                    {errors.tasks[index]?.description?.message}
                  </p>
                )}
              </div>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="mt-1 p-1.5 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {errors.tasks?.root && (
          <p className="text-xs text-red-500 mt-1">{errors.tasks.root.message}</p>
        )}
        <button
          type="button"
          onClick={() => append({ description: '', frequency_days: 7 })}
          className="mt-2 flex items-center gap-1 text-sm text-primary hover:text-primary/80"
        >
          <Plus className="w-4 h-4" />
          Añadir tarea
        </button>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
      >
        {isSubmitting ? 'Guardando...' : 'Crear plan'}
      </button>
    </form>
  )
}
