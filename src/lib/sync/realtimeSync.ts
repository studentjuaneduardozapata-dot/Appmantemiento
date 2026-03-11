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
  'task_steps',
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
  'task_steps',
])

// Backoff exponencial para reconexión: 10s, 20s, 40s... máx 5 minutos
const RECONNECT_BASE_MS = 10_000
const RECONNECT_MAX_MS = 5 * 60_000

const _reconnectAttempts = new Map<RealtimeTable, number>()

function getReconnectDelay(table: RealtimeTable): number {
  const attempt = _reconnectAttempts.get(table) ?? 0
  return Math.min(RECONNECT_BASE_MS * Math.pow(2, attempt), RECONNECT_MAX_MS)
}

let channels: Map<RealtimeTable, RealtimeChannel> = new Map()

function subscribeToTable(table: RealtimeTable): void {
  // Eliminar del mapa ANTES de llamar removeChannel para que el callback
  // CLOSED del canal viejo no programe un reconnect innecesario
  const existing = channels.get(table)
  if (existing) {
    channels.delete(table)
    supabase.removeChannel(existing)
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
        _reconnectAttempts.delete(table) // Reset en conexión exitosa
        syncLogger.debug(`Realtime suscrito: ${table}`)
      } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        // Solo reconectar si este canal es todavía el activo (no fue reemplazado)
        if (channels.get(table) !== channel) return

        const attempt = _reconnectAttempts.get(table) ?? 0
        _reconnectAttempts.set(table, attempt + 1)
        const delay = getReconnectDelay(table)

        syncLogger.warn(
          `Realtime ${status}: ${table} — reconectando en ${delay / 1000}s (intento ${attempt + 1})`
        )
        channels.delete(table)
        setTimeout(() => subscribeToTable(table), delay)
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
  const toRemove = [...channels.values()]
  channels = new Map() // Limpiar primero para que CLOSED no programe reconnects
  _reconnectAttempts.clear()
  for (const channel of toRemove) {
    supabase.removeChannel(channel)
  }
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
