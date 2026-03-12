import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  syncStatus?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, action, syncStatus, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-10 bg-white border-b-2 border-primary px-4 py-3 flex items-center justify-between',
        className
      )}
    >
      <div>
        <h1 className="text-lg font-bold font-display text-foreground leading-tight">{title}</h1>
        {subtitle && <p className="text-xs mt-0.5 text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        {syncStatus}
        {action}
      </div>
    </div>
  )
}
