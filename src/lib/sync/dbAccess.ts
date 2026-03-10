import { db } from '@/lib/db'

/**
 * Tablas mutables conocidas que tienen los métodos estándar de Dexie.
 * Un único cast type-unsafe centralizado aquí — todos los callers usan
 * `getTable()` con acceso tipado.
 */
const WRITABLE_TABLES = new Set([
  'users',
  'areas',
  'asset_categories',
  'assets',
  'incidents',
  'maintenance_plans',
  'maintenance_tasks',
  'maintenance_logs',
] as const)

type WritableTable = (typeof WRITABLE_TABLES) extends Set<infer T> ? T : never

interface DexieTable {
  put(item: unknown): Promise<unknown>
  update(id: string, changes: object): Promise<unknown>
  get(id: string): Promise<Record<string, unknown> | undefined>
  bulkPut(items: unknown[]): Promise<unknown>
}

/**
 * Retorna la tabla Dexie tipada para la tabla dada.
 * Retorna null si la tabla no es una tabla mutable conocida.
 */
export function getTable(table: string): DexieTable | null {
  if (!WRITABLE_TABLES.has(table as WritableTable)) return null
  return (db as unknown as Record<WritableTable, DexieTable>)[table as WritableTable]
}
