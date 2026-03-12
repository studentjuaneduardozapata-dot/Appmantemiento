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

// Tablas con updated_at en Dexie/Supabase — aplican updated-at-wins al hacer pull
const TABLES_WITH_UPDATED_AT_WINS = new Set<SyncTable>([
  'users', 'assets', 'incidents', 'maintenance_plans', 'maintenance_tasks', 'task_steps',
])

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

    if (TABLES_WITH_UPDATED_AT_WINS.has(table)) {
      // Updated-at-wins: solo sobrescribir si el registro remoto es estrictamente más nuevo.
      // Si el local tiene _synced: false (cambios pendientes de push), se preserva.
      const remoteRecords = data as Array<Record<string, unknown>>
      const ids = remoteRecords.map(r => r.id as string).filter(Boolean)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const localRecords: Record<string, unknown>[] = await (dexieTable as any).where('id').anyOf(ids).toArray()
      const localMap = new Map<string, Record<string, unknown>>(
        localRecords.map(r => [r.id as string, r])
      )
      const toUpsert = remoteRecords.filter(remote => {
        const local = localMap.get(remote.id as string)
        if (!local) return true                          // Registro nuevo — aceptar
        if (local._synced === false) return false        // Cambios locales pendientes — preservar
        if (!local.updated_at || !remote.updated_at) return true
        return (remote.updated_at as string) > (local.updated_at as string)
      })
      if (toUpsert.length > 0) {
        await dexieTable.bulkPut(toUpsert)
      }
    } else {
      await dexieTable.bulkPut(data)
    }
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

  // Buffer de seguridad de 2 minutos para mitigar clock skew entre dispositivos.
  // bulkPut / updated-at-wins son idempotentes → los duplicados resultantes son seguros.
  const sinceWithBuffer = since
    ? new Date(new Date(since).getTime() - 120_000).toISOString()
    : null

  syncLogger.info('Iniciando pull incremental', { since, sinceWithBuffer })

  let totalPulled = 0
  let hasAnyFailure = false

  for (const table of SYNC_TABLES) {
    try {
      const count = await pullTable(table, sinceWithBuffer)
      totalPulled += count
    } catch (err) {
      hasAnyFailure = true
      if (CRITICAL_TABLES.has(table)) {
        syncLogger.error(`Fallo crítico en pull de ${table} — timestamp NO se actualizará`, err)
      } else {
        syncLogger.warn(`Fallo en pull de ${table} — timestamp NO se actualizará`, err)
      }
    }
  }

  try {
    await pullDeletedRecords(sinceWithBuffer)
  } catch (err) {
    syncLogger.warn('Error pulling deleted_records', err)
  }

  // Sync atómico: el watermark solo avanza si TODAS las tablas completaron sin error.
  // Cualquier fallo (crítico o no) deja el timestamp "sucio" para reintentar el próximo ciclo.
  if (!hasAnyFailure) {
    await setLastSyncTimestamp(syncStart)
    syncLogger.info(`Pull completado: ${totalPulled} registros. Timestamp actualizado.`)
  } else {
    syncLogger.warn(
      `Pull completado con errores: ${totalPulled} registros. Timestamp NO actualizado — se reintentará en el próximo ciclo.`
    )
  }
}

// ─── Conteo local por tabla (sin registros soft-deleted) ──────────────────────

async function countLocal(table: HeartbeatTable): Promise<number> {
  // Solo contar registros ya confirmados en Supabase (_synced !== false).
  // Los registros _synced: false son creaciones offline aún pendientes de push —
  // incluirlos causaría falsos positivos de divergencia en el heartbeat.
  switch (table) {
    case 'assets':
      return db.assets.filter((r) => !r.deleted_at && r._synced !== false).count()
    case 'incidents':
      return db.incidents.filter((r) => !r.deleted_at && r._synced !== false).count()
    case 'maintenance_tasks':
      return db.maintenance_tasks.filter((r) => !r.deleted_at && r._synced !== false).count()
    case 'maintenance_logs':
      return db.maintenance_logs.filter((r) => r._synced !== false).count()
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

      // Solo forzar resync si local tiene MENOS registros que remoto (datos faltantes).
      // Si local > remoto, el exceso son registros pendientes de push — se resolverá solo.
      if (localCount < remoteCount &&
          (delta > HEARTBEAT_DELTA_ABSOLUTE || percentDelta > HEARTBEAT_DELTA_PERCENT)) {
        syncLogger.warn(
          `Heartbeat: divergencia detectada en ${table} (local=${localCount} < remote=${remoteCount}, delta=${delta}, ${(percentDelta * 100).toFixed(1)}%) — forzando resync completo`
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
