import {
  Factory,
  Warehouse,
  HardHat,
  Cog,
  Container,
  Box,
  Layers,
  Grid3X3,
  Truck,
  Scale,
  Wrench,
  Zap,
  Wind,
  Cylinder,
  Building2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const AREA_ICONS: LucideIcon[] = [
  Factory,
  Warehouse,
  HardHat,
  Cog,
  Container,
  Box,
  Layers,
  Grid3X3,
  Truck,
  Scale,
  Wrench,
  Zap,
  Wind,
  Cylinder,
  Building2,
]

export const AREA_COLORS = [
  { bg: 'bg-blue-100', icon: 'text-blue-600' },
  { bg: 'bg-emerald-100', icon: 'text-emerald-600' },
  { bg: 'bg-orange-100', icon: 'text-orange-600' },
  { bg: 'bg-purple-100', icon: 'text-purple-600' },
  { bg: 'bg-rose-100', icon: 'text-rose-600' },
  { bg: 'bg-amber-100', icon: 'text-amber-600' },
  { bg: 'bg-teal-100', icon: 'text-teal-600' },
  { bg: 'bg-indigo-100', icon: 'text-indigo-600' },
]

export function getAreaIcon(index: number): LucideIcon {
  return AREA_ICONS[index % AREA_ICONS.length]
}

export function getAreaColors(index: number): { bg: string; icon: string } {
  return AREA_COLORS[index % AREA_COLORS.length]
}
