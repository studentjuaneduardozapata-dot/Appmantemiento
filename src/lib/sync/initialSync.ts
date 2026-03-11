import { format } from 'date-fns'
import { db } from '@/lib/db'
import { supabase } from '@/integrations/supabase/client'
import { syncLogger } from './syncLogger'
import { deduplicateAreasByCode, deduplicateCategoriesByName } from './deduplication'
import { getTable } from './dbAccess'

const SYNC_TABLES = [
  'users',
  'areas',
  'asset_categories',
  'assets',
  'incidents',
  'maintenance_plans',
  'maintenance_tasks',
  'maintenance_logs',
  'task_steps',
] as const

type SyncTable = (typeof SYNC_TABLES)[number]

// Tablas sin campo updated_at en Supabase — usar created_at como timestamp incremental
const TABLES_WITH_CREATED_AT_ONLY = new Set<SyncTable>([
  'areas',
  'asset_categories',
  'maintenance_logs',
])

// Tablas críticas: si falla su pull, NO se avanza el timestamp (evita perder registros)
const CRITICAL_TABLES = new Set<SyncTable>([
  'assets',
  'incidents',
  'maintenance_plans',
  'maintenance_tasks',
  'maintenance_logs',
  'task_steps',
])

// Tablas cuya divergencia se verifica en el heartbeat
const HEARTBEAT_TABLES = ['assets', 'incidents', 'maintenance_tasks', 'maintenance_logs'] as const
type HeartbeatTable = (typeof HEARTBEAT_TABLES)[number]

const HEARTBEAT_DELTA_ABSOLUTE = 5   // diferencia máxima en nº de registros
const HEARTBEAT_DELTA_PERCENT = 0.10 // 10% de divergencia

async function getLastSyncTimestamp(): Promise<string | null> {
  const meta = await db.sync_meta.get('last_sync_timestamp')
  return meta?.value ?? null
}

async function setLastSyncTimestamp(ts: string): Promise<void> {
  await db.sync_meta.put({ key: 'last_sync_timestamp', value: ts })
}

async function pullTable(table: SyncTable, since: string | null): Promise<number> {
  const tsField = TABLES_WITH_CREATED_AT_ONLY.has(table) ? 'created_at' : 'updated_at'
  let query = supabase.from(table).select('*').order(tsField, { ascending: true })

  if (since) {
    query = query.gt(tsField, since)
  }

  const { data, error } = await query

  if (error) {
    // Lanzar error para que pullAll() pueda clasificarlo como crítico o no
    throw new Error(`pull ${table}: ${error.message}`)
  }

  if (!data || data.length === 0) return 0

  const dexieTable = getTable(table)
  if (dexieTable) {
    // Para 'areas': eliminar duplicados locales por code antes de bulkPut para evitar IDs fantasma
    if (table === 'areas') {
      await deduplicateAreasByCode(data as Record<string, unknown>[])
    }
    // Para 'asset_categories': eliminar duplicados locales por name antes de bulkPut
    if (table === 'asset_categories') {
      await deduplicateCategoriesByName(data as Record<string, unknown>[])
    }
    await dexieTable.bulkPut(data)
  }

  return data.length
}

async function pullDeletedRecords(since: string | null): Promise<void> {
  let query = supabase
    .from('deleted_records')
    .select('*')
    .order('deleted_at', { ascending: true })

  if (since) {
    query = query.gt('deleted_at', since)
  }

  const { data, error } = await query
  if (error || !data) return

  for (const record of data) {
    const dexieTable = getTable(record.table_name)
    if (dexieTable) {
      await dexieTable.update(record.record_id, {
        deleted_at: record.deleted_at,
      })
    }
  }
}

export async function purgeOldDeletedRecords(): Promise<void> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const meta = await db.sync_meta.get('last_deleted_records_purge')
  if (meta?.value === today) return

  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString()
  await db.deleted_records.where('deleted_at').below(ninetyDaysAgo).delete()
  await db.sync_meta.put({ key: 'last_deleted_records_purge', value: today })
  syncLogger.debug('Purgados deleted_records > 90 días')
}

