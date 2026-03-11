import { db } from '@/lib/db'
import { supabase } from '@/integrations/supabase/client'
import { enqueue } from './syncQueue'
import { syncLogger } from './syncLogger'

export async function syncBlobs(): Promise<void> {
  // Solo procesar blobs que aún no tienen URL subida
  const pending = await db.offline_files
    .filter((f) => !f.uploaded_url)
    .toArray()

  if (pending.length === 0) return

  syncLogger.info(`Subiendo ${pending.length} imágenes pendientes`)

  for (const file of pending) {
    const uuid = file.id.replace('local:', '')
    const ext = file.blob.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `assets/${uuid}.${ext}`

    const { data, error } = await supabase.storage
      .from('gmao-images')
      .upload(path, file.blob, { upsert: true, contentType: file.blob.type })

    if (error) {
      syncLogger.warn(`Error subiendo imagen ${file.id}`, error.message)
      continue
    }

    const { data: urlData } = supabase.storage
      .from('gmao-images')
      .getPublicUrl(data.path)

    const publicUrl = urlData.publicUrl

    // Transacción atómica: todos los updates de Dexie o ninguno.
    // Si falla aquí, el blob aún no tiene uploaded_url y se reintentará en el próximo sync.
    // El upsert:true en Supabase Storage hace esto idempotente.
    try {
      await db.transaction(
        'rw',
        [db.assets, db.incidents, db.maintenance_logs, db.offline_files, db.sync_queue],
        async () => {
          // Reemplazar local ID por URL pública en activos
          const affectedAssets = await db.assets.filter((a) => a.image_url === file.id).toArray()
          for (const asset of affectedAssets) {
            await db.assets.update(asset.id, { image_url: publicUrl, _synced: false })
            const updated = await db.assets.get(asset.id)
            if (updated) await enqueue('assets', 'update', updated as unknown as Record<string, unknown>)
          }

          // Reemplazar en incidentes
          const affectedIncidents = await db.incidents.filter((i) => i.photo_url === file.id).toArray()
          for (const incident of affectedIncidents) {
            await db.incidents.update(incident.id, { photo_url: publicUrl, _synced: false })
            const updated = await db.incidents.get(incident.id)
            if (updated) await enqueue('incidents', 'update', updated as unknown as Record<string, unknown>)
          }

          // Reemplazar en logs de mantenimiento
          const affectedLogs = await db.maintenance_logs.filter((l) => l.photo_url === file.id).toArray()
          for (const log of affectedLogs) {
            await db.maintenance_logs.update(log.id, { photo_url: publicUrl, _synced: false })
            const updated = await db.maintenance_logs.get(log.id)
            if (updated) await enqueue('maintenance_logs', 'update', updated as unknown as Record<string, unknown>)
          }

          // BUG 4: Desbloquear items zombi en sync_queue cuyo payload aún tiene el blob local ID.
          // Al reemplazar el ID por la URL pública, el processPending podrá enviarlos a Supabase.
          const zombieItems = await db.sync_queue
            .filter(
              (item) =>
                (item.status === 'pending' || item.status === 'processing') &&
                Object.values(item.payload).some((v) => v === file.id)
            )
            .toArray()
          for (const zombie of zombieItems) {
            const updatedPayload = Object.fromEntries(
              Object.entries(zombie.payload).map(([k, v]) => [k, v === file.id ? publicUrl : v])
            )
            await db.sync_queue.update(zombie.autoId!, {
              payload: updatedPayload,
              status: 'pending',
              retry_count: 0,
              last_error: undefined,
            })
          }

          // BUG 2: Conservar el blob local como fallback offline (NO eliminar).
          // Se marca con uploaded_url para que no se vuelva a procesar.
          // La limpieza se hace en purgeOldBlobs() después de 30 días.
          await db.offline_files.update(file.id, { uploaded_url: publicUrl })
        }
      )

      syncLogger.info(`Imagen subida, blob conservado con URL: ${file.id} → ${publicUrl}`)
    } catch (txErr) {
      syncLogger.warn(`Error al actualizar referencias de imagen ${file.id}`, txErr)
    }
  }
}

// Limpieza periódica: elimina blobs locales que ya fueron subidos hace más de 30 días.
// El blob se conserva durante 30 días para servir como fallback offline después del sync.
export async function purgeOldBlobs(): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const deleted = await db.offline_files
    .filter((f) => !!f.uploaded_url && f.created_at < thirtyDaysAgo)
    .delete()
  if (deleted > 0) syncLogger.info(`Blobs locales viejos eliminados: ${deleted}`)
}
