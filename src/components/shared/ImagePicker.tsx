import { useRef } from 'react'
import { Camera, X } from 'lucide-react'
import { compressImage } from '@/lib/imageCompression'
import { db, generateId } from '@/lib/db'
import { toast } from 'sonner'
import { useObjectUrl } from '@/hooks/useObjectUrl'

interface ImagePickerProps {
  value?: string
  onChange: (url: string) => void
  onClear?: () => void
}

export function ImagePicker({ value, onChange, onClear }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const previewSrc = useObjectUrl(value)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

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
    }
  }

  function handleClear() {
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
              alt="Vista previa"
              className="w-32 h-32 object-cover rounded-lg border border-border"
            />
          ) : (
            <div className="w-32 h-32 rounded-lg border border-border bg-muted flex items-center justify-center">
              <Camera className="w-8 h-8 text-muted-foreground" />
              <span className="sr-only">Imagen guardada</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Camera className="w-6 h-6 mb-1" />
          <span className="text-xs">Agregar foto</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
