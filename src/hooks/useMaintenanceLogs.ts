import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { MaintenanceLog } from '@/lib/db'

export function useLogsByTask(taskId: string): MaintenanceLog[] | undefined {
  return useLiveQuery(
    () =>
      db.maintenance_logs
        .where('task_id')
        .equals(taskId)
        .reverse()
        .sortBy('completed_at')
        .then((arr) => arr.reverse()),
    [taskId]
  )
}

export function useLogsByAsset(assetId: string): MaintenanceLog[] | undefined {
  return useLiveQuery(
    () =>
      db.maintenance_logs
        .where('asset_id')
        .equals(assetId)
        .reverse()
        .sortBy('completed_at')
        .then((arr) => arr.reverse()),
    [assetId]
  )
}

export function useLogsInRange(
  from: string,
  to: string
): MaintenanceLog[] | undefined {
  return useLiveQuery(
    () =>
      db.maintenance_logs
        .where('completed_at')
        .between(from, to, true, true)
        .toArray(),
    [from, to]
  )
}
