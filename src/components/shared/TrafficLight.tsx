import { cn } from '@/lib/utils'
import type { TrafficLight as TrafficLightValue } from '@/hooks/useAssets'

interface TrafficLightProps {
  status: TrafficLightValue | undefined
  size?: 'sm' | 'md'
}

const COLOR_MAP: Record<string, { ring: string; dot: string; label: string }> = {
  red:    { ring: 'bg-red-100',   dot: 'bg-red-500',   label: 'Estado: falla activa' },
  yellow: { ring: 'bg-amber-100', dot: 'bg-amber-400', label: 'Estado: mantenimiento próximo' },
  green:  { ring: 'bg-green-100', dot: 'bg-green-500', label: 'Estado: operativo' },
}

const FALLBACK = { ring: 'bg-gray-100', dot: 'bg-gray-300', label: 'Estado: desconocido' }

export function TrafficLight({ status, size = 'md' }: TrafficLightProps) {
  const colors = (status && COLOR_MAP[status]) ?? FALLBACK
  const ringSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  const dotSize  = size === 'sm' ? 'w-2 h-2'  : 'w-2.5 h-2.5'

  return (
    <span
      role="img"
      aria-label={colors.label}
      className={cn(
        'rounded-full flex-shrink-0 inline-flex items-center justify-center',
        ringSize,
        colors.ring
      )}
    >
      <span className={cn('rounded-full', dotSize, colors.dot)} aria-hidden="true" />
    </span>
  )
}
