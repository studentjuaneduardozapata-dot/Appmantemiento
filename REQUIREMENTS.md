# GMAO Planta de Maíz — Documento de Requerimientos
# Versión 2.0 — Sincronizado con código real (2026-03-11)

---

## 1. VISIÓN GENERAL

Sistema de Gestión de Mantenimiento (GMAO) PWA para una planta de
procesamiento y almacenamiento de maíz. Diseñado para uso operativo
diario por 1-4 técnicos y supervisores en planta.

Prioridades absolutas:
- Velocidad de registro (segundos, no minutos)
- Operación 100% funcional sin internet
- Sincronización automática en background al reconectar
- Interfaz simple, sin fricción, accesible desde PC y Android

---

## 2. STACK TECNOLÓGICO

| Capa | Tecnología |
|------|-----------|
| UI | React 18 + TypeScript |
| Build | Vite + vite-plugin-pwa (Service Worker / Workbox) |
| Hosting | Vercel (con `vercel.json` para SPA rewriting) |
| Estilos | Tailwind CSS 3 + shadcn/ui (Radix primitives) |
| DB local | Dexie v4 (IndexedDB) + dexie-react-hooks (useLiveQuery) |
| Estado UI | Zustand |
| Backend | Supabase v2 (Postgres + Storage + Realtime) |
| Router | React Router v6 |
| Forms | react-hook-form + zod |
| Iconos | lucide-react |
| Fechas | date-fns v3 |
| Toasts | sonner |
| QR | qrcode (generación) + html5-qrcode (escaneo) |
| Aux | class-variance-authority, clsx, tailwind-merge |

---

## 3. ARQUITECTURA

### 3.1 Offline-First

Toda la UI lee exclusivamente desde Dexie via `useLiveQuery`.
Nunca llamar a Supabase directamente desde componentes.

Flujo de mutación:
1. Escribe en Dexie con `_synced: false`
2. Encola en `sync_queue` vía `enqueue(table, operation, payload)`
3. `SyncManager.sync()` procesa la cola en background
4. Post-push exitoso: `_synced: true` en Dexie

Flujo de lectura:
- `useLiveQuery(() => db.tabla.toArray())` siempre
- Pull incremental desde Supabase cada 3 minutos + al reconectar

### 3.2 Sync Engine (`src/lib/sync/`)

| Archivo | Responsabilidad |
|---------|----------------|
| `syncManager.ts` | Orquestador: start/stop, sync periódico (3 min), reconexión, heartbeat cada 30 min, `pushOnly()` para hot path |
| `syncQueue.ts` | `enqueue()` dispara push inmediato (debounce 300ms), `processPending()` con backoff exponencial (1s→60s), manejo 429, `requeueRecoverableFailed()`, `purgeCompleted/Invalid` |
| `initialSync.ts` | Pull transaccional (timestamp solo avanza si tablas críticas OK), `performDataHeartbeat()` compara conteos local/remoto, `pullDeletedRecords` |
| `realtimeSync.ts` | Suscripción Postgres Realtime a 9 tablas (incluye `task_steps`), backoff exponencial de reconexión (10s→5min) |
| `blobSync.ts` | Sube blobs de `offline_files` a Supabase Storage, reemplaza `local:{uuid}` por URL pública |
| `networkStatus.ts` | Ping real al endpoint REST de Supabase cada 30s, emite `connectivity-change` |
| `deduplication.ts` | Reconciliación de IDs duplicados para `areas` (por code) y `asset_categories` (por name) |
| `dbAccess.ts` | Helper `getTable(name)` para acceso dinámico a tablas Dexie (incluye `task_steps`) |
| `syncLogger.ts` | Logger con niveles (debug/info/warn/error) para trazabilidad |

