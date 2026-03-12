import { useState, useMemo, useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Plus, Trash2, ChevronDown, ChevronUp, ListChecks, Loader2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { MaintenancePlanFormData, MaintenanceTaskFormData, MaintenanceTaskStepFormData } from '@/types'

// ─── Schema ────────────────────────────────────────────────────────────────────

const stepSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Requerido'),
  sort_order: z.number().int().min(0).default(0),
})

const taskSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Requerido'),
  frequency_days: z.coerce.number().int().min(1, 'Mínimo 1 día'),
  steps: z.array(stepSchema).optional().default([]),
})

const schema = z.object({
  title: z.string().min(1, 'Requerido'),
  description: z.string().optional(),
  type: z.enum(['unico', 'preventivo']),
  asset_ids: z.array(z.string()).min(1, 'Selecciona al menos un activo'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tasks: z.array(taskSchema).min(1, 'Agrega al menos una tarea'),
})

type PlanFormValues = MaintenancePlanFormData & {
  tasks: (MaintenanceTaskFormData & { steps: MaintenanceTaskStepFormData[] })[]
}

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface PlanFormInitialValues {
  plan: MaintenancePlanFormData
  tasks: (MaintenanceTaskFormData & { steps?: MaintenanceTaskStepFormData[] })[]
}

interface PlanFormProps {
  onSubmit: (plan: MaintenancePlanFormData, tasks: MaintenanceTaskFormData[]) => Promise<void>
  isSubmitting: boolean
  initialValues?: PlanFormInitialValues
  submitLabel?: string
  preselectedAssetId?: string
}

// ─── TaskStepsSection (sub-component) ─────────────────────────────────────────

interface TaskStepsSectionProps {
  taskIndex: number
  control: ReturnType<typeof useForm<PlanFormValues>>['control']
  register: ReturnType<typeof useForm<PlanFormValues>>['register']
}

function TaskStepsSection({ taskIndex, control, register }: TaskStepsSectionProps) {
  const [expanded, setExpanded] = useState(false)

  const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray<PlanFormValues>({
    control,
    name: `tasks.${taskIndex}.steps` as 'tasks.0.steps',
  })

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        <ListChecks className="w-3.5 h-3.5" />
        Sub-pasos ({stepFields.length})
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="mt-1.5 pl-2 border-l-2 border-border space-y-1.5">
          {stepFields.map((stepField, si) => (
            <div key={stepField.id} className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground w-4 text-right flex-shrink-0">{si + 1}.</span>
              <input
                {...register(`tasks.${taskIndex}.steps.${si}.description`)}
                placeholder="Descripción del sub-paso"
                className="gmao-input-sm flex-1 text-xs"
              />
              <button
                type="button"
                onClick={() => removeStep(si)}
                className="p-1 text-muted-foreground hover:text-destructive flex-shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => appendStep({ description: '', sort_order: stepFields.length })}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
          >
            <Plus className="w-3 h-3" />
            Añadir sub-paso
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function PlanForm({ onSubmit, isSubmitting, initialValues, submitLabel, preselectedAssetId }: PlanFormProps) {
  const assets = useLiveQuery(() => db.assets.filter((a) => !a.deleted_at).toArray())
  const areas = useLiveQuery(() => db.areas.orderBy('sort_order').filter((a) => !a.deleted_at).toArray())
  const allCategories = useLiveQuery(() => db.asset_categories.filter((c) => !c.deleted_at).toArray())

  const [filterAreaId, setFilterAreaId] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState('')

  // Pre-set area filter when arriving from an asset context
  useEffect(() => {
    if (!preselectedAssetId || !assets || filterAreaId) return
    const asset = assets.find((a) => a.id === preselectedAssetId)
    if (asset) {
      setFilterAreaId(asset.area_id)
    }
  }, [preselectedAssetId, assets])

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

  const todayIso = format(new Date(), 'yyyy-MM-dd')

  const defaultValues: PlanFormValues = initialValues
    ? {
        ...initialValues.plan,
        tasks: initialValues.tasks.map((t) => ({
          ...t,
          steps: t.steps ?? [],
        })),
      }
    : {
        title: '',
        description: '',
        type: 'preventivo',
        asset_ids: [],
        start_date: todayIso,
        tasks: [{ description: '', frequency_days: 7, steps: [] }],
      }

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
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

  const label = submitLabel ?? (initialValues ? 'Guardar cambios' : 'Crear plan')

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5 px-4 py-4">
      {/* Título */}
      <div>
        <label className="gmao-label">
          Título <span className="text-destructive">*</span>
        </label>
        <input
          {...register('title')}
          placeholder="Ej: Mantenimiento preventivo ensacadora"
          className="gmao-input"
        />
        {errors.title && (
          <p className="gmao-error">{errors.title.message}</p>
        )}
      </div>

      {/* Descripción */}
      <div>
        <label className="gmao-label">
          Descripción (opcional)
        </label>
        <textarea
          {...register('description')}
          rows={2}
          className="gmao-input resize-none"
        />
      </div>

      {/* Tipo */}
      <div>
        <label className="gmao-label mb-2">
          Tipo <span className="text-destructive">*</span>
        </label>
        <div className="flex gap-3">
          {([['preventivo', 'Preventivo (recurrente)'], ['unico', 'Único (una sola vez)']] as const).map(
            ([val, lbl]) => (
              <label key={val} className="flex-1 flex items-center gap-2 cursor-pointer">
                <input {...register('type')} type="radio" value={val} className="accent-primary" />
                <span className="text-sm text-foreground">{lbl}</span>
              </label>
            )
          )}
        </div>
      </div>

      {/* Fecha de inicio — solo al crear */}
      {!initialValues && (
        <div>
          <label className="gmao-label">
            Fecha del primer mantenimiento <span className="text-destructive">*</span>
          </label>
          <input
            {...register('start_date')}
            type="date"
            className="gmao-input"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Las tareas tendrán esta fecha como primera fecha de vencimiento
          </p>
        </div>
      )}

      {/* Activos asociados con cascada */}
      <div>
        <label className="gmao-label mb-2">
          Activos asociados <span className="text-destructive">*</span>
        </label>

        <div className="flex gap-2 mb-2">
          <select
            value={filterAreaId}
            onChange={(e) => handleAreaChange(e.target.value)}
            className="gmao-input-sm flex-1"
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
            className="gmao-input-sm flex-1"
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
            <div className="space-y-1 max-h-48 overflow-y-auto border border-border rounded-lg p-2">
              {visibleAssets.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Sin activos en esta selección
                </p>
              )}
              {visibleAssets.map((asset) => (
                <label
                  key={asset.id}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-accent/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedAssetIds.includes(asset.id)}
                    onChange={() => toggleAsset(asset.id, field.value, field.onChange)}
                    className="accent-primary"
                  />
                  <span className="text-sm text-foreground">{asset.name}</span>
                </label>
              ))}
            </div>
          )}
        />
        {errors.asset_ids && (
          <p className="gmao-error">{errors.asset_ids.message}</p>
        )}
        {selectedAssetIds.length > 0 && (
          <p className="text-xs text-primary mt-1">
            {selectedAssetIds.length} activo(s) seleccionado(s)
          </p>
        )}
      </div>

      {/* Tareas */}
      <div>
        <label className="gmao-label mb-2">
          Tareas <span className="text-destructive">*</span>
        </label>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1.5 border border-border/60 rounded-lg p-2.5">
                <input
                  {...register(`tasks.${index}.description`)}
                  placeholder="Descripción de la tarea"
                  className="gmao-input-sm w-full"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    Cada
                  </span>
                  <input
                    {...register(`tasks.${index}.frequency_days`)}
                    type="number"
                    min={1}
                    className="gmao-input-sm w-16 text-center"
                  />
                  <span className="text-xs text-muted-foreground">días</span>
                </div>
                {errors.tasks?.[index]?.description && (
                  <p className="gmao-error">
                    {errors.tasks[index]?.description?.message}
                  </p>
                )}
                <TaskStepsSection taskIndex={index} control={control} register={register} />
              </div>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="mt-1 p-1.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {errors.tasks?.root && (
          <p className="gmao-error mt-1">{errors.tasks.root.message}</p>
        )}
        <button
          type="button"
          onClick={() => append({ description: '', frequency_days: 7, steps: [] })}
          className="mt-2 flex items-center gap-1 text-sm text-primary hover:text-primary/80"
        >
          <Plus className="w-4 h-4" />
          Añadir tarea
        </button>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="gmao-btn-primary"
      >
        {isSubmitting
          ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1.5" aria-hidden="true" />Guardando…</>
          : label}
      </button>
    </form>
  )
}
