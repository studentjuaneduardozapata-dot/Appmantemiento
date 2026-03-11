import { db } from '@/lib/db'
import { supabase } from '@/integrations/supabase/client'
import { syncLogger } from './syncLogger'

/**
 * Antes de hacer bulkPut de áreas de Supabase, buscamos si ya existe un registro
 * local con el mismo `code` pero distinto `id` (creado offline antes del primer pull).
 * Redirigimos referencias y eliminamos el duplicado para que solo quede el ID canónico.
 */
export async function deduplicateAreasByCode(pulledAreas: Record<string, unknown>[]): Promise<void> {
  for (const sa of pulledAreas) {
    if (!sa.code) continue

    const dups = await db.areas
      .where('code').equals(sa.code as string)
      .filter((a) => a.id !== (sa.id as string))
      .toArray()

    for (const dup of dups) {
      const canonicalId = sa.id as string

      // Redirigir activos que referencian el ID duplicado
      await db.assets
        .where('area_id').equals(dup.id)
        .modify({ area_id: canonicalId, _synced: false })

      // Actualizar payloads en cola pendiente para que usen el ID canónico
      await db.sync_queue
        .where('table').equals('assets')
        .and((item) =>
          (item.status === 'pending' || item.status === 'processing') &&
          (item.payload as Record<string, unknown>).area_id === dup.id
        )
        .modify((item) => {
          item.payload = { ...item.payload, area_id: canonicalId }
        })

      // También actualizar payloads del área duplicada en cola (ahora innecesarios)
      await db.sync_queue
        .where('table').equals('areas')
        .and((item) =>
          (item.status === 'pending' || item.status === 'processing') &&
          (item.payload as Record<string, unknown>).id === dup.id
        )
        .modify({ status: 'completed' })

      await db.areas.delete(dup.id)
      syncLogger.info(`Área duplicada eliminada: ${dup.id} → ${canonicalId} (code: ${sa.code})`)
    }
  }
}

/**
 * Antes de hacer bulkPut de categorías de Supabase, buscamos si ya existe un registro
 * local con el mismo `name` pero distinto `id` (creado offline con ID diferente).
 * Redirigimos referencias en assets y eliminamos el duplicado.
 */
export async function deduplicateCategoriesByName(pulledCats: Record<string, unknown>[]): Promise<void> {
  for (const sc of pulledCats) {
    if (!sc.name) continue

    const dups = await db.asset_categories
      .where('name').equals(sc.name as string)
      .filter((c) => c.id !== (sc.id as string))
      .toArray()

    for (const dup of dups) {
      const canonicalId = sc.id as string

      // Redirigir activos que referencian el ID duplicado
      await db.assets
        .where('category_id').equals(dup.id)
        .modify({ category_id: canonicalId, _synced: false })

      // Marcar cola de sync del duplicado como completada
      await db.sync_queue
        .where('table').equals('asset_categories')
        .and((item) =>
          (item.status === 'pending' || item.status === 'processing') &&
          (item.payload as Record<string, unknown>).id === dup.id
        )
        .modify({ status: 'completed' })

      await db.asset_categories.delete(dup.id)
      syncLogger.info(`Categoría duplicada eliminada: ${dup.id} → ${canonicalId} (name: ${sc.name})`)
    }
  }
}

/**
 * Cuando Supabase rechaza una categoría por name duplicado (23505), busca el registro
 * canónico en Supabase, actualiza Dexie con ese ID y redirige referencias en assets.
 */
export async function reconcileCategoryId(localId: string, name: string): Promise<void> {
  try {
    const { data: canonical, error } = await supabase
      .from('asset_categories')
      .select('*')
      .eq('name', name)
      .maybeSingle()

    if (error || !canonical) {
      syncLogger.warn(`reconcileCategoryId: no se encontró categoría canónica para name=${name}`)
      return
    }

    const canonicalId = canonical.id as string
    if (canonicalId === localId) return

    // Guardar versión canónica de Supabase en Dexie
    await db.asset_categories.put(canonical)

    // Redirigir activos que referencian el ID local al ID canónico
    await db.assets
      .where('category_id').equals(localId)
      .modify({ category_id: canonicalId, _synced: false })

    // Actualizar payloads en cola pendiente (assets que aún no se han enviado)
    await db.sync_queue
      .where('table').equals('assets')
      .and((item) =>
        (item.status === 'pending' || item.status === 'processing') &&
        (item.payload as Record<string, unknown>).category_id === localId
      )
      .modify((item) => {
        item.payload = { ...item.payload, category_id: canonicalId }
      })

    // Eliminar la categoría duplicada local
    await db.asset_categories.delete(localId)

    syncLogger.info(`Categoría reconciliada: ${localId} → ${canonicalId} (name: ${name})`)
  } catch (err) {
    syncLogger.warn(`Error en reconcileCategoryId(${localId}, ${name})`, err)
  }
}

/**
 * Cuando Supabase rechaza un área por code duplicado, esto significa que la tabla
 * ya tiene un área canónica con ese code (distinto ID). Actualizamos Dexie para
 * usar el ID canónico y redirigimos todas las referencias.
 */
export async function reconcileAreaId(localId: string, code: string): Promise<void> {
  try {
    const { data: canonical, error } = await supabase
      .from('areas')
      .select('*')
      .eq('code', code)
      .maybeSingle()

    if (error || !canonical) {
      syncLogger.warn(`reconcileAreaId: no se encontró área canónica para code=${code}`)
      return
    }

    const canonicalId = canonical.id as string
    if (canonicalId === localId) return

    // Guardar versión canónica de Supabase en Dexie
    await db.areas.put(canonical)

    // Redirigir activos que referencian el ID local al ID canónico
    await db.assets
      .where('area_id').equals(localId)
      .modify({ area_id: canonicalId, _synced: false })

    // Actualizar payloads en cola pendiente (assets que aún no se han enviado)
    await db.sync_queue
      .where('table').equals('assets')
      .and((item) =>
        (item.status === 'pending' || item.status === 'processing') &&
        (item.payload as Record<string, unknown>).area_id === localId
      )
      .modify((item) => {
        item.payload = { ...item.payload, area_id: canonicalId }
      })

    // Eliminar el área duplicada local
    await db.areas.delete(localId)

    syncLogger.info(`Área reconciliada: ${localId} → ${canonicalId} (code: ${code})`)
  } catch (err) {
    syncLogger.warn(`Error en reconcileAreaId(${localId}, ${code})`, err)
  }
}
