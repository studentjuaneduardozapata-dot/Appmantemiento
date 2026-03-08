const MAX_INPUT_BYTES = 20 * 1024 * 1024 // 20 MB
const MAX_WIDTH = 800
const MAX_HEIGHT = 600

export async function compressImage(file: File): Promise<Blob> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Archivo demasiado grande (máx 20 MB)')
  }

  return new Promise<Blob>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const scale = Math.min(MAX_WIDTH / img.width, MAX_HEIGHT / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('No se pudo obtener contexto 2D del canvas'))
        return
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
            return
          }
          // Safari WebP fallback
          canvas.toBlob(
            (jpegBlob) => {
              if (jpegBlob) {
                resolve(jpegBlob)
              } else {
                reject(new Error('No se pudo comprimir la imagen'))
              }
            },
            'image/jpeg',
            0.75
          )
        },
        'image/webp',
        0.75
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('No se pudo cargar la imagen'))
    }

    img.src = objectUrl
  })
}