Detalles clave:
- **Hot-path push**: `enqueue()` dispara `pushOnly()` con debounce de 300ms al escribir en Dexie con red disponible
- **Push**: `sync_queue` con reintentos (máx 3), backoff exponencial (1s, 2s, 4s…60s), idempotente con upsert
- **429 handling**: aborta el lote actual al detectar rate limit; items se reintentarán en el próximo ciclo
- **Auto-requeue**: items `failed` con errores recuperables (no de validación) se re-encolan tras 1 hora
- **Pull transaccional**: el `last_sync_timestamp` solo avanza si todas las tablas críticas completaron sin error
- **Heartbeat**: al iniciar y cada 30 min, compara conteos local/remoto; divergencia > 5 registros o > 10% → fuerza resync completo
- **Realtime**: suscripción a cambios remotos para 9 tablas (users, areas, asset_categories, assets, incidents, maintenance_plans, maintenance_tasks, maintenance_logs, task_steps)
- **Realtime reconexión**: backoff exponencial 10s, 20s, 40s… máx 5 minutos
- **SYNC_TABLES (pull)**: 9 tablas total
- **Blobs**: upload a bucket `gmao-images`, conserva blob local 30 días como fallback offline
- **Reconexión**: ping real a Supabase REST, no solo evento `online`
- **AlreadySyncedError**: manejo de unique constraint (23505) con reconciliación de IDs

### 3.3 Estructura de archivos

```
src/
├── app/
│   ├── AppRouter.tsx         # Todas las rutas
│   └── Layout.tsx            # Shell con nav
├── pages/
│   ├── TodayPage.tsx         # Pantalla de inicio
│   ├── AssetsPage.tsx
│   ├── SchedulePage.tsx
│   ├── IncidentsPage.tsx
│   ├── HistoryPage.tsx
│   ├── SummaryPage.tsx
│   ├── ScanPage.tsx
│   ├── AdminPage.tsx
│   ├── assets/               # AssetNewPage, AssetDetailPage, AssetEditPage, AreaDetailPage
│   ├── incidents/            # IncidentNewPage, IncidentDetailPage
│   └── schedule/             # NewPlanPage, PlanDetailPage, EditPlanPage, PreventivePage
├── components/
│   ├── ui/                   # Primitivos shadcn (button, dialog, select, etc.)
│   ├── assets/
│   ├── maintenance/
│   ├── incidents/
│   └── shared/
├── hooks/
│   ├── useAssets.ts
│   ├── useIncidents.ts
│   ├── useMaintenancePlans.ts
│   ├── useMaintenanceTasks.ts
│   ├── useMaintenanceLogs.ts
│   ├── useMaintenanceSteps.ts
│   └── useObjectUrl.ts
├── lib/
│   ├── db.ts                 # Schema Dexie + tipos de datos (fuente de verdad)
│   ├── sync/                 # (ver §3.2)
│   ├── seedData.ts           # Datos iniciales (categorías, áreas)
│   ├── imageCompression.ts   # Compresión WebP/JPEG
│   ├── notifications.ts      # Notificaciones locales
│   ├── areaIcons.ts          # Mapeo área → icono
│   ├── qr.ts                 # Generación QR
│   └── utils.ts              # cn() y utilidades
├── integrations/
│   └── supabase/             # Cliente Supabase (supabase.ts / client.ts)
├── contexts/
│   └── SyncContext.tsx        # Provider que expone isOnline, isSyncing, lastSync, triggerSync
├── types/
│   └── index.ts              # Re-exporta tipos desde db.ts + tipos auxiliares UI
├── index.css
├── main.tsx
└── App.tsx
```

---

## 4. SISTEMA DE USUARIOS (sin login)

Sin autenticación. Los "usuarios" son solo nombres para identificar
quién reporta o ejecuta acciones.

Tabla: `users { id, name, created_at, updated_at, deleted_at }`

Gestión: solo desde el panel de administración.
Uso: selector dropdown en formularios de fallas y mantenimiento.

---

## 5. PANEL DE ADMINISTRACIÓN

Acceso: PIN de 4 dígitos desde un botón discreto en la pantalla
principal (ícono de ajustes).
El PIN se guarda en Dexie (`sync_meta`) y es configurable desde el propio panel.
PIN por defecto: 1234

