import { db } from '@/lib/db'
import { supabase } from '@/integrations/supabase/client'
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
    await db.assets
      .filter((a) => a.image_url === file.id)
      .modify({ image_url: publicUrl, _synced: false })

    await db.incidents
      .filter((i) => i.photo_url === file.id)
      .modify({ photo_url: publicUrl, _synced: false })

    await db.maintenance_logs
      .filter((l) => l.photo_url === file.id)
      .modify({ photo_url: publicUrl, _synced: false })

    // Marcar como subida
    await db.offline_files.update(file.id, { uploaded_url: publicUrl })

    syncLogger.info(`Imagen subida: ${file.id} → ${publicUrl}`)
  }
}
