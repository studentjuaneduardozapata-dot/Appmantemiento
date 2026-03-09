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
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
    >
      <TrafficLight status={light} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{asset.name}</p>
        <p className="text-xs text-gray-500 truncate">
          {categoryName} · {areaName}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
    </button>
  )
}
