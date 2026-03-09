import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Printer } from 'lucide-react'
import { generateQRDataURL, printQR } from '@/lib/qr'

interface QRModalProps {
  open: boolean
  onClose: () => void
  assetId: string
  assetName: string
}

export function QRModal({ open, onClose, assetId, assetName }: QRModalProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDataUrl(null)
    generateQRDataURL(assetId).then(setDataUrl).catch(console.error)
  }, [open, assetId])

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed z-50 bg-white rounded-xl shadow-xl p-6 w-[calc(100%-2rem)] max-w-xs left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
          <div className="flex items-center justify-between w-full">
            <Dialog.Title className="font-semibold text-gray-900 text-base">
              Código QR
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {dataUrl ? (
            <img
              src={dataUrl}
              alt={`QR de ${assetName}`}
              className="w-56 h-56"
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center bg-gray-100 rounded">
              <p className="text-sm text-gray-400">Generando...</p>
            </div>
          )}

          <p className="text-sm font-medium text-gray-700 text-center">{assetName}</p>
          <p className="text-xs text-gray-400 text-center break-all">{assetId}</p>

          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cerrar
            </button>
            {dataUrl && (
              <button
                type="button"
                onClick={() => printQR(assetId, assetName, dataUrl)}
                className="flex-1 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
