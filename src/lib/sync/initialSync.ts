import { db } from '@/lib/db'
import { supabase } from '@/integrations/supabase/client'
import { syncLogger } from './syncLogger'

const SYNC_TABLES = [
  'users',
  'areas',
  'asset_categories',
  'assets',
  'incidents',
  'maintenance_plans',
  'maintenance_tasks',
  'maintenance_logs',
] as const

type SyncTable = (typeof SYNC_TABLES)[number]

// Tablas sin campo updated_at en Supabase — usar created_at como timestamp incremental
const TABLES_WITH_CREATED_AT_ONLY = new Set<SyncTable>([
  'areas',
  'asset_categories',
  'maintenance_logs',
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
    syncLogger.warn(`Error pull ${table}`, error.message)
    return 0
  }

  if (!data || data.length === 0) return 0

  const dexieTable = (db as unknown as Record<string, { bulkPut: (items: unknown[]) => Promise<unknown> }>)[table]
  if (dexieTable) {
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
    const dexieTable = (db as unknown as Record<string, { update: (id: string, changes: object) => Promise<unknown> }>)[record.table_name]
    if (dexieTable) {
      await dexieTable.update(record.record_id, {
        deleted_at: record.deleted_at,
      })
    }
  }
}

export async function pullAll(): Promise<void> {
  const since = await getLastSyncTimestamp()
  const syncStart = new Date().toISOString()

  syncLogger.info('Iniciando pull incremental', { since })

  let totalPulled = 0
  for (const table of SYNC_TABLES) {
    try {
      const count = await pullTable(table, since)
      totalPulled += count
    } catch (err) {
      syncLogger.warn(`Error pulling ${table}`, err)
    }
  }

  try {
    await pullDeletedRecords(since)
  } catch (err) {
    syncLogger.warn('Error pulling deleted_records', err)
  }

  await setLastSyncTimestamp(syncStart)
  syncLogger.info(`Pull completado: ${totalPulled} registros actualizados`)
}
