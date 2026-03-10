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

export function AssetCard({ asset, areaName, categoryName, onClick }: AssetCardProps) {
  const light = useAssetTrafficLight(asset.id)

  return (
    <button
      type="button"
      onClick={onClick}
      className="gmao-list-row"
    >
      <TrafficLight status={light} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{asset.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {categoryName} · {areaName}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </button>
  )
}
