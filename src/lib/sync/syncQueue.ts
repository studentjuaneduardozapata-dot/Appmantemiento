import { db, generateId } from '@/lib/db'
import type { SyncOperation, SyncQueueItem } from '@/types'
import { supabase } from '@/integrations/supabase/client'
import { networkStatus } from './networkStatus'
import { syncLogger } from './syncLogger'
import { reconcileAreaId, reconcileCategoryId } from './deduplication'
import { getTable } from './dbAccess'

const MAX_RETRIES = 3

// ─── Hot path injection (evita import circular con syncManager) ────────────────

let _pushTrigger: (() => void) | null = null
let _debounceTimer: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_MS = 300

/** Inyectado por syncManager.start() para disparar push inmediato sin import circular. */
export function setPushTrigger(fn: (() => void) | null): void {
  _pushTrigger = fn
}

// ─── Backoff exponencial en memoria (sin cambio de schema) ────────────────────

const _lastAttempt = new Map<number, number>() // autoId → timestamp del último intento

function getBackoffMs(retryCount: number): number {
  // 1s, 2s, 4s, 8s, 16s, 32s, máx 60s
  return Math.min(1000 * Math.pow(2, retryCount - 1), 60_000)
}

function shouldSkipDueToBackoff(item: SyncQueueItem): boolean {
  if (item.retry_count === 0) return false
  const last = _lastAttempt.get(item.autoId!)
  if (!last) return false
  return Date.now() - last < getBackoffMs(item.retry_count)
}

// ─── Patrones de error de validación (no recuperables — quedan failed) ────────

const VALIDATION_ERROR_PATTERNS = [
  'Payload inválido',
  'id no es un UUID',
  'campo code requerido',
]

function isValidationError(msg: string | undefined): boolean {
  if (!msg) return false
  return VALIDATION_ERROR_PATTERNS.some((p) => msg.includes(p))
}

// ─── Transporta qué campo único causó el conflicto para reconciliar IDs ───────
class AlreadySyncedError extends Error {
  constructor(
    public readonly conflictField?: string,
    public readonly conflictValue?: unknown,
  ) {
    super('already_synced')
  }
}

// ─── enqueue ──────────────────────────────────────────────────────────────────

export async function enqueue(
  table: string,
  operation: SyncOperation,
  payload: Record<string, unknown>
): Promise<void> {
  await db.sync_queue.add({
    table,
    operation,
    payload,
    status: 'pending',
    retry_count: 0,
    created_at: new Date().toISOString(),
  })

  // Hot path: si hay red, disparar push inmediato (debounced 300ms para agrupar escrituras)
  if (_pushTrigger && networkStatus.isOnline) {
    if (_debounceTimer) clearTimeout(_debounceTimer)
    _debounceTimer = setTimeout(() => {
      _debounceTimer = null
      _pushTrigger?.()
    }, DEBOUNCE_MS)
  }
}

// ─── purge ────────────────────────────────────────────────────────────────────

export async function purgeCompletedQueueItems(): Promise<void> {
  const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString()
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

  await db.sync_queue
    .where('status').equals('completed')
    .and((item) => (item.created_at ?? '') < oneDayAgo)
    .delete()

  await db.sync_queue
    .where('status').equals('failed')
    .and((item) => (item.created_at ?? '') < sevenDaysAgo)
    .delete()
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUUID(value: unknown): boolean {
  return typeof value === 'string' && UUID_REGEX.test(value)
}

export async function purgeInvalidQueueItems(): Promise<void> {
  // areas: 'code' is NOT NULL en Supabase — marcar items sin él como failed
  await db.sync_queue
    .where('table').equals('areas')
    .and((item) =>
      (item.status === 'pending' || item.status === 'processing') &&
      item.operation !== 'delete' &&
      !item.payload.code
    )
    .modify({ status: 'failed', last_error: 'Payload inválido: campo code requerido' })

  // Requeue items que fallaron con areas_code_key — ahora se reconcilian correctamente
  await db.sync_queue
    .where('table').equals('areas')
    .and((item) =>
      item.status === 'failed' &&
      !!item.payload.code &&
      typeof item.last_error === 'string' &&
      item.last_error.includes('areas_code_key')
    )
    .modify({ status: 'pending', retry_count: 0 })

  // Cualquier tabla: 'id' debe ser UUID válido — Supabase rechaza con 400 si no lo es
  await db.sync_queue
    .filter((item) =>
      (item.status === 'pending' || item.status === 'processing') &&
      item.operation !== 'delete' &&
      !isValidUUID(item.payload.id)
    )
    .modify({ status: 'failed', last_error: 'Payload inválido: id no es un UUID válido' })
}

/**
 * Re-encola items con status='failed' que sean recuperables:
 * - retry_count < MAX_RETRIES
 * - error NO es de validación (esos quedan failed permanentemente)
 * - creado hace más de 1 hora (para no re-intentar los recién fallados)
 */
export async function requeueRecoverableFailed(): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString()

  await db.sync_queue
    .where('status').equals('failed')
    .and((item) =>
      item.retry_count < MAX_RETRIES &&
      !isValidationError(item.last_error) &&
      (item.created_at ?? '') < oneHourAgo
    )
    .modify({ status: 'pending', last_error: undefined })
}

