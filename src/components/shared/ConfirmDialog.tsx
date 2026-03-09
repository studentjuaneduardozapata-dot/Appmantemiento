import * as Dialog from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  confirmVariant?: 'danger' | 'default'
}

export function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmar',
  confirmVariant = 'default',
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed z-50 bg-card rounded-xl shadow-xl p-6 w-[calc(100%-2rem)] max-w-sm left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Dialog.Title className="font-semibold text-gray-900 text-base mb-2">
            {title}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-gray-600 mb-6">
            {description}
          </Dialog.Description>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg text-white',
                confirmVariant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-primary hover:bg-primary/90'
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