Secciones del panel:
1. Usuarios — crear, editar, eliminar nombres
2. Áreas — crear, editar, eliminar zonas de la planta
3. Categorías — crear, editar, eliminar categorías de activos
4. PIN — cambiar el PIN de acceso
5. Base de datos — botón para limpiar cache local (clear IndexedDB)

---

## 6. ÁREAS

Representan zonas físicas de la planta.
Campos: `code` (único), `name`, `sort_order`.

Datos iniciales sugeridos (editables desde admin):
Recepción, Pre-limpieza, Secado, Limpieza, Almacenamiento,
Ensacado, Báscula, Taller.

---

## 7. CATEGORÍAS DE ACTIVOS

Gestionables desde admin. Se crean como datos iniciales via `seedData.ts`.

Lista inicial (25 categorías):
Silos, Secadoras, Limpiadoras, Pre-limpiadoras, Elevadores,
Básculas, Báscula camionera, Báscula portátil, Clasificadoras,
Desgeminadoras, Hidropolichadores, Ensacadoras, Máquinas de coser,
Tableros de control, Tolvas de recibo, Despredadora,
Transportadores de banda, Montacargas, Elevadores de bulto (malacate),
Elevadores de bultos (grillo), Parrillas, Infraestructura,
Motores, Componentes, Otros.

---

## 8. ACTIVOS

### 8.1 Campos
- Foto (opcional) — cámara o galería
- Nombre
- Categoría (FK → `asset_categories`)
- Área (FK → `areas`)
- Activo padre (opcional — FK → `assets` para sub-activos)
- Especificaciones técnicas: `specs` JSONB array `{key, value}[]`

### 8.2 Estado visual (semáforo)
Calculado automáticamente:
- 🔴 Rojo: tiene falla abierta O mantenimiento vencido
- 🟡 Amarillo: mantenimiento próximo (vence en los próximos 7 días)
- 🟢 Verde: todo al día

### 8.2b Imagen del activo
Muestra en ratio 16:9 (`aspect-video`) con `max-h-48` y `object-cover`.
El marco es compacto para priorizar especificaciones y planes en pantalla.
Click abre lightbox (pantalla completa).

### 8.3 QR por activo
- QR único por activo (codifica el UUID)
- Botón "Ver QR" en detalle para mostrar e imprimir
- Funciona 100% offline

### 8.4 Sub-activos
`parent_asset_id` opcional. El detalle del padre muestra sus sub-activos.

---

## 9. REPORTE DE FALLAS (Incidents)

Flujo ultra-rápido (objetivo: <30 segundos):
1. Seleccionar activo (búsqueda rápida o escaneo QR)
2. Seleccionar tipo de falla
3. Seleccionar quién reporta
4. Descripción breve (opcional)
5. Foto (opcional)
6. Guardar

### 9.1 Campos
- `asset_id` — con su área heredada automáticamente
- `type`: `mecanica` | `electrica` | `neumatica`
- `reported_by` — nombre del usuario (selector)
- `reported_at` — automática, editable
- `description` — texto libre
- `photo_url` — imagen opcional
- `status`: `abierta` | `en_progreso` | `cerrada`
- `resolution_time` — campo libre al cerrar ("2 horas 30 minutos")
- `resolved_by` — nombre de quién resolvió
- `closed_at` — timestamp al cerrar

---

## 10. CRONOGRAMA DE MANTENIMIENTO

Esta es la sección más importante del sistema.

### 10.1 Tipos de mantenimiento
- `unico`: se ejecuta una sola vez en una fecha específica
- `preventivo`: se repite con frecuencia definida por tarea

### 10.2 Plan de mantenimiento (`maintenance_plans`)
- `title`, `description` (opcional)
- `asset_ids` — JSONB array de UUIDs (1 o varios activos)
- `type`: `unico` | `preventivo`

### 10.3 Tareas (`maintenance_tasks`)
Cada plan tiene N tareas, cada una con:
- `description`
- `frequency_days` — cada cuántos días se repite
- `next_due_date` — calculada automáticamente
- `status`: `pendiente` | `completada` | `vencida`

### 10.4 Sub-pasos de tarea (`task_steps`)
Cada tarea puede tener N sub-pasos ordenados:
- `task_id` (FK → `maintenance_tasks`)
- `description`
- `sort_order`

