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
  try {
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
    const permission = await requestNotificationPermission()
    if (permission === 'granted') notifyFalla(assetName)

    return id
  } catch (err) {
    toast.error('Error al reportar la falla')
    throw err
  }
}

export async function updateIncident(
  id: string,
  data: Partial<Incident>
): Promise<void> {
  try {
    const now = new Date().toISOString()
    const changes = { ...data, updated_at: now, _synced: false }
    await db.incidents.update(id, changes)
    const record = await db.incidents.get(id)
    if (record) {
      await enqueue('incidents', 'update', record as unknown as Record<string, unknown>)
    }
  } catch (err) {
    toast.error('Error al actualizar la falla')
    throw err
  }
}

export async function closeIncident(
  id: string,
  data: {
    resolution_time: string
    resolved_by: string
    notes?: string
    restore_asset?: boolean
    asset_id?: string
  }
): Promise<void> {
  try {
    const now = new Date().toISOString()
    const changes = {
      status: 'cerrada' as IncidentStatus,
      resolution_time: data.resolution_time,
      resolved_by: data.resolved_by,
      closed_at: now,
      updated_at: now,
      _synced: false,
    }
    await db.incidents.update(id, changes)
    const record = await db.incidents.get(id)
    if (record) {
      await enqueue('incidents', 'update', record as unknown as Record<string, unknown>)
    }
    if (data.restore_asset && data.asset_id) {
      await db.assets.update(data.asset_id, { status: 'operativo', _synced: false, updated_at: now })
      const asset = await db.assets.get(data.asset_id)
      if (asset) {
        await enqueue('assets', 'update', asset as unknown as Record<string, unknown>)
      }
    }
    toast.success('Falla cerrada')
  } catch (err) {
    toast.error('Error al cerrar la falla')
    throw err
  }
}

export async function softDeleteIncident(id: string): Promise<void> {
  try {
    const now = new Date().toISOString()
    await db.incidents.update(id, { deleted_at: now, _synced: false })
    await enqueue('incidents', 'delete', { id })
  } catch (err) {
    toast.error('Error al eliminar la falla')
    throw err
  }
}
