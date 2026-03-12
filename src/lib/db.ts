import Dexie, { type EntityTable } from 'dexie'

// ─── generateId ───────────────────────────────────────────────────────────────
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

// ─── Tipos de datos ────────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  created_at: string
  updated_at: string
  deleted_at?: string
  _synced: boolean
}

export interface Area {
  id: string
  code: string
  name: string
  sort_order: number
  created_at: string
  deleted_at?: string
}

export interface AssetCategory {
  id: string
  name: string
  sort_order: number
  created_at: string
  deleted_at?: string
}

export type AssetStatus = 'operativo' | 'en_mantenimiento' | 'fuera_de_servicio'

export interface AssetSpec {
  key: string
  value: string
}

export interface Asset {
  id: string
  name: string
  category_id: string
  area_id: string
  parent_asset_id?: string
  image_url?: string
  specs: AssetSpec[]
  status: AssetStatus
  deleted_at?: string
  created_at: string
  updated_at: string
  _synced: boolean
}

export type IncidentType = 'mecanica' | 'electrica' | 'neumatica'
export type IncidentStatus = 'abierta' | 'en_progreso' | 'cerrada'

export interface Incident {
  id: string
  asset_id: string
  type: IncidentType
  reported_by: string
  description?: string
  photo_url?: string
  status: IncidentStatus
  resolution_time?: string
  resolved_by?: string
  notes?: string
  reported_at: string
  closed_at?: string
  deleted_at?: string
  created_at: string
  updated_at: string
  _synced: boolean
}

export type PlanType = 'unico' | 'preventivo'

export interface MaintenancePlan {
  id: string
  title: string
  description?: string
  asset_ids: string[]
  type: PlanType
  created_at: string
  updated_at: string
  deleted_at?: string
  _synced: boolean
}

export type TaskStatus = 'pendiente' | 'completada' | 'vencida'

export interface MaintenanceTask {
  id: string
  plan_id: string
  description: string
  frequency_days: number
  next_due_date: string
  status: TaskStatus
  created_at: string
  updated_at: string
  deleted_at?: string
  _synced: boolean
}

export interface MaintenanceLog {
  id: string
  task_id: string
  plan_id: string
  asset_id: string
  completed_by: string
  notes?: string
  photo_url?: string
  completed_at: string
  created_at: string
  completed_step_ids?: string[]
  _synced: boolean
}

export interface MaintenanceTaskStep {
  id: string
  task_id: string
  description: string
  sort_order: number
  created_at: string
  updated_at: string
  deleted_at?: string
  _synced: boolean
}

export type NotificationType = 'falla' | 'mantenimiento_vencido'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  reference_id?: string
  read: boolean
  created_at: string
}

export interface OfflineFile {
  id: string
  blob: Blob
  thumbnail?: Blob
  uploaded_url?: string
  created_at: string
}

export type SyncOperation = 'insert' | 'update' | 'delete'
export type SyncStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface SyncQueueItem {
  autoId?: number
  table: string
  operation: SyncOperation
  payload: Record<string, unknown>
  status: SyncStatus
  retry_count: number
  last_error?: string
  created_at: string
}

export interface SyncMeta {
  key: string
  value: string
}

export interface DeletedRecord {
  id: string
  table_name: string
  record_id: string
  deleted_at: string
}

// ─── Database ──────────────────────────────────────────────────────────────────

class GMAODatabase extends Dexie {
  users!: EntityTable<User, 'id'>
  areas!: EntityTable<Area, 'id'>
  asset_categories!: EntityTable<AssetCategory, 'id'>
  assets!: EntityTable<Asset, 'id'>
  incidents!: EntityTable<Incident, 'id'>
  maintenance_plans!: EntityTable<MaintenancePlan, 'id'>
  maintenance_tasks!: EntityTable<MaintenanceTask, 'id'>
  maintenance_logs!: EntityTable<MaintenanceLog, 'id'>
  task_steps!: EntityTable<MaintenanceTaskStep, 'id'>
  notifications!: EntityTable<AppNotification, 'id'>
  offline_files!: EntityTable<OfflineFile, 'id'>
  sync_queue!: EntityTable<SyncQueueItem, 'autoId'>
  sync_meta!: EntityTable<SyncMeta, 'key'>
  deleted_records!: EntityTable<DeletedRecord, 'id'>