### 10.5 Registro de ejecución (`maintenance_logs`)
Al completar una tarea:
- `task_id`, `plan_id`, `asset_id`
- `completed_by` — nombre del técnico
- `notes`, `photo_url`
- `completed_at`
- `completed_step_ids` — array de IDs de `task_steps` completados (solo Dexie)

### 10.6 Lógica de frecuencias
Al completar una tarea preventiva, recalcula `next_due_date`
basada en `frequency_days`.

Al **crear** un plan, el usuario selecciona la "Fecha del primer mantenimiento" (`start_date`).
Todas las tareas del nuevo plan reciben esa fecha como su `next_due_date` inicial.
Si no se especifica, se usa la fecha actual como fallback.
(Al **editar** un plan, las tareas nuevas usan `hoy + frequency_days`, como antes.)

### 10.7 Vista del cronograma
Dos vistas navegables:
- Semanal: 7 días con tareas por día
- Mensual: calendario con indicadores

El header de `/schedule` incluye dos acciones rápidas:
- Botón "Preventivos" → `/schedule/preventive`
- Botón "Plan" → `/schedule/new-plan`

El modal de detalle de día (`DayDetailModal`) muestra:
- Tareas con `next_due_date` exacto al día seleccionado
- Si el día es HOY: también incluye tareas vencidas (`status=pendiente, next_due_date < hoy`) de días anteriores

El `MonthView` agrega al día de HOY los puntos indicadores de tareas vencidas provenientes de meses anteriores (no visibles en otras celdas del mes actual).

### 10.10 Vista de planes preventivos
`/schedule/preventive` — listado centralizado de todos los planes de tipo `preventivo`.
- Agrupados por categoría de activo usando el componente `Accordion` (`src/components/ui/accordion.tsx`).
- Cada `AccordionItem` representa una categoría (colapsable). Muestra nombre + contador de planes.
- Dentro de cada categoría, cada plan muestra:
  - Título (botón → `/schedule/plan/:id`)
  - Activo(s) vinculado(s): nombres separados por coma (máx 2, luego "+N más")
  - **Todas las `next_due_date` únicas** de las tareas del plan como badges con código de colores:
    - 🔴 Rojo: fecha vencida (antes de hoy)
    - 🟡 Amarillo: hoy o mañana
    - 🟢 Verde: futura
    - ⚫ Gris: completada
  - Acciones: editar (→ `/schedule/plan/:id/edit`) y eliminar (con confirmación).
- Los datos se actualizan en tiempo real vía `useLiveQuery` (tasks + plans + assets).
- Botón `+` en el header para crear un nuevo plan.

### 10.8 Pantalla de hoy
Primera pantalla al abrir la app. Orden de prioridad:
1. Tareas vencidas (rojo)
2. Tareas de hoy (amarillo)
3. Fallas abiertas
4. Tareas de esta semana (verde)

El header del cronograma en `/` incluye dos acciones rápidas:
- Botón "Preventivos" (outline) → `/schedule/preventive`
- Botón "+ Plan" → `/schedule/new-plan`

El modal de detalle de día en `TodayPage` recibe los incidentes del día seleccionado (filtrados desde `calendarIncidents` usando `getIncidentDayKey`: cerrados por `closed_at`, abiertos/en_progreso por `reported_at`), garantizando consistencia con los puntos indicadores del `MonthView`.

### 10.9 Edición posterior
Permite completar tareas con fecha retroactiva y editar registros
ya completados. Crítico para usuarios que olvidan registrar en el momento.

---

## 11. ESCANEO QR

Accesible desde el menú principal y desde botón flotante en inicio.
1. Abre escáner → apunta cámara al QR
2. Lee UUID del activo
3. Navega a detalle del activo
4. Funciona 100% offline

---

## 12. HISTORIAL

Muestra cronológicamente mantenimientos ejecutados y fallas registradas.

Filtros: por activo, por área, por tipo (mantenimiento/falla), por rango de fechas.
El historial nunca se elimina automáticamente.

