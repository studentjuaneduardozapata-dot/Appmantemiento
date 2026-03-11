import { useLiveQuery } from 'dexie-react-hooks'
import { db, generateId } from '@/lib/db'
import type { MaintenanceTaskStep } from '@/lib/db'
import { enqueue } from '@/lib/sync/syncQueue'

// ─── Reads ─────────────────────────────────────────────────────────────────────

export function useStepsByTask(taskId: string): MaintenanceTaskStep[] | undefined {
  return useLiveQuery(
    () =>
      db.task_steps
        .where('task_id')
        .equals(taskId)
        .filter((s) => !s.deleted_at)
        .sortBy('sort_order'),
    [taskId]
  )
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

export async function createStep(
  taskId: string,
  description: string,
  sortOrder: number
): Promise<string> {
  const now = new Date().toISOString()
  const step: MaintenanceTaskStep = {
    id: generateId(),
    task_id: taskId,
    description,
    sort_order: sortOrder,
    created_at: now,
    updated_at: now,
    _synced: false,
  }
  await db.task_steps.add(step)
  await enqueue('task_steps', 'insert', step as unknown as Record<string, unknown>)
  return step.id
}

export async function softDeleteStep(id: string): Promise<void> {
  const now = new Date().toISOString()
  await db.task_steps.update(id, { deleted_at: now, _synced: false })
  await enqueue('task_steps', 'delete', { id })
}
