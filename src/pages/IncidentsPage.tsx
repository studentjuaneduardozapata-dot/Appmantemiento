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
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Fallas"
        action={
          <button
            onClick={() => navigate('/incidents/new')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive text-destructive-foreground text-sm font-medium rounded-lg hover:bg-destructive/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex bg-card border-b border-border overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'flex-1 min-w-[80px] py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors',
              activeTab === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-lg border border-border mx-4 mt-3 overflow-hidden">
        {incidents === undefined ? (
          <p className="text-center text-sm text-muted-foreground py-8">Cargando...</p>
        ) : incidents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm mb-3">Sin fallas en esta categoría</p>
            <button
              onClick={() => navigate('/incidents/new')}
              className="text-sm font-medium text-destructive hover:text-destructive/80 transition-colors"
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
