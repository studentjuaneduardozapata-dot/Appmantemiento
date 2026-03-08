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
}

export interface Area {
  id: string
  code: string
  name: string
  sort_order: number
  created_at: string
}

export interface AssetCategory {
  id: string
  name: string
  sort_order: number
  created_at: string
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
  }
}

export const db = new GMAODatabase()
