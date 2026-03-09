import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight } from 'lucide-react'
import { useSubAssets } from '@/hooks/useAssets'
import { TrafficLight } from '@/components/shared/TrafficLight'
import { useAssetTrafficLight } from '@/hooks/useAssets'

interface SubAssetsListProps {
  parentId: string
}

function SubAssetRow({ assetId, name }: { assetId: string; name: string }) {
  const navigate = useNavigate()
  const light = useAssetTrafficLight(assetId)
  return (
    <button
      type="button"
      onClick={() => navigate(`/assets/${assetId}`)}
      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0"
    >
      <TrafficLight status={light} size="sm" />
      <span className="flex-1 text-sm text-gray-800 text-left">{name}</span>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </button>
  )
}

export function SubAssetsList({ parentId }: SubAssetsListProps) {
  const navigate = useNavigate()
  const subAssets = useSubAssets(parentId)

  if (subAssets === undefined) return null

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2">
        <h2 className="text-sm font-semibold text-gray-700">
          Sub-activos ({subAssets.length})
        </h2>
        <button
          type="button"
          onClick={() => navigate(`/assets/new?parent=${parentId}`)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar
        </button>
      </div>
      {subAssets.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 mx-4 overflow-hidden">
          {subAssets.map((a) => (
            <SubAssetRow key={a.id} assetId={a.id} name={a.name} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 px-4 pb-2">Sin sub-activos</p>
      )}
    </div>
  )
}
