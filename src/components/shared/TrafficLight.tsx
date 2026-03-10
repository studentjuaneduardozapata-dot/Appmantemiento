import { cn } from '@/lib/utils'
import type { TrafficLight as TrafficLightValue } from '@/hooks/useAssets'

interface TrafficLightProps {
  status: TrafficLightValue | undefined
  size?: 'sm' | 'md'
}

const COLOR_MAP: Record<string, { ring: string; dot: string }> = {
  red:    { ring: 'bg-red-100',   dot: 'bg-red-500' },
  yellow: { ring: 'bg-amber-100', dot: 'bg-amber-400' },
  green:  { ring: 'bg-green-100', dot: 'bg-green-500' },
}

const FALLBACK = { ring: 'bg-gray-100', dot: 'bg-gray-300' }

export function TrafficLight({ status, size = 'md' }: TrafficLightProps) {
  const colors = (status && COLOR_MAP[status]) ?? FALLBACK
  const ringSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  const dotSize  = size === 'sm' ? 'w-2 h-2'  : 'w-2.5 h-2.5'

  return (
    <span
      className={cn(
        'rounded-full flex-shrink-0 inline-flex items-center justify-center',
        ringSize,
        colors.ring
      )}
    >
      <span className={cn('rounded-full', dotSize, colors.dot)} />
    </span>
  )
}
