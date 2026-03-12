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
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" aria-hidden="true" />
        <Dialog.Content className="fixed z-50 bg-card rounded-xl shadow-xl p-6 w-[calc(100%-2rem)] max-w-sm left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Dialog.Title className="font-semibold font-display text-foreground text-base mb-2">
            {title}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground mb-6">
            {description}
          </Dialog.Description>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              style={{ touchAction: 'manipulation' }}
              className="gmao-btn-secondary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              style={{ touchAction: 'manipulation' }}
              className={cn(
                'px-4 py-2 text-sm font-semibold font-display rounded-md',
                'focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
                confirmVariant === 'danger'
                  ? 'bg-destructive text-destructive-foreground hover:brightness-90 focus-visible:ring-destructive'
                  : 'bg-primary text-primary-foreground hover:brightness-93 focus-visible:ring-primary'
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
