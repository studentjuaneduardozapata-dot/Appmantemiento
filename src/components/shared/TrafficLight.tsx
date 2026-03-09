import { cn } from '@/lib/utils'
import type { TrafficLight as TrafficLightValue } from '@/hooks/useAssets'

interface TrafficLightProps {
  status: TrafficLightValue | undefined
  size?: 'sm' | 'md'
}

export function TrafficLight({ status, size = 'md' }: TrafficLightProps) {
  return (
    <span
      className={cn(
        'rounded-full flex-shrink-0 inline-block',
        size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5',
        status === 'red' && 'bg-red-500',
        status === 'yellow' && 'bg-amber-400',
        status === 'green' && 'bg-green-500',
        status === undefined && 'bg-gray-300'
      )}
    />
  )
}
