/// <reference types="vite/client" />

// VERSION LOCK: versión de package.json inyectada por vite.config.ts en build time
declare const __APP_VERSION__: string

// Módulo virtual de vite-plugin-pwa para el hook de actualización del SW
declare module 'virtual:pwa-register/react' {
  import type { Dispatch, SetStateAction } from 'react'
  export function useRegisterSW(options?: {
    immediate?: boolean
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
    onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration | undefined) => void
    onRegisterError?: (error: unknown) => void
  }): {
    needRefresh: [boolean, Dispatch<SetStateAction<boolean>>]
    offlineReady: [boolean, Dispatch<SetStateAction<boolean>>]
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>
  }
}
