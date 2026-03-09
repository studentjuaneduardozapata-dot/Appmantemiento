import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { IncidentStatus } from '@/lib/db'
import { useIncidents } from '@/hooks/useIncidents'
import { PageHeader } from '@/components/shared/PageHeader'
import { IncidentCard } from '@/components/incidents/IncidentCard'
import { cn } from '@/lib/utils'

type Tab = IncidentStatus | 'all'

const TABS: { value: Tab; label: string }[] = [
  { value: 'abierta', label: 'Abiertas' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'cerrada', label: 'Cerradas' },
  { value: 'all', label: 'Todas' },
]

export default function IncidentsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('abierta')

  const incidents = useIncidents(activeTab)
  const assets = useLiveQuery(() => db.assets.toArray())
  const assetMap = new Map(assets?.map((a) => [a.id, a.name]) ?? [])

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Fallas"
        action={
          <button
            onClick={() => navigate('/incidents/new')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
          >
            <Plus className="w-4 h-4" />
            Nueva
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'flex-1 min-w-[80px] py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors',
              activeTab === tab.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 mx-4 mt-3 overflow-hidden">
        {incidents === undefined ? (
          <p className="text-center text-sm text-gray-400 py-8">Cargando...</p>
        ) : incidents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm mb-3">Sin fallas en esta categoría</p>
            <button
              onClick={() => navigate('/incidents/new')}
              className="text-red-600 text-sm font-medium hover:text-red-700"
            >
              Reportar falla
            </button>
          </div>
        ) : (
          incidents.map((inc) => (
            <IncidentCard
              key={inc.id}
              incident={inc}
              assetName={assetMap.get(inc.asset_id)}
              onClick={() => navigate(`/incidents/${inc.id}`)}
            />
          ))
        )}
      </div>
    </div>
  )
}
