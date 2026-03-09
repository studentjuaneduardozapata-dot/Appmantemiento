import { db, generateId } from '@/lib/db'
import type { SyncOperation } from '@/types'
import { supabase } from '@/integrations/supabase/client'
import { syncLogger } from './syncLogger'

const MAX_RETRIES = 3

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
      await pushToSupabase(item.table, item.operation, item.payload)

      // Marca el item como completado
      await db.sync_queue.update(item.autoId!, { status: 'completed' })

      // Marca el registro original como synced
      const recordId = item.payload.id as string | undefined
      if (recordId && item.operation !== 'delete') {
        try {
          await (db as unknown as Record<string, { update: (id: string, changes: object) => Promise<unknown> }>)[item.table]?.update(recordId, { _synced: true })
        } catch {
          // El registro puede no existir localmente (delete)
        }
      }
    } catch (err) {
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

    // Registrar en deleted_records
    await supabase.from('deleted_records').upsert({
      id: generateId(),
      table_name: table,
      record_id: payload.id,
      deleted_at: new Date().toISOString(),
    })
    return
  }

  // Eliminar campos internos de Dexie y convertir strings vacíos a null
  const clean = Object.fromEntries(
    Object.entries(payload)
      .filter(([k]) => !k.startsWith('_') && k !== 'autoId')
      .map(([k, v]) => [k, v === '' ? null : v])
  )
  const { error } = await supabase.from(table).upsert(clean)
  if (error) throw new Error(error.message)
}