---

## 13. RESUMEN PERIÓDICO

Vista dentro de la app (no PDF).
Períodos: últimos 15 días / último mes / personalizado.

Contenido:
- Total de mantenimientos y tareas completadas vs pendientes
- Total de fallas reportadas y resueltas
- Activos con más fallas en el período
- Tareas vencidas no completadas

---

## 14. IMÁGENES

Pipeline:
1. Captura desde cámara o galería
2. Compresión: máx 800x600px, calidad 0.75 WebP (fallback JPEG), máx 20MB input
3. Almacenamiento local en Dexie (`offline_files`) con ID `local:{uuid}`
4. Sync a Supabase Storage bucket `gmao-images` cuando hay conexión
5. Blob local se conserva 30 días como fallback offline (`purgeOldBlobs`)
6. Liberación de ObjectURLs al desmontar componentes (`useObjectUrl` hook)

---

## 15. NAVEGACIÓN Y RUTAS

Menú principal (bottom nav mobile, sidebar desktop):
1. 🏠 `/` — Hoy (TodayPage)
2. 🔧 `/assets` — Activos
3. 📅 `/schedule` — Cronograma
4. ⚠️ `/incidents` — Fallas
5. 📋 `/history` — Historial
6. 📷 `/scan` — Escanear QR

Rutas adicionales:
- `/assets/new`, `/assets/:id`, `/assets/:id/edit`, `/assets/area/:id`
- `/schedule/new-plan`, `/schedule/plan/:id`, `/schedule/plan/:id/edit`, `/schedule/preventive`
- `/incidents/new`, `/incidents/:id`
- `/admin` — Panel de administración (acceso por PIN)

*Nota:* El hosteo en Vercel requiere configuración SPA mediante rules en `vercel.json` apuntando el wildcard hacia `/index.html`.

---

## 16. MODELO DE DATOS

### 16.1 Tablas en Supabase (PostgreSQL)

```sql
areas (id uuid PK, code text UNIQUE NOT NULL, name text NOT NULL, sort_order int, created_at timestamptz, deleted_at timestamptz)

asset_categories (id uuid PK, name text NOT NULL, sort_order int, created_at timestamptz, deleted_at timestamptz)

assets (id uuid PK, name text NOT NULL, category_id uuid FK, area_id uuid FK, parent_asset_id uuid FK→self, image_url text, specs jsonb DEFAULT '[]', status text DEFAULT 'operativo', deleted_at timestamptz, created_at timestamptz, updated_at timestamptz)

incidents (id uuid PK, asset_id uuid FK NOT NULL, type text NOT NULL, reported_by text DEFAULT '', description text, photo_url text, status text DEFAULT 'abierta', resolution_time text, reported_at timestamptz, closed_at timestamptz, deleted_at timestamptz, created_at timestamptz, updated_at timestamptz, resolved_by text)

maintenance_plans (id uuid PK, title text NOT NULL, description text, asset_ids jsonb DEFAULT '[]', type text DEFAULT 'preventivo', deleted_at timestamptz, created_at timestamptz, updated_at timestamptz)

maintenance_tasks (id uuid PK, plan_id uuid FK NOT NULL, description text NOT NULL, frequency_days int DEFAULT 1, next_due_date date, status text DEFAULT 'pendiente', created_at timestamptz, updated_at timestamptz, deleted_at timestamptz)

task_steps (id uuid PK, task_id uuid FK NOT NULL, description text NOT NULL, sort_order int DEFAULT 0, deleted_at timestamptz, created_at timestamptz, updated_at timestamptz)

maintenance_logs (id uuid PK, task_id uuid FK, plan_id uuid FK, asset_id uuid FK NOT NULL, completed_by text, notes text, photo_url text, completed_at timestamptz, created_at timestamptz)

users (id uuid PK, name text NOT NULL, created_at timestamptz, updated_at timestamptz, deleted_at timestamptz)

deleted_records (id uuid PK, table_name text NOT NULL, record_id uuid NOT NULL, deleted_at timestamptz)
```

### 16.2 Tablas solo en Dexie (no sincronizadas)

