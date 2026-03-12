import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Sheet (Radix Dialog repurposed as a slide-in panel) ──────────────────────

export const Sheet = Dialog.Root
export const SheetPortal = Dialog.Portal
export const SheetClose = Dialog.Close

// Overlay with backdrop-blur
export const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof Dialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof Dialog.Overlay> & { variant?: 'light' | 'dark' }
>(({ className, variant = 'dark', ...props }, ref) => (
  <Dialog.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50',
      variant === 'dark'
        ? 'bg-black/30 backdrop-blur-sm'
        : 'bg-black/20 backdrop-blur-sm',
      className
    )}
    {...props}
  />
))
SheetOverlay.displayName = 'SheetOverlay'

type SheetSide = 'right' | 'bottom'

interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof Dialog.Content> {
  side?: SheetSide
  overlayVariant?: 'light' | 'dark'
}

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  SheetContentProps
>(({ className, children, side = 'right', overlayVariant = 'dark', ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay variant={overlayVariant} />
    <Dialog.Content
      ref={ref}
      aria-modal="true"
      className={cn(
        'fixed z-50 bg-card focus-visible:outline-none',
        side === 'right' && [
          'right-0 top-0 h-full w-full max-w-md',
          'shadow-lg border-l border-border',
          'sheet-right',
          'flex flex-col',
        ],
        side === 'bottom' && [
          'bottom-0 left-0 right-0',
          'max-h-[90vh] rounded-t-2xl',
          'shadow-lg border-t border-border',
          'sheet-bottom',
          'flex flex-col',
        ],
        className
      )}
      {...props}
    >
      {children}
    </Dialog.Content>
  </SheetPortal>
))
SheetContent.displayName = 'SheetContent'

// Header with drag handle for bottom sheets, plain for right sheets
interface SheetHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: SheetSide
}

export function SheetHeader({ className, side = 'right', children, ...props }: SheetHeaderProps) {
  return (
    <div
      className={cn(
        'flex-shrink-0 px-4 border-b border-border bg-card',
        side === 'bottom' ? 'pt-3 pb-3' : 'pt-4 pb-3',
        className
      )}
      {...props}
    >
      {side === 'bottom' && (
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" aria-hidden="true" />
      )}
      {children}
    </div>
  )
}

// Title
export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof Dialog.Title>,
  React.ComponentPropsWithoutRef<typeof Dialog.Title>
>(({ className, ...props }, ref) => (
  <Dialog.Title
    ref={ref}
    className={cn('text-sm font-bold text-foreground font-display capitalize', className)}
    {...props}
  />
))
SheetTitle.displayName = 'SheetTitle'

// Description
export const SheetDescription = React.forwardRef<
  React.ElementRef<typeof Dialog.Description>,
  React.ComponentPropsWithoutRef<typeof Dialog.Description>
>(({ className, ...props }, ref) => (
  <Dialog.Description
    ref={ref}
    className={cn('text-xs text-muted-foreground mt-0.5', className)}
    {...props}
  />
))
SheetDescription.displayName = 'SheetDescription'

// Scrollable body
export function SheetBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex-1 overflow-y-auto', className)} {...props}>
      {children}
    </div>
  )
}

// Footer (sticky at bottom of sheet)
export function SheetFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex-shrink-0 px-4 py-3 border-t border-border bg-card', className)}
      {...props}
    >
      {children}
    </div>
  )
}

// Convenience close button (icon-only X)
export function SheetCloseButton({ label = 'Cerrar' }: { label?: string }) {
  return (
    <Dialog.Close asChild>
      <button
        type="button"
        aria-label={label}
        style={{ touchAction: 'manipulation' }}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="w-5 h-5" aria-hidden="true" />
      </button>
    </Dialog.Close>
  )
}
