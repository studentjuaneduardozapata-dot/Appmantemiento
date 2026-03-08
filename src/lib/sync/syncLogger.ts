import { db } from '@/lib/db'

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  data?: unknown
  timestamp: string
}

const MAX_LOG_ENTRIES = 50

export const syncLogger = {
  async log(level: LogLevel, message: string, data?: unknown): Promise<void> {
    const prefix = '[GMAO Sync]'
    const timestamp = new Date().toISOString()

    if (level === 'error') {
      console.error(prefix, message, data ?? '')
    } else if (level === 'warn') {
      console.warn(prefix, message, data ?? '')
    } else if (level === 'debug') {
      console.debug(prefix, message, data ?? '')
    } else {
      console.log(prefix, message, data ?? '')
    }

    try {
      const existing = await db.sync_meta.get('sync_log')
      const entries: LogEntry[] = existing ? JSON.parse(existing.value) : []
      entries.push({ level, message, data, timestamp })
      const trimmed = entries.slice(-MAX_LOG_ENTRIES)
      await db.sync_meta.put({ key: 'sync_log', value: JSON.stringify(trimmed) })
    } catch {
      // No romper el flujo si el log falla
    }
  },

  info(message: string, data?: unknown) {
    return this.log('info', message, data)
  },

  warn(message: string, data?: unknown) {
    return this.log('warn', message, data)
  },

  error(message: string, data?: unknown) {
    return this.log('error', message, data)
  },

  debug(message: string, data?: unknown) {
    return this.log('debug', message, data)
  },
}