```
notifications: id, type (falla|mantenimiento_vencido), title, body, reference_id, read (bool), created_at
offline_files: id (local:{uuid}), blob, thumbnail, uploaded_url, created_at
sync_queue: ++autoId, table, operation, payload, status, retry_count, last_error, created_at
sync_meta: key, value
```

### 16.3 Campo `_synced` (solo Dexie)
Presente en: `users`, `assets`, `incidents`, `maintenance_plans`, `maintenance_tasks`, `maintenance_logs`, `task_steps`.
**No** presente en: `areas`, `asset_categories` (tablas sin `_synced` en schema Dexie).

### 16.4 Campo `completed_step_ids` (solo Dexie)
Presente en `maintenance_logs`. Array de IDs de `task_steps` completados.
No existe en Supabase.

### 16.5 Dexie Versiones
La DB está en **versión 7**. Migraciones notables:
- v5: deduplicación de `asset_categories` por nombre
- v6: corrección de IDs no-UUID a UUIDs válidos para categorías
- v7: tabla `task_steps`

---

## 17. REGLA ABSOLUTA DE AUTO-MANTENIMIENTO DOCUMENTAL

> **Si implementas un cambio que altera la base de datos, la arquitectura,
> los flujos principales, las dependencias o las rutas, DEBES actualizar
> inmediatamente `REQUIREMENTS.md` y `CLAUDE.md` en esa misma tarea
> para reflejar los cambios.**

---

## 19. ACCESIBILIDAD Y DIRECTRICES DE UI

Implementadas según Vercel Web Interface Guidelines (2026-03-11):

### 19.1 Reglas de accesibilidad obligatorias
- **Botones icon-only**: siempre `aria-label` descriptivo
- **Iconos decorativos**: siempre `aria-hidden="true"`
- **Lightbox / diálogos**: `role="dialog"`, `aria-modal="true"`, `aria-label`, handler de Escape
- **TrafficLight**: `role="img"` + `aria-label` con el estado en texto
- **Tabs**: contenedor con `role="tablist"`, cada tab con `role="tab"` + `aria-selected`
- **Formularios**: `<label htmlFor>` vinculado al `id` del input; errores con `role="alert"`

### 19.2 CSS y rendimiento
- `transition-all` está prohibido — enumerar propiedades explícitas
- `touch-action: manipulation` en todos los botones y filas interactivas
- `prefers-reduced-motion`: respetar con `@media (prefers-reduced-motion: reduce)` o `motion-safe:` modifier
- `font-variant-numeric: tabular-nums` en datos numéricos (`.gmao-mono`, `.gmao-stat-num`)
- `text-wrap: balance` en headings h1–h6

### 19.3 Tokens de diseño
- No usar colores Tailwind crudos (`bg-gray-900`, `bg-red-600`) en páginas — usar tokens: `bg-destructive`, `text-foreground`, `bg-background`, etc.
- Header de sub-páginas: `bg-card border-b-2 border-primary` (naranja)
- Skip link: primer elemento del DOM para usuarios de teclado

### 19.4 Formularios
- Submit con estado de carga: spinner `<Loader2 animate-spin>` + texto "Guardando…"
- `autoComplete="name"` en inputs de nombre de persona
- `autoComplete="off"` en inputs de fecha

---

## 18. RESTRICCIONES DE EJECUCIÓN

- Responde con código + 1 línea de confirmación. Sin explicaciones largas.
- No instales dependencias sin confirmación.
- No hagas commits automáticos.
- Modifica solo los archivos mencionados en el prompt.
- Antes de cambios en `src/lib/sync/`, muestra plan y espera confirmación.
- Offline-first es el principio más importante — nunca sacrificarlo.
- Velocidad de UX es segunda prioridad — mínimos pasos para todo.
- El schema de Dexie y Supabase deben ser equivalentes en estructura.
- Las categorías son datos iniciales gestionables, no enums hardcodeados.
- El PIN de admin se guarda en `sync_meta` en Dexie (no en Supabase).
- Las notificaciones son locales (Web Push API) — no requieren server.
