import { syncLogger } from './syncLogger'

const PING_INTERVAL_MS = 30_000
const PING_TIMEOUT_MS = 5_000

class NetworkStatus extends EventTarget {
  private _isOnline: boolean = navigator.onLine
  private _pingInterval: ReturnType<typeof setInterval> | null = null
  private _pingUrl: string

  constructor() {
    super()
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    this._pingUrl = supabaseUrl
      ? `${supabaseUrl}/rest/v1/`
      : 'https://httpbin.org/get'

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
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT_MS)

      await fetch(this._pingUrl, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
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