  constructor() {
    super('gmao_planta')

    this.version(1).stores({
      users: '&id, name, created_at',
      areas: '&id, code, name, sort_order, created_at',
      asset_categories: '&id, name, sort_order, created_at',
      assets:
        '&id, category_id, area_id, parent_asset_id, status, _synced, deleted_at, updated_at',
      incidents:
        '&id, asset_id, status, reported_by, _synced, deleted_at, updated_at, reported_at',
      maintenance_plans: '&id, type, _synced, updated_at',
      maintenance_tasks:
        '&id, plan_id, status, next_due_date, _synced, updated_at',
      maintenance_logs:
        '&id, task_id, plan_id, asset_id, completed_at, _synced',
      notifications: '&id, type, read, created_at',
      offline_files: '&id, created_at',
      sync_queue: '++autoId, table, status, created_at',
      sync_meta: '&key',
      deleted_records: '&id, table_name, record_id, deleted_at',
    })

    this.version(2).stores({
      areas: '&id, code, name, sort_order, created_at, deleted_at',
      asset_categories: '&id, name, sort_order, created_at, deleted_at',
      maintenance_plans: '&id, type, _synced, updated_at, deleted_at',
      maintenance_tasks: '&id, plan_id, status, next_due_date, _synced, updated_at, deleted_at',
    })

    this.version(3).stores({
      users: '&id, name, _synced, updated_at, created_at',
    })

    this.version(4).stores({
      incidents:
        '&id, asset_id, status, reported_by, resolved_by, _synced, deleted_at, updated_at, reported_at',
    })

    // Migración única: deduplicar asset_categories por nombre en Dexie local.
    // Conserva el registro con created_at más antiguo, redirige referencias en assets.
    this.version(5).stores({}).upgrade(async (tx) => {
      const allCats = await tx.table('asset_categories').toArray()
      const byName = new Map<string, typeof allCats>()
      for (const cat of allCats) {
        const key = cat.name as string
        if (!byName.has(key)) byName.set(key, [])
        byName.get(key)!.push(cat)
      }
      for (const [, group] of byName) {
        if (group.length <= 1) continue
        // El canónico es el más antiguo (menor created_at)
        group.sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
        const canonical = group[0]
        const duplicates = group.slice(1)
        for (const dup of duplicates) {
          // Redirigir activos
          const dupAssets = await tx.table('assets')
            .where('category_id').equals(dup.id)
            .toArray()
          for (const asset of dupAssets) {
            await tx.table('assets').update(asset.id, { category_id: canonical.id, _synced: false })
          }
          await tx.table('asset_categories').delete(dup.id)
        }
      }
    })

    // Migración v6: corregir IDs de categorías con formato no-UUID (cat-XXXX-...) a UUIDs válidos.
    // Supabase rechaza cualquier valor que no sea UUID estricto en columnas de tipo uuid.
    // También actualiza referencias en assets y payloads pendientes en sync_queue.
    this.version(6).stores({}).upgrade(async (tx) => {
      const UUID_VALID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

      // Mapa de IDs antiguos → nuevos UUIDs válidos, indexados por nombre de categoría
      const NAME_TO_NEW_ID: Record<string, string> = {
        'Silos':                          '00000000-0000-4000-8000-000000000001',
        'Secadoras':                      '00000000-0000-4000-8000-000000000002',
        'Limpiadoras':                    '00000000-0000-4000-8000-000000000003',
        'Pre-limpiadoras':                '00000000-0000-4000-8000-000000000004',
        'Elevadores':                     '00000000-0000-4000-8000-000000000005',
        'Básculas':                       '00000000-0000-4000-8000-000000000006',
        'Báscula camionera':              '00000000-0000-4000-8000-000000000007',
        'Báscula portátil':               '00000000-0000-4000-8000-000000000008',
        'Clasificadoras':                 '00000000-0000-4000-8000-000000000009',
        'Desgeminadoras':                 '00000000-0000-4000-8000-000000000010',
        'Hidropolichadores':              '00000000-0000-4000-8000-000000000011',
        'Ensacadoras':                    '00000000-0000-4000-8000-000000000012',
        'Máquinas de coser':              '00000000-0000-4000-8000-000000000013',
        'Tableros de control':            '00000000-0000-4000-8000-000000000014',
        'Tolvas de recibo':               '00000000-0000-4000-8000-000000000015',
        'Despredadora':                   '00000000-0000-4000-8000-000000000016',
        'Transportadores de banda':       '00000000-0000-4000-8000-000000000017',
        'Montacargas':                    '00000000-0000-4000-8000-000000000018',
        'Elevadores de bulto (malacate)': '00000000-0000-4000-8000-000000000019',
        'Elevadores de bultos (grillo)':  '00000000-0000-4000-8000-000000000020',
        'Parrillas':                      '00000000-0000-4000-8000-000000000021',
        'Infraestructura':                '00000000-0000-4000-8000-000000000022',
        'Motores':                        '00000000-0000-4000-8000-000000000023',
        'Componentes':                    '00000000-0000-4000-8000-000000000024',
        'Otros':                          '00000000-0000-4000-8000-000000000025',
      }

      // Recolectar solo las categorías con ID inválido
      const allCats = await tx.table('asset_categories').toArray()
      const idMap = new Map<string, string>() // oldId → newId

      for (const cat of allCats) {
        const oldId = cat.id as string
        if (UUID_VALID.test(oldId)) continue // ya es UUID válido

        const newId = NAME_TO_NEW_ID[cat.name as string]
        if (!newId) continue // nombre desconocido — no se migra

        // Si ya existe un registro con el newId, solo redirigir y borrar el viejo
        const existing = await tx.table('asset_categories').get(newId)
        if (!existing) {
          await tx.table('asset_categories').put({ ...cat, id: newId })
        }
        await tx.table('asset_categories').delete(oldId)
        idMap.set(oldId, newId)
      }

      if (idMap.size === 0) return

      // Actualizar referencias en assets
      const allAssets = await tx.table('assets').toArray()
      for (const asset of allAssets) {
        const newCatId = idMap.get(asset.category_id as string)
        if (newCatId) {
          await tx.table('assets').update(asset.id, { category_id: newCatId, _synced: false })
        }
      }

      // Actualizar / invalidar sync_queue
      const queueItems = await tx.table('sync_queue').toArray()
      for (const item of queueItems) {
        if (item.status === 'completed') continue

        const payload = item.payload as Record<string, unknown>
        let changed = false
        const updatedPayload = { ...payload }

        // Items de asset_categories con ID viejo → actualizar a nuevo UUID
        if (item.table === 'asset_categories') {
          const newId = idMap.get(payload.id as string)
          if (newId) {
            updatedPayload.id = newId
            changed = true
          }
        }

        // Items de assets con category_id viejo → actualizar referencia
        if (item.table === 'assets') {
          const newCatId = idMap.get(payload.category_id as string)
          if (newCatId) {
            updatedPayload.category_id = newCatId
            changed = true
          }
        }

        if (changed) {
          await tx.table('sync_queue').update(item.autoId, {
            payload: updatedPayload,
            status: 'pending',
            retry_count: 0,
            last_error: undefined,
          })
        }
      }
    })

    // v7: tabla de sub-pasos por tarea de mantenimiento
    this.version(7).stores({
      task_steps: '&id, task_id, sort_order, _synced, deleted_at',
    })
  }
}

export const db = new GMAODatabase()
