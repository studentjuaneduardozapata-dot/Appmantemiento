import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { syncManager } from '@/lib/sync/syncManager'
import { networkStatus } from '@/lib/sync/networkStatus'

interface SyncContextValue {
  isOnline: boolean
  isSyncing: boolean
  lastSync: Date | null
  triggerSync: () => void
}

const SyncContext = createContext<SyncContextValue>({
  isOnline: navigator.onLine,
  isSyncing: false,
  lastSync: null,
  triggerSync: () => {},
})

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)

  const lastSyncMeta = useLiveQuery(() => db.sync_meta.get('last_sync_success'))
  const syncStatusMeta = useLiveQuery(() => db.sync_meta.get('sync_status'))

  const lastSync = lastSyncMeta?.value ? new Date(lastSyncMeta.value) : null

  useEffect(() => {
    const handleConnectivity = (e: Event) => {
      const detail = (e as CustomEvent<{ isOnline: boolean }>).detail
      setIsOnline(detail.isOnline)
    }

    networkStatus.addEventListener('connectivity-change', handleConnectivity)
    syncManager.start()

    return () => {
      networkStatus.removeEventListener('connectivity-change', handleConnectivity)
      syncManager.stop()
    }
  }, [])

  useEffect(() => {
    setIsSyncing(syncStatusMeta?.value === 'syncing')
  }, [syncStatusMeta])

  const triggerSync = useCallback(() => {
    syncManager.sync()
  }, [])

  return (
    <SyncContext.Provider value={{ isOnline, isSyncing, lastSync, triggerSync }}>
      {children}
    </SyncContext.Provider>
  )
}

export function useSyncContext(): SyncContextValue {
  return useContext(SyncContext)
}
