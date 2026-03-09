import { useLiveQuery } from 'dexie-react-hooks'
import { format, addDays } from 'date-fns'
import { toast } from 'sonner'
import { db, generateId } from '@/lib/db'
import type { MaintenanceTask, MaintenancePlan, MaintenanceLog, TaskStatus } from '@/lib/db'
import { enqueue } from '@/lib/sync/syncQueue'

// ─── Reads ─────────────────────────────────────────────────────────────────────

export function useTasksByPlan(planId: string): MaintenanceTask[] | undefined {
  return useLiveQuery(
    () =>
      db.maintenance_tasks
        .where('plan_id')
        .equals(planId)
        .and((t) => !t.deleted_at)
        .sortBy('next_due_date'),
    [planId]
  )
}

export function useTasksInRange(
  from: string,
  to: string
): MaintenanceTask[] | undefined {
  return useLiveQuery(
    () =>
      db.maintenance_tasks
        .where('next_due_date')
        .between(from, to, true, true)
        .and((t) => !t.deleted_at)
        .toArray(),
    [from, to]
  )
}

export function useOverdueTasks(): MaintenanceTask[] | undefined {
  const today = format(new Date(), 'yyyy-MM-dd')
  return useLiveQuery(
    () =>
      db.maintenance_tasks
        .where('next_due_date')
        .below(today)
        .and((t) => t.status === 'pendiente' && !t.deleted_at)
        .toArray(),
    [today]
  )
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

export async function completeTask(
  task: MaintenanceTask,
  plan: MaintenancePlan,
  logData: {
    completed_by: string
    notes?: string
    photo_url?: string
    completed_at: string
  }
): Promise<void> {
  const now = new Date().toISOString()
  const logId = generateId()
  const assetId = plan.asset_ids[0] ?? ''

  const log: MaintenanceLog = {
    id: logId,
    task_id: task.id,
    plan_id: plan.id,
    asset_id: assetId,
    completed_by: logData.completed_by,
    notes: logData.notes,
    photo_url: logData.photo_url,
    completed_at: logData.completed_at,
    created_at: now,
    _synced: false,
  }

  // Para preventivo: recalcular next_due_date y mantener pendiente
  // Para único: marcar completada definitivamente
  const newStatus: TaskStatus = plan.type === 'unico' ? 'completada' : 'pendiente'
  const nextDue =
    plan.type === 'preventivo'
      ? format(
          addDays(new Date(logData.completed_at + 'T00:00:00'), task.frequency_days),
          'yyyy-MM-dd'
        )
      : task.next_due_date

  const taskUpdate = {
    status: newStatus,
    next_due_date: nextDue,
    updated_at: now,
    _synced: false,
  }

  await db.transaction(
    'rw',
    [db.maintenance_logs, db.maintenance_tasks, db.sync_queue],
    async () => {
      await db.maintenance_logs.add(log)
      await db.maintenance_tasks.update(task.id, taskUpdate)
      await enqueue('maintenance_logs', 'insert', log as unknown as Record<string, unknown>)
      await enqueue('maintenance_tasks', 'update', {
        ...task,
        ...taskUpdate,
      } as unknown as Record<string, unknown>)
    }
  )

  toast.success('Tarea completada')
}
