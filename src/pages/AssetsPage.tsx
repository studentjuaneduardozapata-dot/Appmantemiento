import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { useAssets } from '@/hooks/useAssets'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchInput } from '@/components/shared/SearchInput'
import { AssetCard } from '@/components/assets/AssetCard'

export default function AssetsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const assets = useAssets(search)
  const areas = useLiveQuery(() => db.areas.toArray())
  const categories = useLiveQuery(() => db.asset_categories.toArray())

  const areaMap = new Map(areas?.map((a) => [a.id, a.name]) ?? [])
  const categoryMap = new Map(categories?.map((c) => [c.id, c.name]) ?? [])

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Activos"
        action={
          <button
            onClick={() => navigate('/assets/new')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
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

      <div className="bg-white rounded-lg border border-gray-200 mx-4 overflow-hidden">
        {assets === undefined ? (
          <p className="text-center text-sm text-gray-400 py-8">Cargando...</p>
        ) : assets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm mb-3">
              {search ? 'Sin resultados para tu búsqueda' : 'Sin activos registrados'}
            </p>
            {!search && (
              <button
                onClick={() => navigate('/assets/new')}
                className="text-blue-600 text-sm font-medium hover:text-blue-700"
              >
                Crear primer activo
              </button>
            )}
          </div>
        ) : (
          assets.map((asset) => (
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
    </div>
  )
}
