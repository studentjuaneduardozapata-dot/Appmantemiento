import { db, generateId } from '@/lib/db'
import { enqueue } from '@/lib/sync/syncQueue'

// IDs estables: fijos por nombre para que múltiples dispositivos generen el mismo registro
// y el upsert en Supabase sea idempotente (sin duplicados al instalar en varios dispositivos).
const CATEGORIES: { id: string; name: string }[] = [
  { id: 'cat-0001-0000-0000-000000000001', name: 'Silos' },
  { id: 'cat-0001-0000-0000-000000000002', name: 'Secadoras' },
  { id: 'cat-0001-0000-0000-000000000003', name: 'Limpiadoras' },
  { id: 'cat-0001-0000-0000-000000000004', name: 'Pre-limpiadoras' },
  { id: 'cat-0001-0000-0000-000000000005', name: 'Elevadores' },
  { id: 'cat-0001-0000-0000-000000000006', name: 'Básculas' },
  { id: 'cat-0001-0000-0000-000000000007', name: 'Báscula camionera' },
  { id: 'cat-0001-0000-0000-000000000008', name: 'Báscula portátil' },
  { id: 'cat-0001-0000-0000-000000000009', name: 'Clasificadoras' },
  { id: 'cat-0001-0000-0000-000000000010', name: 'Desgeminadoras' },
  { id: 'cat-0001-0000-0000-000000000011', name: 'Hidropolichadores' },
  { id: 'cat-0001-0000-0000-000000000012', name: 'Ensacadoras' },
  { id: 'cat-0001-0000-0000-000000000013', name: 'Máquinas de coser' },
  { id: 'cat-0001-0000-0000-000000000014', name: 'Tableros de control' },
  { id: 'cat-0001-0000-0000-000000000015', name: 'Tolvas de recibo' },
  { id: 'cat-0001-0000-0000-000000000016', name: 'Despredadora' },
  { id: 'cat-0001-0000-0000-000000000017', name: 'Transportadores de banda' },
  { id: 'cat-0001-0000-0000-000000000018', name: 'Montacargas' },
  { id: 'cat-0001-0000-0000-000000000019', name: 'Elevadores de bulto (malacate)' },
  { id: 'cat-0001-0000-0000-000000000020', name: 'Elevadores de bultos (grillo)' },
  { id: 'cat-0001-0000-0000-000000000021', name: 'Parrillas' },
  { id: 'cat-0001-0000-0000-000000000022', name: 'Infraestructura' },
  { id: 'cat-0001-0000-0000-000000000023', name: 'Motores' },
  { id: 'cat-0001-0000-0000-000000000024', name: 'Componentes' },
  { id: 'cat-0001-0000-0000-000000000025', name: 'Otros' },
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
  }

  // PIN por defecto si no existe
  const pinMeta = await db.sync_meta.get('admin_pin')
  if (!pinMeta) {
    await db.sync_meta.put({ key: 'admin_pin', value: '1234' })
  }

  // Migración única: encolar categorías y áreas existentes que nunca llegaron a Supabase
  const migrated = await db.sync_meta.get('ref_data_enqueued_v1')
  if (!migrated) {
    const [allCats, allAreas] = await Promise.all([
      db.asset_categories.toArray(),
      db.areas.toArray(),
    ])
    for (const cat of allCats) {
      await enqueue('asset_categories', 'insert', cat as unknown as Record<string, unknown>)
    }
    for (const area of allAreas) {
      await enqueue('areas', 'insert', area as unknown as Record<string, unknown>)
    }
    await db.sync_meta.put({ key: 'ref_data_enqueued_v1', value: 'done' })
  }
}
