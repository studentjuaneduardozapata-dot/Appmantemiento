# GMAO Planta de Maíz — Claude Code Config

## Stack
React 18 + TypeScript | Vite + vite-plugin-pwa | Tailwind + shadcn/ui
Dexie v4 + dexie-react-hooks | Zustand | Supabase v2
React Router v6 | react-hook-form + zod | date-fns | sonner
qrcode | html5-qrcode | lucide-react

## Regla absoluta de datos
- LECTURAS: siempre `useLiveQuery(() => db.tabla...)` — nunca Supabase directo
- MUTACIONES: escribe en Dexie con `_synced: false` → encola en sync_queue
- `_synced: true` solo después de push exitoso a Supabase

## Archivos críticos (cargar con @ cuando sean relevantes)
- @REQUIREMENTS.md — especificación completa del sistema
- @src/lib/db.ts — schema Dexie, fuente de verdad del modelo de datos
- @src/lib/sync/ — engine completo, pedir plan antes de modificar
- @src/types/index.ts — tipos globales

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
- Antes de tocar src/lib/sync/: mostrar plan y esperar confirmación
- Respuesta: código + 1 línea confirmación. Sin explicaciones largas.

## Contexto del negocio
GMAO para planta procesadora de maíz. 1-4 usuarios sin login.
Offline-first es la prioridad #1. Velocidad de UX es #2.
Ver @REQUIREMENTS.md para especificación completa.
