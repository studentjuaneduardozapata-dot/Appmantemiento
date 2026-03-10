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
      className={cn(
        'w-full flex items-center p-4 bg-white border border-gray-100 rounded-xl mb-3 shadow-sm text-left',
        className
      )}
    >
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', iconBgColor)}>
        <Icon className={cn('w-5 h-5', iconColor)} />
      </div>
      <div className="flex-1 ml-3 min-w-0">
        <p className="font-semibold text-sm text-gray-900 truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {badge !== undefined && (
        <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex-shrink-0 mx-2">
          {badge}
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
    </button>
  )
}
