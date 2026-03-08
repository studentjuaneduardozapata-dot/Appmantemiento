import { db, generateId } from '@/lib/db'

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
    await db.asset_categories.bulkAdd(
      CATEGORIES.map((name, idx) => ({
        id: generateId(),
        name,
        sort_order: idx + 1,
        created_at: now,
      }))
    )
  }

  if (areaCount === 0) {
    await db.areas.bulkAdd(
      AREAS.map((area, idx) => ({
        id: generateId(),
        code: area.code,
        name: area.name,
        sort_order: idx + 1,
        created_at: now,
      }))
    )
  }

  // PIN por defecto si no existe
  const pinMeta = await db.sync_meta.get('admin_pin')
  if (!pinMeta) {
    await db.sync_meta.put({ key: 'admin_pin', value: '1234' })
  }
}
