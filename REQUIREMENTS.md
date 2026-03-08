# GMAO Planta de Maíz — Documento de Requerimientos
# Versión 1.0 — Base para construcción con Claude Code

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

- React 18 + TypeScript
- Vite + vite-plugin-pwa (Service Worker automático)
- Tailwind CSS + shadcn/ui
- Dexie v4 (IndexedDB) + dexie-react-hooks (useLiveQuery)
- Zustand (estado global UI)
- Supabase v2 (backend remoto)
- React Router v6
- react-hook-form + zod
- lucide-react (iconos)
- date-fns (fechas)
- Sonner (notificaciones toast)
- qrcode (generación QR)
- html5-qrcode (escaneo QR)

---

## 3. ARQUITECTURA

### 3.1 Offline-First

Toda la UI lee exclusivamente desde Dexie via useLiveQuery.
Nunca llamar a Supabase directamente desde componentes.

Flujo de mutación:
1. Escribe en Dexie con _synced: false
2. Encola en sync_queue
3. SyncManager procesa la cola en background
4. Post-push exitoso: _synced: true en Dexie

Flujo de lectura:
- useLiveQuery(() => db.tabla.toArray()) siempre
- Pull incremental desde Supabase cada 3 minutos + al reconectar

### 3.2 Sync Engine

- Push: sync_queue con reintentos (máx 3), idempotente con upsert
- Pull: incremental por updated_at desde lastSyncTimestamp
- Realtime: suscripción a cambios remotos para las tablas principales
- Reconexión: ping real para detectar conectividad, no solo evento online
- Sin conflictos complejos: last-write-wins es suficiente para 4 usuarios

### 3.3 Estructura de archivos

src/
├── app/                    # Router, Layout, providers
├── pages/                  # Una página por sección
├── components/             # Componentes por dominio
│   ├── ui/                 # Primitivos shadcn
│   ├── assets/
│   ├── maintenance/
│   ├── incidents/
│   └── shared/
├── hooks/                  # Lectura (useLiveQuery) y mutaciones
├── lib/
│   ├── db.ts               # Schema Dexie
│   ├── sync/               # Engine completo
│   ├── networkStatus.ts
│   ├── imageCompression.ts
│   ├── qr.ts
│   └── utils.ts
├── contexts/
│   └── SyncContext.tsx
└── types/
    └── index.ts

---

## 4. SISTEMA DE USUARIOS (sin login)

Sin autenticación. Los "usuarios" son solo nombres para identificar
quién reporta o ejecuta acciones.

Tabla: users { id, name, created_at }

Gestión: solo desde el panel de administración.
Uso: selector dropdown en formularios de fallas y mantenimiento.

---

## 5. PANEL DE ADMINISTRACIÓN

Acceso: PIN de 4 dígitos desde un botón discreto en la pantalla
principal (ej: tap largo en el logo o ícono de ajustes en esquina).
El PIN se guarda en Dexie y es configurable desde el propio panel.
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
Campos: código, nombre, orden de visualización.

Datos iniciales sugeridos (editables):
- Recepción
- Pre-limpieza
- Secado
- Limpieza
- Almacenamiento
- Ensacado
- Báscula
- Taller

---

## 7. CATEGORÍAS DE ACTIVOS

Fijas inicialmente, gestionables desde admin.

Lista inicial:
Silos, Secadoras, Limpiadoras, Pre-limpiadoras, Elevadores,
Básculas, Báscula camionera, Báscula portátil, Clasificadoras,
Desgeminadoras, Hidropolichadores, Ensacadoras, Máquinas de coser,
Tableros de control, Tolvas de recibo, Despredadora,
Transportadores de banda, Montacargas, Elevadores de bulto (malacate),
Elevadores de bultos (grillo), Parrillas, Infraestructura,
Motores, Componentes, Otros

---

## 8. ACTIVOS

### 8.1 Campos
- Foto (opcional) — cámara o galería
- Nombre
- Categoría
- Área
- Activo padre (opcional — para sub-activos)
- Especificaciones técnicas: tabla editable key/value
  Ejemplo: Potencia→3HP, Voltaje→220V, RPM→1700

### 8.2 Estado visual (semáforo)
Calculado automáticamente, visible en la lista:
- 🔴 Rojo: tiene falla abierta O mantenimiento vencido
- 🟡 Amarillo: mantenimiento próximo (vence en los próximos 7 días)
- 🟢 Verde: todo al día

