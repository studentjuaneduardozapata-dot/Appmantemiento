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
          <Dialog.Title className="font-semibold text-foreground text-base mb-2">
            {title}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground mb-6">
            {description}
          </Dialog.Description>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="gmao-btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg',
                confirmVariant === 'danger'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
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
