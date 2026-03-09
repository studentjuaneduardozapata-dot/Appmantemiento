import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { toast } from 'sonner'
import { db } from '@/lib/db'
import { PageHeader } from '@/components/shared/PageHeader'

export default function ScanPage() {
  const navigate = useNavigate()
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mountRef.current) return

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    )

    scanner.render(
      async (decodedText: string, _result: unknown) => {
        // Detener escáner inmediatamente
        try {
          await scanner.clear()
        } catch {
          // ignorar errores al limpiar
        }

        const asset = await db.assets.get(decodedText)
        if (asset && !asset.deleted_at) {
          navigate(`/assets/${decodedText}`, { replace: true })
        } else {
          toast.error('Activo no encontrado', {
            description: 'El código QR no corresponde a ningún activo registrado.',
          })
          // Reiniciar escáner
          scanner.render(
            async (text: string, _r: unknown) => {
              const found = await db.assets.get(text)
              if (found && !found.deleted_at) {
                navigate(`/assets/${text}`, { replace: true })
              } else {
                toast.error('Activo no encontrado')
              }
            },
            (_err: unknown) => { /* ignorar errores de escaneo */ }
          )
        }
      },
      (_error: unknown) => {
        // Ignorar errores de frame (son frecuentes durante el escaneo)
      }
    )

    scannerRef.current = scanner

    return () => {
      scanner.clear().catch(() => { /* ignorar */ })
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Escanear QR" />
      <div className="px-4 py-4">
        <p className="text-sm text-gray-500 mb-4 text-center">
          Apunta la cámara al código QR del activo
        </p>
        <div
          ref={mountRef}
          id="qr-reader"
          className="bg-white rounded-xl overflow-hidden border border-gray-200"
        />
      </div>
    </div>
  )
}
