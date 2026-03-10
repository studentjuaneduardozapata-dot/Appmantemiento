import { syncLogger } from './syncLogger'

const PING_INTERVAL_MS = 30_000
const PING_TIMEOUT_MS = 5_000

class NetworkStatus extends EventTarget {
  private _isOnline: boolean = navigator.onLine
  private _pingInterval: ReturnType<typeof setInterval> | null = null
  private _pingUrl: string | null

  constructor() {
    super()
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
    if (!supabaseUrl) {
      syncLogger.warn('VITE_SUPABASE_URL no configurado — conectividad asumida siempre online')
      this._pingUrl = null
    } else {
      this._pingUrl = `${supabaseUrl}/rest/v1/`
    }

    window.addEventListener('online', () => this._checkConnectivity())
    window.addEventListener('offline', () => this._setOnline(false))
  }

  get isOnline(): boolean {
    return this._isOnline
  }

  start(): void {
    this._checkConnectivity()
    this._pingInterval = setInterval(
      () => this._checkConnectivity(),
      PING_INTERVAL_MS
    )
  }

  stop(): void {
    if (this._pingInterval) {
      clearInterval(this._pingInterval)
      this._pingInterval = null
    }
  }

  private async _checkConnectivity(): Promise<void> {
    // Sin URL configurada: asumir online (no pingar servicios externos)
    if (!this._pingUrl) {
      this._setOnline(true)
      return
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT_MS)

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
      await fetch(this._pingUrl, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
        headers: anonKey
          ? { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
          : {},
      })

      clearTimeout(timeoutId)
      this._setOnline(true)
    } catch {
      this._setOnline(false)
    }
  }

  private _setOnline(online: boolean): void {
    if (this._isOnline !== online) {
      this._isOnline = online
      syncLogger.info(`Conectividad: ${online ? 'ONLINE' : 'OFFLINE'}`)
      this.dispatchEvent(
        new CustomEvent('connectivity-change', { detail: { isOnline: online } })
      )
    }
  }
}

export const networkStatus = new NetworkStatus()
