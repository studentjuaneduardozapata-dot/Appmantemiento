import type { RealtimeChannel } from '@supabase/supabase-js'
import { db } from '@/lib/db'
import { supabase } from '@/integrations/supabase/client'
import { syncLogger } from './syncLogger'

const REALTIME_TABLES = [
  'users',
  'areas',
  'asset_categories',
  'assets',
  'incidents',
  'maintenance_plans',
  'maintenance_tasks',
  'maintenance_logs',
] as const

type RealtimeTable = (typeof REALTIME_TABLES)[number]

// Tablas con campo _synced en su schema Dexie
const TABLES_WITH_SYNCED = new Set<RealtimeTable>([
  'assets',
  'incidents',
  'maintenance_plans',
  'maintenance_tasks',
  'maintenance_logs',
])

let channels: RealtimeChannel[] = []

export function startRealtime(): void {
  for (const table of REALTIME_TABLES) {
    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        async (payload) => {
          await handleRealtimeChange(table, payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          syncLogger.debug(`Realtime suscrito: ${table}`)
        } else if (status === 'CHANNEL_ERROR') {
          syncLogger.warn(`Realtime error: ${table}`)
        }
      })

    channels.push(channel)
  }
}

export function stopRealtime(): void {
  for (const channel of channels) {
    supabase.removeChannel(channel)
  }
  channels = []
  syncLogger.info('Realtime desuscrito')
}

async function handleRealtimeChange(
  table: RealtimeTable,
  payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }
): Promise<void> {
  const dexieTable = (db as unknown as Record<string, {
    put: (item: unknown) => Promise<unknown>
    update: (id: string, changes: object) => Promise<unknown>
  }>)[table]

  if (!dexieTable) return

  try {
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      const record = TABLES_WITH_SYNCED.has(table)
        ? { ...payload.new, _synced: true }
        : { ...payload.new }
      await dexieTable.put(record)
      syncLogger.debug(`Realtime ${payload.eventType}: ${table}`, payload.new)
    } else if (payload.eventType === 'DELETE') {
      const id = payload.old.id as string
      if (id) {
        await dexieTable.update(id, { deleted_at: new Date().toISOString() })
        syncLogger.debug(`Realtime DELETE: ${table}`, { id })
      }
    }
  } catch (err) {
    syncLogger.warn(`Error procesando realtime ${table}`, err)
  }
}
