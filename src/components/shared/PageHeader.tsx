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
        'sticky top-0 z-10 border-b px-4 py-3 flex items-center justify-between',
        className
      )}
      style={{ borderColor: 'var(--border)' }}
    >
      <div>
        <h1 className="text-lg font-semibold leading-tight" style={{ color: 'var(--text-main)' }}>{title}</h1>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: '#71717a' }}>{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0 ml-3">{action}</div>}
    </div>
  )
}
