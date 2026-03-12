import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, AlertTriangle } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { Area } from '@/lib/db'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchInput } from '@/components/shared/SearchInput'
import { AssetCard } from '@/components/assets/AssetCard'
import { StandardListCard } from '@/components/shared/StandardListCard'
import { getAreaIcon, getAreaColors } from '@/lib/areaIcons'
import { useAllTrafficLights } from '@/hooks/useAssets'

// ─── Item de área con contador ────────────────────────────────────────────────

interface AreaListItemProps {
  area: Area
  colorIndex: number
  onClick: () => void
}

function AreaListItem({ area, colorIndex, onClick }: AreaListItemProps) {
  const Icon = getAreaIcon(colorIndex)
  const colors = getAreaColors(colorIndex)

  const count = useLiveQuery(
    () => db.assets.filter((a) => !a.deleted_at && a.area_id === area.id).count(),
    [area.id]
  )

  return (
    <StandardListCard
      title={area.name}
      subtitle={count !== undefined ? `${count} equipo${count !== 1 ? 's' : ''}` : '…'}
      icon={Icon}
      iconBgColor={colors.bg}
      iconColor={colors.icon}
      badge={count}
      onClick={onClick}
      className="mb-0 rounded-none border-x-0 border-t-0 shadow-none"
    />
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function AssetsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const areas = useLiveQuery(() =>
    db.areas.orderBy('sort_order').filter((a) => !a.deleted_at).toArray()
  )

  // Búsqueda activa: lista plana
  const searchResults = useLiveQuery(async () => {
    if (!search) return []
    const q = search.toLowerCase()
    return db.assets.filter((a) => !a.deleted_at && a.name.toLowerCase().includes(q)).toArray()
  }, [search])

  const areaMap = useLiveQuery(async () => {
    const all = await db.areas.toArray()
    return new Map(all.map((a) => [a.id, a.name]))
  })

  const categoryMap = useLiveQuery(async () => {
    const all = await db.asset_categories.toArray()
    return new Map(all.map((c) => [c.id, c.name]))
  })

  const trafficLights = useAllTrafficLights()

  const isLoading = areas === undefined

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="AGROACTIVOS"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/incidents/new')}
              aria-label="Reportar nueva falla"
              style={{ touchAction: 'manipulation' }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive text-white text-xs font-bold rounded-md hover:brightness-90 font-display tracking-wide focus-visible:ring-2 focus-visible:ring-destructive focus-visible:outline-none"
            >
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              Reportar Falla
            </button>
            <button
              type="button"
              onClick={() => navigate('/assets/new')}
              aria-label="Nuevo activo"
              style={{ touchAction: 'manipulation' }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-md hover:brightness-93 font-display tracking-wide focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Nuevo Activo
            </button>
          </div>
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
          {!searchResults || searchResults.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Sin resultados para tu búsqueda
            </p>
          ) : (
            searchResults.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                areaName={areaMap?.get(asset.area_id) ?? '—'}
                categoryName={categoryMap?.get(asset.category_id) ?? '—'}
                trafficLight={trafficLights?.get(asset.id)}
                onClick={() => navigate(`/assets/${asset.id}`)}
              />
            ))
          )}
        </div>
      ) : (
        /* ── Sin búsqueda: lista de áreas ── */
        <div className="mx-4">
          {areas.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm mb-3">Sin áreas registradas</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              {areas.map((area, index) => (
                <AreaListItem
                  key={area.id}
                  area={area}
                  colorIndex={index}
                  onClick={() => navigate(`/assets/area/${area.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
