import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react'
import { db } from '@/lib/db'
import type { IncidentStatus } from '@/lib/db'
import { useIncident, updateIncident, softDeleteIncident } from '@/hooks/useIncidents'
import { IncidentDetail } from '@/components/incidents/IncidentDetail'
import { IncidentForm } from '@/components/incidents/IncidentForm'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { IncidentFormData } from '@/types'
import { format } from 'date-fns'

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editMode, setEditMode] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const incident = useIncident(id!)
  const asset = useLiveQuery(
    () => (incident ? db.assets.get(incident.asset_id) : undefined),
    [incident?.asset_id]
  )

  if (incident === undefined) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  async function handleStatusChange(newStatus: IncidentStatus) {
    await updateIncident(id!, { status: newStatus })
  }

  async function handleEdit(data: IncidentFormData) {
    setIsSubmitting(true)
    try {
      await updateIncident(id!, {
        asset_id: data.asset_id,
        type: data.type,
        reported_by: data.reported_by,
        description: data.description,
        photo_url: data.photo_url,
        reported_at: data.reported_at,
      })
      setEditMode(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    await softDeleteIncident(id!)
    navigate('/incidents', { replace: true })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-1 -ml-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-base font-semibold text-foreground truncate">
          {asset?.name ?? 'Falla'}
        </h1>
        <button
          type="button"
          onClick={() => setEditMode(!editMode)}
          className="p-1.5 text-muted-foreground hover:text-primary"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="p-1.5 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {editMode ? (
        <IncidentForm
          initialValues={{
            asset_id: incident.asset_id,
            type: incident.type,
            reported_by: incident.reported_by,
            description: incident.description,
            photo_url: incident.photo_url,
            reported_at: incident.reported_at
              ? format(new Date(incident.reported_at + 'T00:00:00'), 'yyyy-MM-dd')
              : format(new Date(), 'yyyy-MM-dd'),
          }}
          onSubmit={handleEdit}
          isSubmitting={isSubmitting}
        />
      ) : (
        <IncidentDetail
          incident={incident}
          assetName={asset?.name}
          onStatusChange={handleStatusChange}
        />
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar falla"
        description="¿Eliminar esta falla? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}
