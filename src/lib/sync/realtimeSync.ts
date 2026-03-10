import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { syncLogger } from './syncLogger'
import { getTable } from './dbAccess'

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
  'users',
  'assets',
  'incidents',
  'maintenance_plans',
  'maintenance_tasks',
  'maintenance_logs',
])

const RECONNECT_DELAY_MS = 10_000

let channels: Map<RealtimeTable, RealtimeChannel> = new Map()

function subscribeToTable(table: RealtimeTable): void {
  // Limpiar canal previo si existe
  const existing = channels.get(table)
  if (existing) {
    supabase.removeChannel(existing)
    channels.delete(table)
  }

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
      } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        syncLogger.warn(`Realtime ${status}: ${table} — reconectando en ${RECONNECT_DELAY_MS / 1000}s`)
        channels.delete(table)
        setTimeout(() => subscribeToTable(table), RECONNECT_DELAY_MS)
      }
    })

  channels.set(table, channel)
}

export function startRealtime(): void {
  for (const table of REALTIME_TABLES) {
    subscribeToTable(table)
  }
}

export function stopRealtime(): void {
  for (const channel of channels.values()) {
    supabase.removeChannel(channel)
  }
  channels = new Map()
  syncLogger.info('Realtime desuscrito')
}

async function handleRealtimeChange(
  table: RealtimeTable,
  payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }
): Promise<void> {
  const dexieTable = getTable(table)
  if (!dexieTable) return

  try {
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      // Si hay edición local no sincronizada, preservarla (no sobreescribir con server)
      if (TABLES_WITH_SYNCED.has(table)) {
        const existing = await dexieTable.get(payload.new.id as string)
        if (existing?._synced === false) {
          syncLogger.debug(`Realtime skipped (edición local pendiente): ${table}`, payload.new.id)
          return
        }
      }
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
