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
        // updateServiceWorker envía SKIP_WAITING al SW y recarga.
        // Si el canal cierra antes de recibir respuesta (comportamiento normal de
        // Workbox: el reload mata el canal antes de que el SW responda), el .catch
        // fuerza reload de todas formas — evita que el usuario quede con versión vieja.
        onClick: () => updateServiceWorker(true).catch(() => window.location.reload()),
      },
    })
  }, [needRefresh, updateServiceWorker])

  return null
}
