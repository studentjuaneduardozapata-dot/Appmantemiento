import { db, generateId } from '@/lib/db'
import { enqueue } from '@/lib/sync/syncQueue'

const CATEGORIES = [
  'Silos',
  'Secadoras',
  'Limpiadoras',
  'Pre-limpiadoras',
  'Elevadores',
  'Básculas',
  'Báscula camionera',
  'Báscula portátil',
  'Clasificadoras',
  'Desgeminadoras',
  'Hidropolichadores',
  'Ensacadoras',
  'Máquinas de coser',
  'Tableros de control',
  'Tolvas de recibo',
  'Despredadora',
  'Transportadores de banda',
  'Montacargas',
  'Elevadores de bulto (malacate)',
  'Elevadores de bultos (grillo)',
  'Parrillas',
  'Infraestructura',
  'Motores',
  'Componentes',
  'Otros',
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
    const categories = CATEGORIES.map((name, idx) => ({
      id: generateId(),
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