// ─── processPending ───────────────────────────────────────────────────────────

export async function processPending(): Promise<void> {
  // Primero re-encolar items recuperables que llevan > 1h en failed
  await requeueRecoverableFailed()

  const pending = await db.sync_queue
    .where('status')
    .anyOf(['pending', 'processing'])
    .toArray()

  if (pending.length === 0) return

  syncLogger.info(`Procesando ${pending.length} items en cola`)

  for (const item of pending) {
    if (item.retry_count >= MAX_RETRIES) {
      await db.sync_queue.update(item.autoId!, { status: 'failed' })
      continue
    }

    // Backoff exponencial: saltar items retentados demasiado recientemente
    if (shouldSkipDueToBackoff(item)) {
      syncLogger.debug(`Backoff: skip ${item.table}#${item.autoId} (retry ${item.retry_count})`)
      continue
    }

    await db.sync_queue.update(item.autoId!, { status: 'processing' })

    try {
      // Saltar items cuyo payload todavía referencia un blob local no subido
      const hasLocalRef = Object.values(item.payload).some(
        (v) => typeof v === 'string' && v.startsWith('local:')
      )
      if (hasLocalRef) {
        await db.sync_queue.update(item.autoId!, { status: 'pending' })
        continue
      }

      await pushToSupabase(item.table, item.operation, item.payload)

      await db.sync_queue.update(item.autoId!, { status: 'completed' })

      const recordId = item.payload.id as string | undefined
      if (recordId && item.operation !== 'delete') {
        try {
          await getTable(item.table)?.update(recordId, { _synced: true })
        } catch {
          // El registro puede no existir localmente (delete)
        }
      }
    } catch (err) {
      if (err instanceof AlreadySyncedError) {
        // Unique constraint: el registro ya existe en Supabase bajo otro ID
        if (item.table === 'areas' && err.conflictField === 'code' && err.conflictValue) {
          await reconcileAreaId(item.payload.id as string, err.conflictValue as string)
        }
        if (item.table === 'asset_categories' && err.conflictField === 'name' && err.conflictValue) {
          await reconcileCategoryId(item.payload.id as string, err.conflictValue as string)
        }
        await db.sync_queue.update(item.autoId!, { status: 'completed' })
        continue
      }

      const errorMsg = err instanceof Error ? err.message : String(err)
      syncLogger.warn(`Error push ${item.table}#${item.autoId}`, errorMsg)

      // Registrar timestamp del intento fallido para backoff
      _lastAttempt.set(item.autoId!, Date.now())

      await db.sync_queue.update(item.autoId!, {
        status: item.retry_count + 1 >= MAX_RETRIES ? 'failed' : 'pending',
        retry_count: item.retry_count + 1,
        last_error: errorMsg,
      })

      // Rate limit: abortar el lote actual para no seguir acumulando errores 429
      const is429 = errorMsg.includes('429') || errorMsg.toLowerCase().includes('rate limit')
      if (is429) {
        syncLogger.warn('Rate limit (429) detectado — abortando lote actual')
        break
      }
    }
  }
}

// ─── pushToSupabase ───────────────────────────────────────────────────────────

async function pushToSupabase(
  table: string,
  operation: SyncOperation,
  payload: Record<string, unknown>
): Promise<void> {
  if (operation === 'delete') {
    const { error } = await supabase
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', payload.id)
    if (error) throw new Error(error.message)

    await supabase.from('deleted_records').upsert({
      id: generateId(),
      table_name: table,
      record_id: payload.id,
      deleted_at: new Date().toISOString(),
    })
    return
  }

  const clean = Object.fromEntries(
    Object.entries(payload)
      .filter(([k]) => !k.startsWith('_') && k !== 'autoId')
      .map(([k, v]) => [k, v === '' ? null : v])
  )
  const { error } = await supabase.from(table).upsert(clean)
  if (error) {
    if (error.code === '23505') {
      // Detectar qué constraint causó el conflicto para poder reconciliar
      if (table === 'areas' && error.message.includes('areas_code_key')) {
        throw new AlreadySyncedError('code', payload.code)
      }
      if (table === 'asset_categories' && error.message.includes('asset_categories_name_key')) {
        throw new AlreadySyncedError('name', payload.name)
      }
      throw new AlreadySyncedError()
    }
    throw new Error(error.message)
  }
}
