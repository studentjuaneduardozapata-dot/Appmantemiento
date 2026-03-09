import { useLiveQuery } from 'dexie-react-hooks'
import { format, addDays } from 'date-fns'
import { toast } from 'sonner'
import { db, generateId } from '@/lib/db'
import type { MaintenancePlan, MaintenanceTask } from '@/lib/db'
import type { MaintenancePlanFormData, MaintenanceTaskFormData } from '@/types'
import { enqueue } from '@/lib/sync/syncQueue'

// ─── Reads ─────────────────────────────────────────────────────────────────────

export function useMaintenancePlans(): MaintenancePlan[] | undefined {
  return useLiveQuery(() =>
    db.maintenance_plans
      .orderBy('created_at')
      .filter((p) => !p.deleted_at)
      .toArray()
  )
}

export function useMaintenancePlan(id: string): MaintenancePlan | undefined {
  return useLiveQuery(() => db.maintenance_plans.get(id), [id])
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

  await db.transaction(
    'rw',
    [db.maintenance_plans, db.maintenance_tasks, db.sync_queue],
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
      }
    }
  )

  toast.success('Plan de mantenimiento creado')
  return planId
}

export async function deleteMaintenancePlan(id: string): Promise<void> {
  const now = new Date().toISOString()
  const tasks = await db.maintenance_tasks.where('plan_id').equals(id).toArray()
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
}
