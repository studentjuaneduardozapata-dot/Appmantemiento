import { useEffect, useState } from 'react'
import { db } from '@/lib/db'

export function useObjectUrl(imageUrl: string | undefined): string | undefined {
  const [src, setSrc] = useState<string | undefined>()

  useEffect(() => {
    // Limpiar siempre al cambiar imageUrl para evitar mostrar URL revocada (BUG 6)
    setSrc(undefined)

    if (!imageUrl) return

    let cancelled = false
    let objectUrl: string | undefined

    if (!imageUrl.startsWith('local:')) {
      // URL remota: intentar fallback offline buscando blob local por uploaded_url (BUG 2)
      db.offline_files
        .filter((f) => f.uploaded_url === imageUrl)
        .first()
        .then((file) => {
          if (cancelled) return
          if (file) {
            objectUrl = URL.createObjectURL(file.blob)
            setSrc(objectUrl)
          } else {
            // Sin blob local — usar URL directa (funciona online o desde caché SW)
            setSrc(imageUrl)
          }
        })
    } else {
      // URL local: buscar blob por ID en offline_files
      db.offline_files.get(imageUrl).then((file) => {
        if (cancelled || !file) return
        objectUrl = URL.createObjectURL(file.blob)
        setSrc(objectUrl)
      })
    }

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [imageUrl])

  return src
}
