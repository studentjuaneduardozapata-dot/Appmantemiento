import { db } from '@/lib/db'
import { networkStatus } from './networkStatus'
import { processPending, purgeInvalidQueueItems, purgeCompletedQueueItems, setPushTrigger } from './syncQueue'
import { syncBlobs, purgeOldBlobs } from './blobSync'
import { pullAll, performDataHeartbeat, purgeOldDeletedRecords } from './initialSync'
import { startRealtime, stopRealtime } from './realtimeSync'
import { syncLogger } from './syncLogger'

const SYNC_INTERVAL_MS = 3 * 60 * 1000      // 3 minutos
const HEARTBEAT_INTERVAL_MS = 30 * 60 * 1000 // 30 minutos

class SyncManager {
  private _isRunning = false
  private _syncPromise: Promise<void> | null = null
  private _pushPromise: Promise<void> | null = null  // lock para hot-path push
  private _interval: ReturnType<typeof setInterval> | null = null
  private _heartbeatInterval: ReturnType<typeof setInterval> | null = null
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

  /**
   * Hot-path push: solo procesa la cola de sync sin pull completo.
   * Disparado por enqueue() con debounce de 300ms cuando hay red disponible.
   */
  async pushOnly(): Promise<void> {
    // Si hay un sync completo en curso, ya cubre el queue — no hace falta hot push
    if (this._syncPromise) {
      syncLogger.debug('Sync completo en curso, hot-push omitido')
      return
    }
    // Promise-lock para el hot path
    if (this._pushPromise) {
      return this._pushPromise
    }
    if (!networkStatus.isOnline) return

    this._pushPromise = processPending()
    try {
      await this._pushPromise
    } finally {
      this._pushPromise = null
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

    // Inyectar trigger de push inmediato en syncQueue (evita import circular)
    setPushTrigger(() => this.pushOnly())

    // Sync inmediato al iniciar
    this.sync()

    // Heartbeat de datos al iniciar (compara conteos local vs remoto)
    if (networkStatus.isOnline) {
      performDataHeartbeat()
    }

    // Sync periódico cada 3 minutos
    this._interval = setInterval(() => this.sync(), SYNC_INTERVAL_MS)

    // Heartbeat periódico cada 30 minutos
    this._heartbeatInterval = setInterval(() => {
      if (networkStatus.isOnline) performDataHeartbeat()
    }, HEARTBEAT_INTERVAL_MS)

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

    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval)
      this._heartbeatInterval = null
    }

    if (this._onConnectivityChange) {
      networkStatus.removeEventListener(
        'connectivity-change',
        this._onConnectivityChange as EventListener
      )
      this._onConnectivityChange = null
    }

    // Limpiar inyección del trigger de push
    setPushTrigger(null)

    networkStatus.stop()
    stopRealtime()

    syncLogger.info('SyncManager detenido')
  }
}

export const syncManager = new SyncManager()
