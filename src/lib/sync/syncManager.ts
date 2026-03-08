import { db } from '@/lib/db'
import { networkStatus } from './networkStatus'
import { processPending } from './syncQueue'
import { pullAll } from './initialSync'
import { startRealtime, stopRealtime } from './realtimeSync'
import { syncLogger } from './syncLogger'

const SYNC_INTERVAL_MS = 3 * 60 * 1000 // 3 minutos

class SyncManager {
  private _isRunning = false
  private _isSyncing = false
  private _interval: ReturnType<typeof setInterval> | null = null
  private _onConnectivityChange: (() => void) | null = null

  get isSyncing(): boolean {
    return this._isSyncing
  }

  async sync(): Promise<void> {
    if (this._isSyncing) {
      syncLogger.debug('Sync ya en curso, ignorando')
      return
    }

    if (!networkStatus.isOnline) {
      syncLogger.debug('Sin conexión, sync omitido')
      return
    }

    this._isSyncing = true
    await db.sync_meta.put({
      key: 'sync_status',
      value: 'syncing',
    })

    try {
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
    } finally {
      this._isSyncing = false
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
