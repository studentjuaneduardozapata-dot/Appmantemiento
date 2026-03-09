import { useLiveQuery } from 'dexie-react-hooks'
import { format, addDays } from 'date-fns'
import { db, generateId } from '@/lib/db'
import type { Asset } from '@/lib/db'
import type { AssetFormData } from '@/types'
import { enqueue } from '@/lib/sync/syncQueue'

// ─── Reads ─────────────────────────────────────────────────────────────────────

export function useAssets(search?: string): Asset[] | undefined {
  return useLiveQuery(
    () =>
      db.assets
        .filter(
          (a) =>
            !a.deleted_at &&
            (!search || a.name.toLowerCase().includes(search.toLowerCase()))
        )
        .toArray(),
    [search]
  )
}

export function useAsset(id: string): Asset | undefined {
  return useLiveQuery(() => db.assets.get(id), [id])
}

export function useSubAssets(parentId: string): Asset[] | undefined {
  return useLiveQuery(
    () =>
      db.assets
        .where('parent_asset_id')
        .equals(parentId)
        .and((a) => !a.deleted_at)
        .toArray(),
    [parentId]
  )
}

export type TrafficLight = 'red' | 'yellow' | 'green'

export function useAssetTrafficLight(assetId: string): TrafficLight | undefined {
  return useLiveQuery(async () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const sevenDaysOut = format(addDays(new Date(), 7), 'yyyy-MM-dd')

    // Fallas abiertas
    const openIncCount = await db.incidents
      .where('asset_id')
      .equals(assetId)
      .and((i) => !i.deleted_at && (i.status === 'abierta' || i.status === 'en_progreso'))
      .count()

    if (openIncCount > 0) return 'red'

    // Planes asociados al activo
    const plans = await db.maintenance_plans
      .filter((p) => p.asset_ids.includes(assetId))
      .toArray()
    const planIds = plans.map((p) => p.id)

    if (planIds.length === 0) return 'green'

    const overdueCount = await db.maintenance_tasks
      .where('plan_id')
      .anyOf(planIds)
      .and((t) => t.status === 'pendiente' && t.next_due_date < today)
      .count()

    if (overdueCount > 0) return 'red'

    const soonCount = await db.maintenance_tasks
      .where('plan_id')
      .anyOf(planIds)
      .and(
        (t) =>
          t.status === 'pendiente' &&
          t.next_due_date >= today &&
          t.next_due_date <= sevenDaysOut
      )
      .count()

    return soonCount > 0 ? 'yellow' : 'green'
  }, [assetId])
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

export async function createAsset(data: AssetFormData): Promise<string> {
  const id = generateId()
  const now = new Date().toISOString()
  const record: Asset = {
    id,
    name: data.name,
    category_id: data.category_id,
    area_id: data.area_id,
    parent_asset_id: data.parent_asset_id,
    image_url: data.image_url,
    specs: data.specs,
    status: data.status,
    created_at: now,
    updated_at: now,
    _synced: false,
  }
  await db.assets.add(record)
  await enqueue('assets', 'insert', record as unknown as Record<string, unknown>)
  return id
}

export async function updateAsset(
  id: string,
  data: Partial<AssetFormData>
): Promise<void> {
  const now = new Date().toISOString()
  const changes = { ...data, updated_at: now, _synced: false }
  await db.assets.update(id, changes)
  const record = await db.assets.get(id)
  if (record) {
    await enqueue('assets', 'update', record as unknown as Record<string, unknown>)
  }
}

export async function softDeleteAsset(id: string): Promise<void> {
  const now = new Date().toISOString()
  await db.assets.update(id, { deleted_at: now, _synced: false })
  await enqueue('assets', 'delete', { id })
}
