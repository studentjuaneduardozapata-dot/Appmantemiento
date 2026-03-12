import { useRef, useState } from 'react'
import { Camera, Image as ImageIcon, X } from 'lucide-react'
import { compressImage } from '@/lib/imageCompression'
import { db, generateId } from '@/lib/db'
import { toast } from 'sonner'
import { useObjectUrl } from '@/hooks/useObjectUrl'

interface ImagePickerProps {
  value?: string
  onChange: (url: string) => void
  onClear?: () => void
  /** Notifica al padre cuando la compresión está en curso para bloquear el submit (BUG 1) */
  onLoadingChange?: (loading: boolean) => void
}

export function ImagePicker({ value, onChange, onClear, onLoadingChange }: ImagePickerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const previewSrc = useObjectUrl(value)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    // BUG 1: señalar inicio de compresión para bloquear el submit del formulario padre
    setIsCompressing(true)
    onLoadingChange?.(true)

    try {
      const blob = await compressImage(file)
      const localId = 'local:' + generateId()
      await db.offline_files.add({
        id: localId,
        blob,
        created_at: new Date().toISOString(),
      })
      onChange(localId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al procesar imagen')
    } finally {
      // BUG 1: señalar fin de compresión siempre (éxito o error)
      setIsCompressing(false)
      onLoadingChange?.(false)
    }
  }

  async function handleClear() {
    // BUG 3: eliminar blob huérfano de offline_files al limpiar la imagen
    if (value?.startsWith('local:')) {
      await db.offline_files.delete(value).catch(() => {
        // Ignorar si ya no existe
      })
    }
    onClear?.()
    onChange('')
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative inline-block">
          {previewSrc ? (
            <img
              src={previewSrc}
              alt="Vista previa de la imagen seleccionada"
              width={128}
              height={128}
              className="w-32 h-32 object-cover rounded-lg border border-border"
            />
          ) : (
            <div className="w-32 h-32 rounded-lg border border-border bg-muted flex items-center justify-center">
              <Camera className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Imagen guardada localmente</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleClear}
            aria-label="Quitar imagen"
            style={{ touchAction: 'manipulation' }}
            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        // BUG 5: dos botones separados — Cámara (capture) y Galería (sin capture)
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isCompressing}
            onClick={() => cameraInputRef.current?.click()}
            aria-label={isCompressing ? 'Procesando imagen\u2026' : 'Tomar foto con c\u00e1mara'}
            style={{ touchAction: 'manipulation' }}
            className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <Camera className="w-6 h-6 mb-1" aria-hidden="true" />
            <span className="text-xs">{isCompressing ? 'Procesando\u2026' : 'C\u00e1mara'}</span>
          </button>
          <button
            type="button"
            disabled={isCompressing}
            onClick={() => galleryInputRef.current?.click()}
            aria-label="Seleccionar imagen de galería"
            style={{ touchAction: 'manipulation' }}
            className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <ImageIcon className="w-6 h-6 mb-1" aria-hidden="true" />
            <span className="text-xs">Galer\u00eda</span>
          </button>
        </div>
      )}

      {/* Input para cámara directa */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      {/* Input para galería (sin capture — permite selección de archivo existente) */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
