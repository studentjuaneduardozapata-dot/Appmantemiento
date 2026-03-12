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
  { value: 'abierta',    label: 'Abiertas' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'cerrada',    label: 'Cerradas' },
  { value: 'all',        label: 'Todas' },
]

export default function IncidentsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('abierta')

  const incidents = useIncidents(activeTab)
  const assets    = useLiveQuery(() => db.assets.toArray())
  const assetMap  = new Map(assets?.map(a => [a.id, a.name]) ?? [])

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Fallas"
        action={
          <button
            type="button"
            onClick={() => navigate('/incidents/new')}
            aria-label="Nueva falla"
            style={{ touchAction: 'manipulation' }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive text-white text-xs font-bold rounded-md hover:brightness-90 font-display tracking-wide focus-visible:ring-2 focus-visible:ring-destructive focus-visible:outline-none"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Nueva
          </button>
        }
      />

      {/* Tabs */}
      <div role="tablist" className="flex bg-white border-b border-border overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'gmao-tab',
              activeTab === tab.value ? 'gmao-tab-active' : 'gmao-tab-inactive'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="gmao-card mx-4 mt-3">
        {incidents === undefined ? (
          <p className="text-center text-sm text-muted-foreground py-8">Cargando...</p>
        ) : incidents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm mb-3">Sin fallas en esta categoría</p>
            <button
              onClick={() => navigate('/incidents/new')}
              className="text-sm font-semibold text-destructive hover:brightness-90 transition-colors"
            >
              Reportar falla →
            </button>
          </div>
        ) : (
          incidents.map(inc => (
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
