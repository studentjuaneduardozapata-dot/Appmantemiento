import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Context ──────────────────────────────────────────────────────────────────

interface AccordionCtx {
  open: Set<string>
  toggle: (value: string) => void
}

const AccordionContext = createContext<AccordionCtx>({
  open: new Set(),
  toggle: () => {},
})

const AccordionItemContext = createContext<string>('')

// ─── Components ───────────────────────────────────────────────────────────────

export function Accordion({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const [open, setOpen] = useState<Set<string>>(new Set())

  function toggle(value: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(value) ? next.delete(value) : next.add(value)
      return next
    })
  }

  return (
    <AccordionContext.Provider value={{ open, toggle }}>
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  )
}

export function AccordionItem({
  value,
  children,
}: {
  value: string
  children: ReactNode
}) {
  return (
    <AccordionItemContext.Provider value={value}>
      <div className="border-b border-border last:border-0">{children}</div>
    </AccordionItemContext.Provider>
  )
}

export function AccordionTrigger({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { open, toggle } = useContext(AccordionContext)
  const value = useContext(AccordionItemContext)
  const isOpen = open.has(value)

  return (
    <button
      type="button"
      onClick={() => toggle(value)}
      className={cn(
        'flex items-center w-full px-4 py-3 text-sm font-medium text-left hover:bg-accent',
        className
      )}
    >
      <span className="flex-1">{children}</span>
      <ChevronDown
        className={cn(
          'w-4 h-4 text-muted-foreground transition-transform duration-200',
          isOpen && 'rotate-180'
        )}
      />
    </button>
  )
}

export function AccordionContent({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { open } = useContext(AccordionContext)
  const value = useContext(AccordionItemContext)

  if (!open.has(value)) return null

  return <div className={cn('', className)}>{children}</div>
}
