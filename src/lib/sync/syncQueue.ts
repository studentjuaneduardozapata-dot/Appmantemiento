import { db, generateId } from '@/lib/db'
import type { SyncOperation } from '@/types'
import { supabase } from '@/integrations/supabase/client'
import { syncLogger } from './syncLogger'
import { reconcileAreaId } from './deduplication'
import { getTable } from './dbAccess'

const MAX_RETRIES = 3

// Transporta qué campo único causó el conflicto para poder reconciliar IDs
class AlreadySyncedError extends Error {
  constructor(
    public readonly conflictField?: string,
    public readonly conflictValue?: unknown,
  ) {
    super('already_synced')
  }
}

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
}

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

export async function purgeInvalidQueueItems(): Promise<void> {
  // areas: 'code' is NOT NULL in Supabase — mark items without it as failed
  await db.sync_queue
    .where('table').equals('areas')
    .and((item) =>
      (item.status === 'pending' || item.status === 'processing') &&
      item.operation !== 'delete' &&
      !item.payload.code
    )
    .modify({ status: 'failed', last_error: 'Payload inválido: campo code requerido' })

  // Requeue items that previously failed with areas_code_key — now se reconcilian correctamente
  await db.sync_queue
    .where('table').equals('areas')
    .and((item) =>
      item.status === 'failed' &&
      !!item.payload.code &&
      typeof item.last_error === 'string' &&
      item.last_error.includes('areas_code_key')
    )
    .modify({ status: 'pending', retry_count: 0 })
}

export async function processPending(): Promise<void> {
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
        await db.sync_queue.update(item.autoId!, { status: 'completed' })
        continue
      }

      const errorMsg = err instanceof Error ? err.message : String(err)
      syncLogger.warn(`Error push ${item.table}#${item.autoId}`, errorMsg)

      await db.sync_queue.update(item.autoId!, {
        status: item.retry_count + 1 >= MAX_RETRIES ? 'failed' : 'pending',
        retry_count: item.retry_count + 1,
        last_error: errorMsg,
      })
    }
  }
}

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
      throw new AlreadySyncedError()
    }
    throw new Error(error.message)
  }
}
