import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { IncidentFormData } from '@/types'
import { AssetSelector } from '@/components/shared/AssetSelector'
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
  { value: 'neumatica', label: 'Neumática', color: 'border-blue-300 data-[active]:bg-blue-50 data-[active]:border-blue-500 data-[active]:text-blue-700' },
] as const

interface IncidentFormProps {
  initialValues?: Partial<IncidentFormData>
  onSubmit: (data: IncidentFormData) => Promise<void>
  isSubmitting: boolean
}

export function IncidentForm({ initialValues, onSubmit, isSubmitting }: IncidentFormProps) {
  const users = useLiveQuery(() => db.users.toArray())

  const {
    register,
    handleSubmit,
    control,
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-4 py-4">
      {/* Activo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Activo <span className="text-red-500">*</span>
        </label>
        <Controller
          control={control}
          name="asset_id"
          render={({ field }) => (
            <AssetSelector
              value={field.value}
              onChange={field.onChange}
              placeholder="Seleccionar activo..."
            />
          )}
        />
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
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Foto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Foto (opcional)
        </label>
        <Controller
          control={control}
          name="photo_url"
          render={({ field }) => (
            <ImagePicker
              value={field.value}
              onChange={field.onChange}
              onClear={() => field.onChange('')}
            />
          )}
        />
      </div>

      {/* Fecha */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
        <input
          {...register('reported_at')}
          type="date"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
