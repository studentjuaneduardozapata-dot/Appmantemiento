import { ChevronRight } from 'lucide-react'
import { TrafficLight } from '@/components/shared/TrafficLight'
import { useAssetTrafficLight } from '@/hooks/useAssets'
import type { Asset } from '@/lib/db'

interface AssetCardProps {
  asset: Asset
  areaName: string
  categoryName: string
  onClick?: () => void
}

const STRIP_MAP = {
  red:    'strip-red',
  yellow: 'strip-amber',
  green:  'strip-green',
} as const

export function AssetCard({ asset, areaName, categoryName, onClick }: AssetCardProps) {
  const light = useAssetTrafficLight(asset.id)
  const strip = light ? STRIP_MAP[light] : 'strip-gray'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`gmao-list-row ${strip}`}
    >
      <TrafficLight status={light} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{asset.name}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          <span className="gmao-mono">{categoryName}</span>
          <span className="mx-1.5 opacity-40">·</span>
          {areaName}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
    </button>
  )
}
