import { db } from '@/lib/db'
import { networkStatus } from './networkStatus'
import { processPending, purgeInvalidQueueItems, purgeCompletedQueueItems } from './syncQueue'
import { syncBlobs, purgeOldBlobs } from './blobSync'
import { pullAll, purgeOldDeletedRecords } from './initialSync'
import { startRealtime, stopRealtime } from './realtimeSync'
import { syncLogger } from './syncLogger'

const SYNC_INTERVAL_MS = 3 * 60 * 1000 // 3 minutos

class SyncManager {
  private _isRunning = false
  private _syncPromise: Promise<void> | null = null
  private _interval: ReturnType<typeof setInterval> | null = null
  private _onConnectivityChange: (() => void) | null = null

  get isSyncing(): boolean {
    return this._syncPromise !== null
  }

  async sync(): Promise<void> {
    // Promise-lock: si ya hay un sync en curso, devuelve la misma promesa (no corre doble)
    if (this._syncPromise) {
      syncLogger.debug('Sync ya en curso, ignorando')
      return this._syncPromise
    }
    this._syncPromise = this._doSync()
    try {
      await this._syncPromise
    } finally {
      this._syncPromise = null
    }
  }

  private async _doSync(): Promise<void> {
    if (!networkStatus.isOnline) {
      syncLogger.debug('Sin conexión, sync omitido')
      return
    }

    await db.sync_meta.put({
      key: 'sync_status',
      value: 'syncing',
    })

    try {
      await purgeOldDeletedRecords()
      await purgeCompletedQueueItems()
      await purgeInvalidQueueItems()
      await syncBlobs()
      await purgeOldBlobs()
      await processPending()
      await pullAll()

      await db.sync_meta.put({
        key: 'last_sync_success',
        value: new Date().toISOString(),
      })
      await db.sync_meta.put({ key: 'sync_status', value: 'idle' })
      syncLogger.info('Sync completado exitosamente')
    } catch (err) {
      syncLogger.error('Error durante sync', err)
      await db.sync_meta.put({ key: 'sync_status', value: 'error' })
    }
  }

  start(): void {
    if (this._isRunning) return
    this._isRunning = true

    networkStatus.start()
    startRealtime()

    // Sync inmediato al iniciar
    this.sync()

    // Sync periódico cada 3 minutos
    this._interval = setInterval(() => this.sync(), SYNC_INTERVAL_MS)

    // Sync al reconectar
    this._onConnectivityChange = () => {
      if (networkStatus.isOnline) {
        syncLogger.info('Reconexión detectada, iniciando sync')
        this.sync()
      }
    }
    networkStatus.addEventListener(
      'connectivity-change',
      this._onConnectivityChange as EventListener
    )

    syncLogger.info('SyncManager iniciado')
  }

  stop(): void {
    if (!this._isRunning) return
    this._isRunning = false

    if (this._interval) {
      clearInterval(this._interval)
      this._interval = null
    }

    if (this._onConnectivityChange) {
      networkStatus.removeEventListener(
        'connectivity-change',
        this._onConnectivityChange as EventListener
      )
      this._onConnectivityChange = null
    }

    networkStatus.stop()
    stopRealtime()

    syncLogger.info('SyncManager detenido')
  }
}

export const syncManager = new SyncManager()