export async function pullAll(): Promise<void> {
  const since = await getLastSyncTimestamp()
  // Guardar ANTES de comenzar — solo se usa como nuevo watermark si todo sale bien
  const syncStart = new Date().toISOString()

  syncLogger.info('Iniciando pull incremental', { since })

  let totalPulled = 0
  let hasCriticalFailure = false

  for (const table of SYNC_TABLES) {
    try {
      const count = await pullTable(table, since)
      totalPulled += count
    } catch (err) {
      syncLogger.warn(`Error pulling ${table}`, err)
      if (CRITICAL_TABLES.has(table)) {
        hasCriticalFailure = true
        syncLogger.error(`Fallo crítico en pull de ${table} — timestamp NO se actualizará`)
      }
      // Tablas no críticas (users, areas, asset_categories): continuar sin marcar fallo
    }
  }

  try {
    await pullDeletedRecords(since)
  } catch (err) {
    syncLogger.warn('Error pulling deleted_records', err)
  }

  // Solo avanzar el watermark si no hubo fallos en tablas críticas
  if (!hasCriticalFailure) {
    await setLastSyncTimestamp(syncStart)
    syncLogger.info(`Pull completado: ${totalPulled} registros. Timestamp actualizado.`)
  } else {
    syncLogger.warn(
      `Pull completado con errores críticos: ${totalPulled} registros. Timestamp NO actualizado — se reintentará en el próximo ciclo.`
    )
  }
}

// ─── Conteo local por tabla (sin registros soft-deleted) ──────────────────────

async function countLocal(table: HeartbeatTable): Promise<number> {
  switch (table) {
    case 'assets':
      return db.assets.filter((r) => !r.deleted_at).count()
    case 'incidents':
      return db.incidents.filter((r) => !r.deleted_at).count()
    case 'maintenance_tasks':
      return db.maintenance_tasks.filter((r) => !r.deleted_at).count()
    case 'maintenance_logs':
      // maintenance_logs no tiene deleted_at en Dexie — contar todos
      return db.maintenance_logs.count()
  }
}

/**
 * Compara conteos de registros activos entre Dexie y Supabase para tablas críticas.
 * Si detecta divergencia significativa, resetea last_sync_timestamp para forzar
 * un pull completo en el próximo ciclo de sync.
 */
export async function performDataHeartbeat(): Promise<void> {
  syncLogger.info('Iniciando data heartbeat')

  try {
    for (const table of HEARTBEAT_TABLES) {
      const localCount = await countLocal(table)

      const selectFilter = table !== 'maintenance_logs'
        ? supabase.from(table).select('*', { count: 'exact', head: true }).is('deleted_at', null)
        : supabase.from(table).select('*', { count: 'exact', head: true })

      const { count: remoteCount, error } = await selectFilter

      if (error || remoteCount === null) {
        syncLogger.warn(`Heartbeat: no se pudo obtener conteo remoto de ${table}`)
        continue
      }

      const delta = Math.abs(localCount - remoteCount)
      const percentDelta = remoteCount > 0 ? delta / remoteCount : 0

      syncLogger.debug(
        `Heartbeat ${table}: local=${localCount} remote=${remoteCount} delta=${delta} (${(percentDelta * 100).toFixed(1)}%)`
      )

      if (delta > HEARTBEAT_DELTA_ABSOLUTE || percentDelta > HEARTBEAT_DELTA_PERCENT) {
        syncLogger.warn(
          `Heartbeat: divergencia detectada en ${table} (delta=${delta}, ${(percentDelta * 100).toFixed(1)}%) — forzando resync completo`
        )
        // Resetear timestamp → el próximo pullAll() traerá todos los registros sin filtro
        await db.sync_meta.delete('last_sync_timestamp')
        return
      }
    }

    syncLogger.info('Heartbeat completado: datos consistentes')
  } catch (err) {
    syncLogger.warn('Error en data heartbeat', err)
  }
}
