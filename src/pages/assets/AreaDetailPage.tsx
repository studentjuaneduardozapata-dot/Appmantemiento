import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, ChevronRight, ArrowLeft } from 'lucide-react'
import { db } from '@/lib/db'
import type { Asset } from '@/lib/db'
import { useAssetTrafficLight } from '@/hooks/useAssets'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { TrafficLight } from '@/components/shared/TrafficLight'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'

// ─── Fila de activo con miniatura ─────────────────────────────────────────────

interface AssetRowProps {
  asset: Asset
  onClick: () => void
}

function AssetRowWithThumb({ asset, onClick }: AssetRowProps) {
  const light = useAssetTrafficLight(asset.id)
  const thumbSrc = useObjectUrl(asset.image_url)
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/50 border-t border-border first:border-t-0"
    >
      {thumbSrc ? (
        <img
          src={thumbSrc}
          alt=""
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-muted flex-shrink-0" />
      )}
      <TrafficLight status={light} size="sm" />
      <span className="flex-1 text-sm font-medium text-foreground truncate">{asset.name}</span>
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </button>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function AreaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const area = useLiveQuery(() => db.areas.get(id!), [id])

  const assets = useLiveQuery(
    () => db.assets.filter((a) => !a.deleted_at && a.area_id === id).toArray(),
    [id]
  )

  const categories = useLiveQuery(
    () => db.asset_categories.filter((c) => !c.deleted_at).toArray()
  )

  const groupedByCat = useMemo(() => {
    if (!categories || !assets) return []
    return categories
      .map((cat) => ({
        category: cat,
        items: assets.filter((a) => a.category_id === cat.id),
      }))
      .filter((g) => g.items.length > 0)
  }, [categories, assets])

  if (area === undefined) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (area === null) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-muted-foreground">Área no encontrada</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/assets')}
          className="p-1 -ml-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-foreground leading-tight truncate">
          {area.name}
        </h1>
        <button
          type="button"
          onClick={() => navigate('/assets/new')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </button>
      </div>

      {/* Contenido */}
      <div className="mx-4 mt-4">
        {!assets || assets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">Sin activos en esta área</p>
          </div>
        ) : groupedByCat.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">Cargando categorías...</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <Accordion>
              {groupedByCat.map(({ category, items }) => (
                <AccordionItem key={category.id} value={category.id}>
                  <AccordionTrigger>
                    <span className="text-foreground text-sm">{category.name}</span>
                    <span className="text-xs text-muted-foreground mr-1">{items.length}</span>
                  </AccordionTrigger>
                  <AccordionContent className="bg-gray-50">
                    {items.map((asset) => (
                      <AssetRowWithThumb
                        key={asset.id}
                        asset={asset}
                        onClick={() => navigate(`/assets/${asset.id}`)}
                      />
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </div>
    </div>
  )
}
