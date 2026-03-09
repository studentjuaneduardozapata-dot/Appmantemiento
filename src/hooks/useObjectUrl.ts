import { useEffect, useState } from 'react'
import { db } from '@/lib/db'

export function useObjectUrl(imageUrl: string | undefined): string | undefined {
  const [src, setSrc] = useState<string | undefined>()

  useEffect(() => {
    if (!imageUrl) {
      setSrc(undefined)
      return
    }

    if (!imageUrl.startsWith('local:')) {
      setSrc(imageUrl)
      return
    }

    let cancelled = false
    let objectUrl: string | undefined

    db.offline_files.get(imageUrl).then((file) => {
      if (cancelled || !file) return
      objectUrl = URL.createObjectURL(file.blob)
      setSrc(objectUrl)
    })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [imageUrl])

  return src
}
