# GMAO Planta de Maíz — Claude Code Config
# Versión 2.0 — Actualizado 2026-03-11

## Stack
React 18 + TypeScript | Vite + vite-plugin-pwa (Workbox)
Tailwind 3 + shadcn/ui (Radix) | Dexie v4 + dexie-react-hooks | Zustand
Supabase v2 (Postgres + Storage + Realtime) | Vercel (vercel.json SPA rewrite)
React Router v6 | react-hook-form + zod | date-fns v3 | sonner
qrcode | html5-qrcode | lucide-react

## Regla absoluta de datos
- LECTURAS: siempre `useLiveQuery(() => db.tabla...)` — nunca Supabase directo
- MUTACIONES: escribe en Dexie con `_synced: false` → `enqueue()` en sync_queue
- `_synced: true` solo después de push exitoso a Supabase

## ⚠️ Regla absoluta de auto-mantenimiento
Si implementas un cambio que altera la base de datos, la arquitectura,
los flujos principales, las dependencias o las rutas:
→ **DEBES actualizar `REQUIREMENTS.md` y `CLAUDE.md` en esa misma tarea.**

## Modelo de datos (resumen)
10 tablas sincronizadas: `users`, `areas`, `asset_categories`, `assets`,
`incidents`, `maintenance_plans`, `maintenance_tasks`, `task_steps`,
`maintenance_logs`, `deleted_records`.

4 tablas solo Dexie: `notifications`, `offline_files`, `sync_queue`, `sync_meta`.

`_synced` en Dexie para: users, assets, incidents, maintenance_plans,
maintenance_tasks, maintenance_logs, task_steps.

Dexie versión actual: **7**.

Campo `completed_step_ids` en `maintenance_logs` — solo Dexie, no en Supabase.

## Sync Engine (`src/lib/sync/`)
- `syncManager.ts` — orquestador: ciclo cada 3 min + reconexión + heartbeat cada 30 min + `pushOnly()` hot path
- `syncQueue.ts` — `enqueue()` dispara push debounced (300ms), backoff exponencial (1s→60s), manejo 429, `requeueRecoverableFailed()`, reconciliación 23505
- `initialSync.ts` — pull transaccional 9 tablas (timestamp solo avanza si tablas críticas OK), `performDataHeartbeat()`, `pullDeletedRecords`
- `realtimeSync.ts` — suscripción Postgres Realtime a 9 tablas (incluye task_steps), backoff reconexión 10s→5min
- `blobSync.ts` — upload a bucket `gmao-images`, conserva blob 30 días
- `networkStatus.ts` — ping real a Supabase REST cada 30s
- `deduplication.ts` — reconciliación IDs para areas/asset_categories
- `dbAccess.ts` — helper `getTable(name)` (incluye task_steps)

## Archivos críticos (cargar con @ cuando sean relevantes)
- @REQUIREMENTS.md — especificación completa (versión 2.0)
- @src/lib/db.ts — schema Dexie + tipos, fuente de verdad del modelo
- @src/lib/sync/ — engine completo, pedir plan antes de modificar
- @src/types/index.ts — re-exporta tipos desde db.ts + tipos auxiliares UI
- @src/lib/seedData.ts — datos iniciales (categorías, áreas)
- @src/app/AppRouter.tsx — todas las rutas

## Rutas actuales
```
/               → TodayPage
/assets         → AssetsPage
/assets/new     → AssetNewPage
/assets/:id     → AssetDetailPage
/assets/:id/edit → AssetEditPage
/assets/area/:id → AreaDetailPage
/schedule       → SchedulePage
/schedule/new-plan → NewPlanPage
/schedule/plan/:id → PlanDetailPage
/schedule/plan/:id/edit → EditPlanPage
/incidents      → IncidentsPage
/incidents/new  → IncidentNewPage
/incidents/:id  → IncidentDetailPage
/history        → HistoryPage
/scan           → ScanPage
/admin          → AdminPage
```

## Comandos frecuentes
```bash
npm run dev          # desarrollo
npm run build        # verificar build limpio
npm run lint         # linting
```

## Restricciones
- No instalar dependencias sin confirmación
- No ejecutar tests automáticos
- No hacer commits automáticos
- Build limpio al terminar cada tarea
- Antes de tocar `src/lib/sync/`: mostrar plan y esperar confirmación
- Respuesta: código + 1 línea confirmación. Sin explicaciones largas.
- Soft-delete con `deleted_at` — nunca DELETE físico en tablas principales
- `push` usa `upsert` — idempotente, last-write-wins

## Contexto del negocio
GMAO para planta procesadora de maíz. 1-4 usuarios sin login.
Offline-first es la prioridad #1. Velocidad de UX es #2.
Ver @REQUIREMENTS.md para especificación completa.
