// Re-exporta todos los tipos desde db.ts como fuente de verdad
export type {
  User,
  Area,
  AssetCategory,
  Asset,
  AssetSpec,
  AssetStatus,
  Incident,
  IncidentType,
  IncidentStatus,
  MaintenancePlan,
  PlanType,
  MaintenanceTask,
  TaskStatus,
  MaintenanceLog,
  MaintenanceTaskStep,
  AppNotification,
  NotificationType,
  OfflineFile,
  SyncQueueItem,
  SyncOperation,
  SyncStatus,
  SyncMeta,
  DeletedRecord,
} from '@/lib/db'

// Tipos de UI auxiliares

export interface NavItem {
  label: string
  path: string
  icon: string
}

export interface SyncState {
  isOnline: boolean
  isSyncing: boolean
  lastSync: Date | null
}

// Tipo para el semáforo de activos
export type AssetTrafficLight = 'red' | 'yellow' | 'green'

export interface AssetWithStatus {
  id: string
  name: string
  areaName: string
  categoryName: string
  trafficLight: AssetTrafficLight
}

// Tipos para formularios
export interface IncidentFormData {
  asset_id: string
  type: 'mecanica' | 'electrica' | 'neumatica'
  reported_by: string
  description?: string
  photo_url?: string
  reported_at: string
}

export interface MaintenancePlanFormData {
  title: string
  description?: string
  asset_ids: string[]
  type: 'unico' | 'preventivo'
}

export interface MaintenanceTaskStepFormData {
  id?: string
  description: string
  sort_order: number
}

export interface MaintenanceTaskFormData {
  id?: string
  description: string
  frequency_days: number
  next_due_date?: string
  steps?: MaintenanceTaskStepFormData[]
}

export interface AssetFormData {
  name: string
  category_id: string
  area_id: string
  parent_asset_id?: string
  image_url?: string
  specs: Array<{ key: string; value: string }>
  status: 'operativo' | 'en_mantenimiento' | 'fuera_de_servicio'
}

// Tipos para filtros de historial
export interface HistoryFilters {
  asset_id?: string
  area_id?: string
  type?: 'mantenimiento' | 'falla'
  date_from?: string
  date_to?: string
}

// Períodos para resumen
export type SummaryPeriod = '15d' | '1m' | 'custom'

export interface SummaryFilters {
  period: SummaryPeriod
  date_from?: string
  date_to?: string
}
