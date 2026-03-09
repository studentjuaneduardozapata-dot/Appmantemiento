import { db } from '@/lib/db'
import { supabase } from '@/integrations/supabase/client'
import { enqueue } from './syncQueue'
import { syncLogger } from './syncLogger'

export async function syncBlobs(): Promise<void> {
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

    // Reemplazar local ID por URL pública en todas las tablas que la referencian
    const affectedAssets = await db.assets.filter((a) => a.image_url === file.id).toArray()
    for (const asset of affectedAssets) {
      await db.assets.update(asset.id, { image_url: publicUrl, _synced: false })
      const updated = await db.assets.get(asset.id)
      if (updated) await enqueue('assets', 'update', updated as unknown as Record<string, unknown>)
    }

    const affectedIncidents = await db.incidents.filter((i) => i.photo_url === file.id).toArray()
    for (const incident of affectedIncidents) {
      await db.incidents.update(incident.id, { photo_url: publicUrl, _synced: false })
      const updated = await db.incidents.get(incident.id)
      if (updated) await enqueue('incidents', 'update', updated as unknown as Record<string, unknown>)
    }

    const affectedLogs = await db.maintenance_logs.filter((l) => l.photo_url === file.id).toArray()
    for (const log of affectedLogs) {
      await db.maintenance_logs.update(log.id, { photo_url: publicUrl, _synced: false })
      const updated = await db.maintenance_logs.get(log.id)
      if (updated) await enqueue('maintenance_logs', 'update', updated as unknown as Record<string, unknown>)
    }

    // Marcar como subida
    await db.offline_files.update(file.id, { uploaded_url: publicUrl })

    syncLogger.info(`Imagen subida: ${file.id} → ${publicUrl}`)
  }
}
