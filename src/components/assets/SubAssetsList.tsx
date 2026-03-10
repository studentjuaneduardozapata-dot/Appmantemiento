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
      className="gmao-list-row px-3 py-2.5"
    >
      <TrafficLight status={light} size="sm" />
      <span className="flex-1 text-sm text-foreground text-left">{name}</span>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
        <h2 className="gmao-section-title">
          Sub-activos ({subAssets.length})
        </h2>
        <button
          type="button"
          onClick={() => navigate(`/assets/new?parent=${parentId}`)}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar
        </button>
      </div>
      {subAssets.length > 0 ? (
        <div className="bg-card rounded-lg border border-border mx-4 overflow-hidden">
          {subAssets.map((a) => (
            <SubAssetRow key={a.id} assetId={a.id} name={a.name} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground px-4 pb-2">Sin sub-activos</p>
      )}
    </div>
  )
}
