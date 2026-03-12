import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StandardListCardProps {
  title: string
  subtitle?: string
  icon: React.ElementType
  iconBgColor: string
  iconColor: string
  badge?: string | number
  onClick?: () => void
  className?: string
}

export function StandardListCard({
  title,
  subtitle,
  icon: Icon,
  iconBgColor,
  iconColor,
  badge,
  onClick,
  className,
}: StandardListCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ touchAction: 'manipulation' }}
      className={cn(
        'w-full flex items-center p-4 bg-white border border-border rounded-xl mb-3 shadow-sm text-left',
        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none',
        className
      )}
    >
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', iconBgColor)}>
        <Icon className={cn('w-5 h-5', iconColor)} aria-hidden="true" />
      </div>
      <div className="flex-1 ml-3 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {badge !== undefined && (
        <span className="text-xs font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full flex-shrink-0 mx-2">
          {badge}
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
    </button>
  )
}
