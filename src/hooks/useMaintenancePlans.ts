import { useLiveQuery } from 'dexie-react-hooks'
import { format, addDays } from 'date-fns'
import { toast } from 'sonner'
import { db, generateId } from '@/lib/db'
import type { MaintenancePlan, MaintenanceTask, MaintenanceTaskStep } from '@/lib/db'
import type { MaintenancePlanFormData, MaintenanceTaskFormData, MaintenanceTaskStepFormData } from '@/types'
import { enqueue } from '@/lib/sync/syncQueue'

// ─── Reads ─────────────────────────────────────────────────────────────────────

export function useMaintenancePlans(): MaintenancePlan[] | undefined {
  return useLiveQuery(() =>
    db.maintenance_plans
      .filter((p) => !p.deleted_at)
      .toArray()
  )
}

export function useMaintenancePlan(id: string): MaintenancePlan | undefined {
  return useLiveQuery(() => db.maintenance_plans.get(id), [id])
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

async function insertSteps(
  taskId: string,
  steps: MaintenanceTaskStepFormData[],
  now: string
): Promise<void> {
  for (let i = 0; i < steps.length; i++) {
    const step: MaintenanceTaskStep = {
      id: generateId(),
      task_id: taskId,
      description: steps[i].description,
      sort_order: i,
      created_at: now,
      updated_at: now,
      _synced: false,
    }
    await db.task_steps.add(step)
    await enqueue('task_steps', 'insert', step as unknown as Record<string, unknown>)
  }
}

async function reconcileSteps(
  taskId: string,
  formSteps: MaintenanceTaskStepFormData[],
  now: string
): Promise<void> {
  const currentSteps = await db.task_steps
    .where('task_id')
    .equals(taskId)
    .filter((s) => !s.deleted_at)
    .toArray()

  const keptIds = new Set(formSteps.filter((s) => s.id).map((s) => s.id!))

  for (const s of currentSteps) {
    if (!keptIds.has(s.id)) {
      await db.task_steps.update(s.id, { deleted_at: now, _synced: false })
      await enqueue('task_steps', 'delete', { id: s.id })
    }
  }

  for (let i = 0; i < formSteps.length; i++) {
    const fs = formSteps[i]
    if (fs.id) {
      await db.task_steps.update(fs.id, {
        description: fs.description,
        sort_order: i,
        updated_at: now,
        _synced: false,
      })
      const updated = await db.task_steps.get(fs.id)
      if (updated) {
        await enqueue('task_steps', 'update', updated as unknown as Record<string, unknown>)
      }
    } else {
      const step: MaintenanceTaskStep = {
        id: generateId(),
        task_id: taskId,
        description: fs.description,
        sort_order: i,
        created_at: now,
        updated_at: now,
        _synced: false,
      }
      await db.task_steps.add(step)
      await enqueue('task_steps', 'insert', step as unknown as Record<string, unknown>)
    }
  }
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

export async function createMaintenancePlan(
  planData: MaintenancePlanFormData,
  tasks: MaintenanceTaskFormData[]
): Promise<string> {
  const planId = generateId()
  const now = new Date().toISOString()

  const plan: MaintenancePlan = {
    id: planId,
    title: planData.title,
    description: planData.description,
    asset_ids: planData.asset_ids,
    type: planData.type,
    created_at: now,
    updated_at: now,
    _synced: false,
  }

  try {
    await db.transaction(
      'rw',
      [db.maintenance_plans, db.maintenance_tasks, db.task_steps, db.sync_queue],
      async () => {
        await db.maintenance_plans.add(plan)
        await enqueue('maintenance_plans', 'insert', plan as unknown as Record<string, unknown>)

        for (const taskData of tasks) {
          const taskId = generateId()
          const nextDue = format(
            addDays(new Date(), Math.max(taskData.frequency_days, 1)),
            'yyyy-MM-dd'
          )
          const task: MaintenanceTask = {
            id: taskId,
            plan_id: planId,
            description: taskData.description,
            frequency_days: taskData.frequency_days,
            next_due_date: nextDue,
            status: 'pendiente',
            created_at: now,
            updated_at: now,
            _synced: false,
          }
          await db.maintenance_tasks.add(task)
          await enqueue(
            'maintenance_tasks',
            'insert',
            task as unknown as Record<string, unknown>
          )
          if (taskData.steps && taskData.steps.length > 0) {
            await insertSteps(taskId, taskData.steps, now)
          }
        }
      }
    )
    toast.success('Plan de mantenimiento creado')
    return planId
  } catch (err) {
    toast.error('Error al crear el plan de mantenimiento')
    throw err
  }
}

export async function updateMaintenancePlan(
  planId: string,
  planData: MaintenancePlanFormData,
  tasks: MaintenanceTaskFormData[]
): Promise<void> {
  const now = new Date().toISOString()

  try {
    const currentTasks = await db.maintenance_tasks
      .where('plan_id')
      .equals(planId)
      .filter((t) => !t.deleted_at)
      .toArray()

    const keptTaskIds = new Set(tasks.filter((t) => t.id).map((t) => t.id!))

    await db.transaction(
      'rw',
      [db.maintenance_plans, db.maintenance_tasks, db.task_steps, db.sync_queue],
      async () => {
        // Update plan metadata
        await db.maintenance_plans.update(planId, {
          title: planData.title,
          description: planData.description,
          asset_ids: planData.asset_ids,
          type: planData.type,
          updated_at: now,
          _synced: false,
        })
        const updatedPlan = await db.maintenance_plans.get(planId)
        if (updatedPlan) {
          await enqueue('maintenance_plans', 'update', updatedPlan as unknown as Record<string, unknown>)
        }

        // Soft-delete removed tasks and their steps
        for (const existing of currentTasks) {
          if (!keptTaskIds.has(existing.id)) {
            await db.maintenance_tasks.update(existing.id, { deleted_at: now, _synced: false })
            await enqueue('maintenance_tasks', 'delete', { id: existing.id })

            const orphanSteps = await db.task_steps
              .where('task_id')
              .equals(existing.id)
              .filter((s) => !s.deleted_at)
              .toArray()
            for (const s of orphanSteps) {
              await db.task_steps.update(s.id, { deleted_at: now, _synced: false })
              await enqueue('task_steps', 'delete', { id: s.id })
            }
          }
        }

        // Update existing tasks or insert new ones
        for (const taskData of tasks) {
          if (taskData.id) {
            await db.maintenance_tasks.update(taskData.id, {
              description: taskData.description,
              frequency_days: taskData.frequency_days,
              updated_at: now,
              _synced: false,
            })
            const updatedTask = await db.maintenance_tasks.get(taskData.id)
            if (updatedTask) {
              await enqueue('maintenance_tasks', 'update', updatedTask as unknown as Record<string, unknown>)
            }
            await reconcileSteps(taskData.id, taskData.steps ?? [], now)
          } else {
            const taskId = generateId()
            const nextDue = format(
              addDays(new Date(), Math.max(taskData.frequency_days, 1)),
              'yyyy-MM-dd'
            )
            const task: MaintenanceTask = {
              id: taskId,
              plan_id: planId,
              description: taskData.description,
              frequency_days: taskData.frequency_days,
              next_due_date: nextDue,
              status: 'pendiente',
              created_at: now,
              updated_at: now,
              _synced: false,
            }
            await db.maintenance_tasks.add(task)
            await enqueue('maintenance_tasks', 'insert', task as unknown as Record<string, unknown>)
            if (taskData.steps && taskData.steps.length > 0) {
              await insertSteps(taskId, taskData.steps, now)
            }
          }
        }
      }
    )
    toast.success('Plan actualizado')
  } catch (err) {
    toast.error('Error al actualizar el plan')
    throw err
  }
}

export async function deleteMaintenancePlan(id: string): Promise<void> {
  const now = new Date().toISOString()
  const tasks = await db.maintenance_tasks.where('plan_id').equals(id).toArray()
  try {
    await db.transaction(
      'rw',
      [db.maintenance_plans, db.maintenance_tasks, db.sync_queue],
      async () => {
        for (const task of tasks) {
          await db.maintenance_tasks.update(task.id, { deleted_at: now, _synced: false })
          await enqueue('maintenance_tasks', 'delete', { id: task.id })
        }
        await db.maintenance_plans.update(id, { deleted_at: now, _synced: false })
        await enqueue('maintenance_plans', 'delete', { id })
      }
    )
    toast.success('Plan eliminado')
  } catch (err) {
    toast.error('Error al eliminar el plan')
    throw err
  }
}
