import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Detecta cuando hay un nuevo Service Worker esperando activación y muestra
 * un toast persistente con botón "Actualizar". El usuario debe confirmar
 * explícitamente para evitar interrumpir trabajo en curso.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!needRefresh) return
    toast.info('Nueva versión disponible', {
      description: 'Recarga para aplicar la actualización.',
      duration: Infinity,
      action: {
        label: 'Actualizar',
        onClick: () => updateServiceWorker(true),
      },
    })
  }, [needRefresh, updateServiceWorker])

  return null
}
