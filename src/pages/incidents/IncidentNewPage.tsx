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
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-1 -ml-1 text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-gray-900">Reportar falla</h1>
      </div>
      <IncidentForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  )
}
