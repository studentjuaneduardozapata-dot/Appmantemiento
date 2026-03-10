import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center justify-between',
        className
      )}
    >
      <div>
        <h1 className="text-lg font-semibold text-foreground leading-tight">{title}</h1>
        {subtitle && <p className="text-xs mt-0.5 text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0 ml-3">{action}</div>}
    </div>
  )
}
