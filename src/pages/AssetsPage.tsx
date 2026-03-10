import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { Asset } from '@/lib/db'
import { useAssets, useAssetTrafficLight } from '@/hooks/useAssets'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchInput } from '@/components/shared/SearchInput'
import { AssetCard } from '@/components/assets/AssetCard'
import { TrafficLight } from '@/components/shared/TrafficLight'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'

// ─── Fila de activo con miniatura ─────────────────────────────────────────────

interface AssetRowProps {
  asset: Asset
  onClick: () => void
}

function AssetRowWithThumb({ asset, onClick }: AssetRowProps) {
  const light = useAssetTrafficLight(asset.id)
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/50 border-t border-border first:border-t-0"
    >
      {asset.image_url && !asset.image_url.startsWith('local:') ? (
        <img
          src={asset.image_url}
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

// ─── Pill de área ──────────────────────────────────────────────────────────────

interface AreaPillProps {
  label: string
  active: boolean
  onClick: () => void
}

function AreaPill({ label, active, onClick }: AreaPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
      )}
    >
      {label}
    </button>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function AssetsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedAreaId, setSelectedAreaId] = useState('')

  const assets = useAssets(search)
  const areas = useLiveQuery(() => db.areas.orderBy('sort_order').filter((a) => !a.deleted_at).toArray())
  const categories = useLiveQuery(() => db.asset_categories.filter((c) => !c.deleted_at).toArray())

  // All assets without search filter (for accordion view)
  const allAssets = useLiveQuery(() =>
    db.assets.filter((a) => !a.deleted_at).toArray()
  )

  const areaMap = new Map(areas?.map((a) => [a.id, a.name]) ?? [])
  const categoryMap = new Map(categories?.map((c) => [c.id, c.name]) ?? [])

  // Assets visible in accordion (filtered by selected area only)
  const visibleAssets = useMemo(() => {
    if (!allAssets) return []
    return allAssets.filter((a) => !selectedAreaId || a.area_id === selectedAreaId)
  }, [allAssets, selectedAreaId])

  // Group by category for accordion
  const groupedByCat = useMemo(() => {
    if (!categories || visibleAssets.length === 0) return []
    return categories
      .map((cat) => ({
        category: cat,
        items: visibleAssets.filter((a) => a.category_id === cat.id),
      }))
      .filter((g) => g.items.length > 0)
  }, [categories, visibleAssets])

  const isLoading =
    assets === undefined || areas === undefined || categories === undefined || allAssets === undefined

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Activos"
        action={
          <button
            onClick={() => navigate('/assets/new')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Nuevo
          </button>
        }
      />

      <div className="px-4 py-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar activo..."
        />
      </div>

      {isLoading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Cargando...</p>
      ) : search ? (
        /* ── Búsqueda activa: lista plana ── */
        <div className="bg-card rounded-lg border border-border mx-4 overflow-hidden">
          {assets!.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Sin resultados para tu búsqueda
            </p>
          ) : (
            assets!.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                areaName={areaMap.get(asset.area_id) ?? '—'}
                categoryName={categoryMap.get(asset.category_id) ?? '—'}
                onClick={() => navigate(`/assets/${asset.id}`)}
              />
            ))
          )}
        </div>
      ) : (
        /* ── Sin búsqueda: pills + accordion ── */
        <>
          {/* Pills de área */}
          <div className="flex gap-2 overflow-x-auto px-4 pb-2 no-scrollbar">
            <AreaPill
              label="Todas"
              active={!selectedAreaId}
              onClick={() => setSelectedAreaId('')}
            />
            {areas?.map((area) => (
              <AreaPill
                key={area.id}
                label={area.name}
                active={selectedAreaId === area.id}
                onClick={() => setSelectedAreaId(area.id)}
              />
            ))}
          </div>

          {/* Accordion por categoría */}
          <div className="px-4 pb-4">
            {groupedByCat.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm mb-3">Sin activos registrados</p>
                <button
                  onClick={() => navigate('/assets/new')}
                  className="text-primary text-sm font-medium hover:text-primary/80"
                >
                  Crear primer activo
                </button>
              </div>
            ) : (
              <Accordion className="bg-card rounded-xl border border-border overflow-hidden">
                {groupedByCat.map(({ category, items }) => (
                  <AccordionItem key={category.id} value={category.id}>
                    <AccordionTrigger>
                      <span className="text-foreground">{category.name}</span>
                      <span className="text-xs text-muted-foreground mr-1">{items.length}</span>
                    </AccordionTrigger>
                    <AccordionContent>
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
            )}
          </div>
        </>
      )}
    </div>
  )
}
