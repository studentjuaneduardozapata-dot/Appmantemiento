import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { createIncident } from '@/hooks/useIncidents'
import { IncidentForm } from '@/components/incidents/IncidentForm'
import type { IncidentFormData } from '@/types'

export default function IncidentNewPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(data: IncidentFormData) {
    setIsSubmitting(true)
    try {
      await createIncident(data)
      navigate('/incidents', { replace: true })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card border-b-2 border-primary px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Volver"
          style={{ touchAction: 'manipulation' }}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-md"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <h1 className="text-base font-semibold font-display text-foreground">Reportar falla</h1>
      </div>
      <IncidentForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  )
}
