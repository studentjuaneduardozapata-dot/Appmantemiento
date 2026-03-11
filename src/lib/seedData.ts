import { db, generateId } from '@/lib/db'
import { enqueue } from '@/lib/sync/syncQueue'

// UUIDs fijos y válidos para categorías de activos.
// Formato estricto: 8-4-4-4-12 hex. Versión 4 (0000-4000), variante 10xx (8000).
// IDs estables para que múltiples dispositivos generen el mismo registro
// y el upsert en Supabase sea idempotente (sin duplicados al instalar en varios dispositivos).
const CATEGORIES: { id: string; name: string }[] = [
  { id: '00000000-0000-4000-8000-000000000001', name: 'Silos' },
  { id: '00000000-0000-4000-8000-000000000002', name: 'Secadoras' },
  { id: '00000000-0000-4000-8000-000000000003', name: 'Limpiadoras' },
  { id: '00000000-0000-4000-8000-000000000004', name: 'Pre-limpiadoras' },
  { id: '00000000-0000-4000-8000-000000000005', name: 'Elevadores' },
  { id: '00000000-0000-4000-8000-000000000006', name: 'Básculas' },
  { id: '00000000-0000-4000-8000-000000000007', name: 'Báscula camionera' },
  { id: '00000000-0000-4000-8000-000000000008', name: 'Báscula portátil' },
  { id: '00000000-0000-4000-8000-000000000009', name: 'Clasificadoras' },
  { id: '00000000-0000-4000-8000-000000000010', name: 'Desgeminadoras' },
  { id: '00000000-0000-4000-8000-000000000011', name: 'Hidropolichadores' },
  { id: '00000000-0000-4000-8000-000000000012', name: 'Ensacadoras' },
  { id: '00000000-0000-4000-8000-000000000013', name: 'Máquinas de coser' },
  { id: '00000000-0000-4000-8000-000000000014', name: 'Tableros de control' },
  { id: '00000000-0000-4000-8000-000000000015', name: 'Tolvas de recibo' },
  { id: '00000000-0000-4000-8000-000000000016', name: 'Despredadora' },
  { id: '00000000-0000-4000-8000-000000000017', name: 'Transportadores de banda' },
  { id: '00000000-0000-4000-8000-000000000018', name: 'Montacargas' },
  { id: '00000000-0000-4000-8000-000000000019', name: 'Elevadores de bulto (malacate)' },
  { id: '00000000-0000-4000-8000-000000000020', name: 'Elevadores de bultos (grillo)' },
  { id: '00000000-0000-4000-8000-000000000021', name: 'Parrillas' },
  { id: '00000000-0000-4000-8000-000000000022', name: 'Infraestructura' },
  { id: '00000000-0000-4000-8000-000000000023', name: 'Motores' },
  { id: '00000000-0000-4000-8000-000000000024', name: 'Componentes' },
  { id: '00000000-0000-4000-8000-000000000025', name: 'Otros' },
]

const AREAS = [
  { code: 'REC', name: 'Recepción' },
  { code: 'PRE', name: 'Pre-limpieza' },
  { code: 'SEC', name: 'Secado' },
  { code: 'LIM', name: 'Limpieza' },
  { code: 'ALM', name: 'Almacenamiento' },
  { code: 'ENS', name: 'Ensacado' },
  { code: 'BAS', name: 'Báscula' },
  { code: 'TAL', name: 'Taller' },
]

export async function seedIfEmpty(): Promise<void> {
  const [catCount, areaCount] = await Promise.all([
    db.asset_categories.count(),
    db.areas.count(),
  ])

  const now = new Date().toISOString()
  let didSeedCats = false
  let didSeedAreas = false

  if (catCount === 0) {
    const categories = CATEGORIES.map(({ id, name }, idx) => ({
      id,
      name,
      sort_order: idx + 1,
      created_at: now,
    }))
    await db.asset_categories.bulkAdd(categories)
    for (const cat of categories) {
      await enqueue('asset_categories', 'insert', cat as unknown as Record<string, unknown>)
    }
    didSeedCats = true
  }

  if (areaCount === 0) {
    const areas = AREAS.map((area, idx) => ({
      id: generateId(),
      code: area.code,
      name: area.name,
      sort_order: idx + 1,
      created_at: now,
    }))
    await db.areas.bulkAdd(areas)
    for (const area of areas) {
      await enqueue('areas', 'insert', area as unknown as Record<string, unknown>)
    }
    didSeedAreas = true
  }

  // PIN por defecto si no existe
  const pinMeta = await db.sync_meta.get('admin_pin')
  if (!pinMeta) {
    await db.sync_meta.put({ key: 'admin_pin', value: '1234' })
  }

  // Migración v2: encolar datos de referencia en instalaciones existentes que
  // nunca llegaron a Supabase (reemplaza ref_data_enqueued_v1 que tenía doble-encolado).
  // Si el bloque de catCount/areaCount === 0 ya encoló, no hace nada (didSeed* = true).
  const migratedV2 = await db.sync_meta.get('ref_data_enqueued_v2')
  if (!migratedV2) {
    if (!didSeedCats) {
      const allCats = await db.asset_categories.toArray()
      for (const cat of allCats) {
        await enqueue('asset_categories', 'insert', cat as unknown as Record<string, unknown>)
      }
    }
    if (!didSeedAreas) {
      const allAreas = await db.areas.toArray()
      for (const area of allAreas) {
        await enqueue('areas', 'insert', area as unknown as Record<string, unknown>)
      }
    }
    await db.sync_meta.put({ key: 'ref_data_enqueued_v2', value: 'done' })
  }
}