### 8.3 QR por activo
- Cada activo tiene un QR único generado automáticamente
- El QR codifica el ID del activo
- Desde el detalle del activo: botón "Ver QR" para mostrar e imprimir
- Funciona 100% offline (generación y escaneo local)

### 8.4 Sub-activos
Un activo puede tener un padre (parent_asset_id).
Ejemplo: Ensacadora → Motor, Banda, Sensor, Variador.
El detalle del activo padre muestra sus sub-activos.

### 8.5 Edición segura
Editar nombre, foto, categoría o área NO afecta el historial
de mantenimientos ni fallas vinculadas.

---

## 9. REPORTE DE FALLAS

Flujo ultra-rápido (objetivo: menos de 30 segundos):
1. Seleccionar activo (búsqueda rápida o escaneo QR)
2. Seleccionar tipo de falla
3. Seleccionar quién reporta
4. Descripción breve (opcional)
5. Foto (opcional)
6. Guardar

### 9.1 Campos
- Activo asociado (con su área heredada automáticamente)
- Tipo: mecánica / eléctrica / neumática
- Quién reporta (selector de usuarios)
- Fecha (automática, editable)
- Descripción
- Foto de evidencia (opcional)
- Estado: abierta / en progreso / cerrada
- Tiempo de resolución: campo manual al cerrar la falla
  (el usuario escribe cuánto tomó, ej: "2 horas 30 minutos")

### 9.2 Notificaciones
Al reportar una falla: notificación push local en todos los
dispositivos que tengan la app instalada.

---

## 10. CRONOGRAMA DE MANTENIMIENTO

Esta es la sección más importante del sistema.

### 10.1 Tipos de mantenimiento
- Único: se ejecuta una sola vez en una fecha específica
- Preventivo: se repite con frecuencia definida por tarea

### 10.2 Plan de mantenimiento

Un plan tiene:
- Título
- Descripción (opcional)
- Activos asociados (puede ser 1 o varios)
- Lista de tareas, cada una con:
  - Descripción de la tarea
  - Frecuencia propia: cada N días/semanas/meses
  - Próxima fecha de vencimiento (calculada automáticamente)
  - Estado individual: pendiente / completada / vencida

### 10.3 Lógica de frecuencias
El sistema calcula automáticamente cuándo vence cada tarea
de forma independiente. Al completar una tarea, recalcula
su próxima fecha basada en la frecuencia definida.

Ejemplo:
- Lubricación (cada 2 días) → vence 11/Mar
- Tensión de banda (cada 15 días) → vence 22/Mar
- Cambio de filtro (cada 30 días) → vence 06/Abr

### 10.4 Vista del cronograma
Dos vistas navegables:
- Semanal: muestra los 7 días de la semana con tareas por día
- Mensual: vista calendario con indicadores por día

Código de colores:
- 🔴 Vencido (no se hizo en su fecha)
- 🟡 Vence hoy o mañana
- 🟢 Programado (fecha futura)
- ⚫ Completado

### 10.5 Pantalla de hoy
Primera pantalla al abrir la app.
Muestra en orden de prioridad:
1. Tareas vencidas (rojo) — debían hacerse antes de hoy
2. Tareas de hoy (amarillo)
3. Fallas abiertas
4. Tareas de esta semana (verde)

### 10.6 Edición posterior
El sistema permite:
- Completar tareas con fecha retroactiva
- Editar registros de mantenimiento ya completados
- Editar fallas días después de registradas
Esto es crítico — los usuarios olvidan registrar en el momento.

---

## 11. ESCANEO QR

Sección accesible desde el menú principal y desde el botón
flotante en pantalla de inicio.

Flujo:
1. Usuario abre escáner QR
2. Apunta cámara al QR del activo físico
3. La app lee el ID del activo
4. Navega automáticamente al detalle del activo
5. Funciona 100% offline (Dexie local)

---

## 12. HISTORIAL

Sección separada en el menú.
Muestra cronológicamente:
- Mantenimientos ejecutados
- Fallas registradas y su resolución

Filtros:
- Por activo
- Por área
- Por tipo (mantenimiento / falla)
- Por rango de fechas

