import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { db, generateId } from '@/lib/db'
import type { Incident, IncidentStatus } from '@/lib/db'
import type { IncidentFormData } from '@/types'
import { enqueue } from '@/lib/sync/syncQueue'
import { requestNotificationPermission, notifyFalla } from '@/lib/notifications'

// ─── Reads ─────────────────────────────────────────────────────────────────────

export function useIncidents(statusFilter: IncidentStatus | 'all'): Incident[] | undefined {
  return useLiveQuery(
    () =>
      db.incidents
        .filter(
          (i) =>
            !i.deleted_at &&
            (statusFilter === 'all' || i.status === statusFilter)
        )
        .sortBy('reported_at')
        .then((arr) => arr.reverse()),
    [statusFilter]
  )
}

export function useIncident(id: string): Incident | undefined {
  return useLiveQuery(() => db.incidents.get(id), [id])
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

export async function createIncident(data: IncidentFormData): Promise<string> {
  const id = generateId()
  const now = new Date().toISOString()
  const record: Incident = {
    id,
    asset_id: data.asset_id,
    type: data.type,
    reported_by: data.reported_by,
    description: data.description,
    photo_url: data.photo_url,
    status: 'abierta',
    reported_at: data.reported_at,
    created_at: now,
    updated_at: now,
    _synced: false,
  }
  await db.incidents.add(record)
  await enqueue('incidents', 'insert', record as unknown as Record<string, unknown>)

  // Notificación local
  const asset = await db.assets.get(data.asset_id)
  const assetName = asset?.name ?? 'Activo desconocido'
  toast.success('Falla reportada', { description: assetName })
  await requestNotificationPermission()
  notifyFalla(assetName)

  return id
}

export async function updateIncident(
  id: string,
  data: Partial<Incident>
): Promise<void> {
  const now = new Date().toISOString()
  const changes = { ...data, updated_at: now, _synced: false }
  await db.incidents.update(id, changes)
  const record = await db.incidents.get(id)
  if (record) {
    await enqueue('incidents', 'update', record as unknown as Record<string, unknown>)
  }
}

export async function closeIncident(
  id: string,
  resolution_time: string
): Promise<void> {
  const now = new Date().toISOString()
  const changes = {
    status: 'cerrada' as IncidentStatus,
    resolution_time,
    closed_at: now,
    updated_at: now,
    _synced: false,
  }
  await db.incidents.update(id, changes)
  const record = await db.incidents.get(id)
  if (record) {
    await enqueue('incidents', 'update', record as unknown as Record<string, unknown>)
  }
  toast.success('Falla cerrada')
}

export async function softDeleteIncident(id: string): Promise<void> {
  const now = new Date().toISOString()
  await db.incidents.update(id, { deleted_at: now, _synced: false })
  await enqueue('incidents', 'delete', { id })
}