El historial nunca se elimina automáticamente.

---

## 13. RESUMEN PERIÓDICO

Vista dentro de la app (no PDF).
Accesible desde el menú principal.

Períodos: últimos 15 días / último mes / personalizado

Contenido:
- Total de mantenimientos completados
- Total de tareas completadas vs pendientes
- Total de fallas reportadas y resueltas
- Activos con más fallas en el período
- Tareas vencidas no completadas
- Activos nuevos registrados

Diseño: tarjetas de resumen simples, sin gráficos complejos.

---

## 14. IMÁGENES

Pipeline:
1. Captura desde cámara o selección desde galería
2. Compresión automática al cargar:
   - Máximo 800x600px
   - Calidad 0.75 WebP (fallback JPEG)
   - Máximo 20MB de input
3. Almacenamiento local en Dexie (offline_files)
   con ID "local:{uuid}"
4. Sync a Supabase Storage cuando hay conexión
5. Liberación de ObjectURLs al desmontar componentes

---

## 15. NAVEGACIÓN

Menú principal (bottom nav en mobile, sidebar en desktop):
1. 🏠 Hoy — pantalla de inicio con tareas del día
2. 🔧 Activos — lista de activos con semáforo
3. 📅 Cronograma — planificador semanal/mensual
4. ⚠️ Fallas — reporte y lista de averías
5. 📋 Historial — registro completo
6. 📊 Resumen — métricas del período
7. 📷 Escanear QR — acceso rápido al escáner

Panel de admin: acceso por PIN, fuera del menú principal.

---

## 16. SCHEMA DE BASE DE DATOS (Dexie + Supabase)

### Tablas principales:

users: id, name, created_at

areas: id, code, name, sort_order, created_at

asset_categories: id, name, sort_order, created_at

assets:
  id, name, category_id, area_id, parent_asset_id,
  image_url, specs (JSON array {key, value}[]),
  status (operativo/en_mantenimiento/fuera_de_servicio),
  deleted_at, created_at, updated_at, _synced

incidents:
  id, asset_id, type (mecanica/electrica/neumatica),
  reported_by (user name), description, photo_url,
  status (abierta/en_progreso/cerrada),
  resolution_time (string libre),
  reported_at, closed_at,
  deleted_at, created_at, updated_at, _synced

maintenance_plans:
  id, title, description,
  asset_ids (JSON array of UUIDs),
  type (unico/preventivo),
  created_at, updated_at, _synced

maintenance_tasks:
  id, plan_id, description,
  frequency_days (int — cada cuántos días),
  next_due_date (date),
  status (pendiente/completada/vencida),
  created_at, updated_at, _synced

maintenance_logs:
  id, task_id, plan_id, asset_id,
  completed_by (user name),
  notes, photo_url,
  completed_at, created_at, _synced

notifications:
  id, type (falla/mantenimiento_vencido),
  title, body, reference_id,
  read (bool), created_at

offline_files:
  id (local:{uuid}), blob, thumbnail,
  uploaded_url, created_at

sync_queue:
  autoId, table, operation, payload,
  status (pending/processing/completed/failed),
  retry_count, last_error, created_at

sync_meta:
  key, value

deleted_records:
  id, table_name, record_id, deleted_at

---

## 17. COMPORTAMIENTO DE CLAUDE CODE

- Responde con código + 1 línea de confirmación. Sin explicaciones.
- No ejecutes tests automáticamente.
- No instales dependencias sin confirmación.
- No hagas commits automáticos.
- Modifica solo los archivos mencionados en el prompt.
- Si necesitas crear archivo nuevo, propón ruta y espera confirmación.
- Antes de cambios en src/lib/sync/, muestra plan y espera confirmación.

---

## 18. NOTAS FINALES PARA CLAUDE CODE

1. El proyecto se construye desde cero — no hay legacy que respetar
2. Offline-first es el principio más importante — nunca sacrificarlo
3. Velocidad de UX es segunda prioridad — mínimos pasos para todo
4. El schema de Dexie y Supabase deben ser idénticos en estructura
5. Todas las categorías de activos se crean como datos iniciales,
   no como enum hardcodeado — son gestionables desde admin
6. El PIN de admin se guarda en sync_meta en Dexie (no en Supabase)
7. Las notificaciones son locales (Web Push API) — no requieren server
