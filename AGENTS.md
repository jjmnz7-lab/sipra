# AGENTS.md — Constitución Técnica SIPRA
> Este archivo es la fuente de verdad para agentes de código, LLMs y desarrolladores.
> Todas las decisiones aquí son **obligatorias**. No se debaten sin RFC explícito.

---

## 1. Stack Obligatorio

| Capa | Tecnología | Versión |
|---|---|---|
| Framework frontend | Next.js App Router | 15+ |
| Lenguaje | TypeScript | strict mode |
| Estilos | Tailwind CSS | **v4** |
| Componentes UI | shadcn/ui | latest |
| Base de datos | PostgreSQL via Supabase | — |
| Auth | Supabase Auth | — |
| Backend lógico | PL/pgSQL (RPCs) + Edge Functions (Deno) | — |
| Storage | Supabase Storage | — |
| Scheduler | pg_cron + Edge Functions | — |
| ORM / cliente DB | `@supabase/supabase-js` (v2) | — |

---

## 2. Stack Prohibido

Las siguientes tecnologías están **explícitamente prohibidas**:

- ❌ Prisma, Drizzle, TypeORM — usar cliente Supabase + RPCs directamente
- ❌ Redux, Zustand, Jotai — usar React state + Server Components + `useQuery` donde aplique
- ❌ axios — usar `fetch` nativo o cliente Supabase
- ❌ Tailwind CSS v3 — el proyecto usa **v4** (sintaxis diferente)
- ❌ CSS Modules / styled-components / Emotion
- ❌ Express / NestJS / Fastify — la lógica de servidor vive en Edge Functions y RPCs
- ❌ `any` en TypeScript — usar tipos explícitos o `unknown` con narrowing
- ❌ `console.log` en producción — usar utilidad de logging estructurado
- ❌ `DELETE FROM` en tablas financieras desde cualquier capa
- ❌ Mutación directa de tablas financieras desde el frontend (sin pasar por RPC)

---

## 3. Estructura de Carpetas

```
sipra/
├── AGENTS.md                          ← Este archivo
├── app/                               ← Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (app)/                         ← Rutas protegidas
│   │   ├── layout.tsx                 ← Shell con nav + sidebar
│   │   ├── pendientes/
│   │   │   └── page.tsx
│   │   ├── seguimiento/
│   │   │   └── [persona_id]/page.tsx
│   │   ├── grupos/
│   │   │   ├── page.tsx
│   │   │   └── [grupo_id]/page.tsx
│   │   ├── recordatorios/
│   │   │   └── page.tsx
│   │   └── configuracion/
│   │       └── page.tsx
│   └── api/                           ← Solo webhooks y callbacks externos
│       └── webhooks/
├── components/
│   ├── ui/                            ← shadcn/ui primitivos (no editar)
│   ├── domain/                        ← Componentes de dominio SIPRA
│   │   ├── persona/
│   │   ├── cargo/
│   │   ├── movimiento/
│   │   ├── grupo/
│   │   ├── timeline/
│   │   └── envio/
│   └── layout/                        ← Shell, nav, sidebar
├── lib/
│   ├── supabase/
│   │   ├── client.ts                  ← Browser client (singleton)
│   │   ├── server.ts                  ← Server client (cookies)
│   │   └── middleware.ts
│   ├── rpc/                           ← Wrappers tipados de RPCs
│   │   ├── pagos.ts
│   │   ├── cargos.ts
│   │   └── personas.ts
│   ├── utils/
│   │   ├── currency.ts
│   │   ├── dates.ts
│   │   └── idempotency.ts
│   └── types/
│       ├── database.types.ts          ← Auto-generado por Supabase CLI
│       ├── domain.ts                  ← Tipos de dominio extendidos
│       └── rpc.ts                     ← Tipos de payloads RPC
├── supabase/
│   ├── migrations/                    ← Migraciones SQL versionadas
│   ├── functions/                     ← Edge Functions (Deno)
│   │   ├── nightly-worker/
│   │   ├── subscription-review/
│   │   └── storage-reaper/
│   └── seed.sql
├── docs/
│   └── requirements/                  ← Documentación fuente
└── .env.local                         ← Variables de entorno (nunca al repo)
```

---

## 4. Reglas Frontend

### 4.1 Arquitectura de Componentes

- Usar **Server Components** por defecto. Agregar `'use client'` solo cuando sea necesario (hooks, eventos, estado local)
- Los Server Components pueden acceder a Supabase directamente via `lib/supabase/server.ts`
- Los Client Components reciben datos como props desde Server Components — **no** hacen fetch en mount si se puede evitar
- Separar: `page.tsx` (layout/data) → `*-view.tsx` (presentación) → `*-form.tsx` (interacción)

### 4.2 Data Fetching

```typescript
// ✅ Correcto — Server Component
async function PendientesPage() {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('cargo')
    .select('...')
    .eq('estado_financiero', 'vencido')
  // ...
}

// ✅ Correcto — Client Component con mutación
'use client'
async function handlePago() {
  const idempotencyKey = crypto.randomUUID() // SIEMPRE generar antes
  const { data, error } = await supabase.rpc('registrar_pago_atomico_v1', {
    p_idempotency_key: idempotencyKey,
    // ...
  })
  if (data?.needs_refresh) await supabase.auth.refreshSession()
}
```

### 4.3 Reglas de Seguridad Frontend

- ❌ El frontend **nunca** autoriza acceso a datos — solo usa claims para UX (ocultar menús)
- ❌ El frontend **nunca** muta tablas financieras directamente (`cargo`, `movimiento`, `aplicacion_movimiento`)
- ❌ No cachear `signed URLs` de Storage — generarlas on-demand siempre
- ✅ Siempre generar `idempotency_key = crypto.randomUUID()` **antes** de enviar cualquier operación financiera
- ✅ Manejar `needs_refresh: true` en respuestas de RPC con `supabase.auth.refreshSession()`
- ✅ Mostrar banner de modo read-only cuando `is_academia_readonly()` retorne `true`

### 4.4 Estados Visuales de Cargo

| Estado | Color Tailwind (Hex) | Condición |
|---|---|---|
| `liquidado` | `text-st-aldia` (#5C8F78) | `estado_financiero = 'liquidado'` |
| `pendiente` | `text-st-pendiente` (#D2A45C) | No vencido, saldo > 0 |
| `parcial` | `text-st-pendiente` (#D2A45C) | `estado_financiero = 'parcial'` |
| `vencido` | `text-st-atrasado` (#B85C50) | `estado_financiero = 'vencido'` |
| `urgente` | `text-st-urgente` (#7A2F38) | Estado crítico / urgente |
| `anulado` | `text-gray-400 line-through` | `estado_financiero = 'anulado'` |

### 4.5 Pantallas y Rutas

| Ruta | Propósito |
|---|---|
| `/pendientes` | Pantalla principal — carga por defecto tras login |
| `/seguimiento/[persona_id]` | Timeline operativo por persona |
| `/grupos` + `/grupos/[grupo_id]` | Vista organizativa |
| `/recordatorios` | Outbox WhatsApp asistido |
| `/configuracion` | Configuración de academia |

---

## 5. Reglas Backend (RPCs y Edge Functions)

### 5.1 Patrón RPC Obligatorio

Toda RPC crítica sigue estas **6 capas en orden**:

```sql
CREATE OR REPLACE FUNCTION public.{nombre}_v1(...)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
BEGIN
  -- 1. SEGURIDAD: tenant, usuario activo, suscripción válida
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  -- 2. VALIDACIÓN DE NEGOCIO: saldos, estados, cuotas, duplicados

  -- 3. LOCKS: FOR UPDATE en orden determinístico ASC para evitar deadlocks
  SELECT id FROM cargo WHERE id = ANY(p_cargo_ids) ORDER BY id ASC FOR UPDATE;

  -- 4. LEDGER: mutar movimiento, cargo, aplicacion_movimiento
  --    Preservar: monto_total = monto_disponible + SUM(aplicaciones)
  --    Preservar: monto_original = saldo_pendiente + SUM(aplicaciones)

  -- 5. SIDE EFFECTS: invalidar envio_sugerido, limpiar caches
  UPDATE envio_sugerido SET estado='invalidado', invalid_reason='Cargo liquidado'
  WHERE cargo_id = p_cargo_id AND estado = 'pendiente_revision';

  -- 6. TIMELINE: insertar evento dentro de la misma transacción
  INSERT INTO evento_timeline (academia_id, persona_id, categoria, tipo, titulo, metadata, ...)
  VALUES (p_academia_id, v_persona_id, 'financiero', 'abono_registrado', '...', '{...}', ...);

  RETURN jsonb_build_object(
    'success', true,
    'operation_id', v_id,
    'timeline_event_id', v_tl_id,
    'data', jsonb_build_object(),
    'warnings', '[]'::jsonb,
    'needs_refresh', false
  );
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;
```

### 5.2 Reglas de RPC

- ✅ Toda RPC lleva sufijo de versión: `registrar_pago_v1`, `generar_cargos_v1`
- ✅ `SECURITY DEFINER` + `SET search_path = public, sipra_auth` en toda RPC operativa
- ✅ `FOR UPDATE` en toda fila financiera afectada — siempre `ORDER BY id ASC`
- ✅ `SET LOCAL lock_timeout = '5s'` en RPCs que toquen múltiples filas críticas
- ✅ Retorno siempre `jsonb` estructurado — nunca `boolean` ni `void`
- ✅ Errores con `RAISE EXCEPTION USING MESSAGE=..., ERRCODE='P0001', DETAIL=...`
- ❌ Nunca dos RPCs separadas para una sola operación de negocio
- ❌ `estado_financiero` nunca se actualiza con `UPDATE` manual — es derivado de la lógica de la RPC
- ❌ `DELETE` físico en tablas financieras — prohibido absolutamente

### 5.3 Edge Functions

- Responsables de: integraciones externas, webhooks, cron dispatching, WhatsApp
- **NO** contienen lógica financiera — la delegan a RPCs
- Usan `service_role` **siempre con filtros explícitos de `academia_id`** — nunca queries sin tenant

### 5.4 Workers y Cron

- Cada worker es especializado (no mega-cron monolítico)
- Todo worker registra en `job_execution` si hubo trabajo real, error o retry
- Workers procesan en chunks paginados — nunca batch ilimitado
- `next_run_utc` es campo persistido: `next = previous_scheduled + interval` (no `now() + interval`)

---

## 6. Convenciones TypeScript

### 6.1 Configuración `tsconfig.json`

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 6.2 Tipos de Dominio

```typescript
// ✅ Usar tipos generados por Supabase CLI como base
import type { Database } from '@/lib/types/database.types'
type Cargo = Database['public']['Tables']['cargo']['Row']

// ✅ Extender con tipos de dominio cuando sea necesario
type CargoConPersona = Cargo & {
  persona: Pick<Persona, 'nombre' | 'apellido' | 'telefono_whatsapp'>
}

// ✅ Tipos de respuesta RPC siempre explícitos
interface RpcResponse<T = Record<string, unknown>> {
  success: boolean
  operation_id: string
  timeline_event_id: string
  data: T
  warnings: string[]
  needs_refresh: boolean
}

// ❌ Prohibido
const result: any = await supabase.rpc('...')
```

### 6.3 Naming Conventions

| Elemento | Convención | Ejemplo |
|---|---|---|
| Componentes React | PascalCase | `CargoListItem` |
| Hooks | `use` + camelCase | `usePendientes` |
| Funciones utilidad | camelCase | `formatCurrency` |
| Constantes globales | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Tablas DB (referencia) | snake_case | `cargo`, `persona_grupo` |
| RPCs | snake_case + `_v{n}` | `registrar_pago_v1` |
| Archivos de componente | kebab-case | `cargo-list-item.tsx` |
| Variables de entorno | `NEXT_PUBLIC_` (client) / sin prefijo (server) | `NEXT_PUBLIC_SUPABASE_URL` |

### 6.4 Prohibiciones TypeScript

```typescript
// ❌ any
const data: any = {}

// ❌ as T sin validación (type casting ciego)
const cargo = result as Cargo

// ❌ Non-null assertion sin justificación documentada
const id = cargo.persona_id!

// ✅ Narrowing explícito
if (!cargo.persona_id) throw new Error('cargo sin persona_id')
const id = cargo.persona_id
```

---

## 7. Reglas Supabase

### 7.1 Clientes

```typescript
// lib/supabase/server.ts — para Server Components, Route Handlers, Middleware
import { createServerClient } from '@supabase/ssr'

// lib/supabase/client.ts — para Client Components (singleton)
import { createBrowserClient } from '@supabase/ssr'
```

- ❌ Nunca importar el client del servidor en un Client Component
- ❌ Nunca usar `createClient` de `@supabase/supabase-js` directamente — usar los wrappers de `lib/supabase/`

### 7.2 RLS — Reglas Obligatorias

- **Toda tabla operativa** tiene RLS activado: `ALTER TABLE {t} ENABLE ROW LEVEL SECURITY`
- **SELECT:** usa JWT via `sipra_auth.is_auth_user_for_tenant(academia_id)` — sin JOINs adicionales
- **INSERT/UPDATE:** usa `sipra_auth.can_write_to_academia(academia_id)` — valida estado vivo en DB
- **DELETE:** `USING (false)` — prohibido físicamente en tablas financieras y de dominio
- ❌ Nunca policy que haga JOIN a otra tabla operativa en SELECT — rompe performance

### 7.3 JWT Claims

El JWT contiene **únicamente** en `app_metadata`:
```json
{ "academia_id": "uuid", "rol": "owner|admin|staff", "claims_version": 1 }
```

❌ Prohibido en JWT: `estado_usuario`, `billing_status`, permisos granulares, arrays grandes.

### 7.4 Migrations

- Toda migración vive en `supabase/migrations/` con timestamp: `20260516120000_descripcion.sql`
- Las migraciones son **siempre incrementales** — nunca modifican una migración existente
- Incluir siempre el `DOWN` comentado para referencia
- Toda nueva tabla incluye: RLS activado, políticas, índices y constraints en la misma migración

### 7.5 Storage

- Buckets siempre privados — nunca públicos
- Paths: `{academia_id}/{contexto}/{YYYY_MM}/{uuid}.{ext}`
- Signed URLs con TTL de 300 segundos (5 min) — generadas on-demand, nunca cacheadas en cliente
- Subida en dos fases: `solicitar_subida_v1()` → upload → `confirmar_subida_v1()`

### 7.6 Generación de Tipos

```bash
# Ejecutar tras cada migración
npx supabase gen types typescript --local > lib/types/database.types.ts
```

---

## 8. Reglas Tailwind v4

### 8.1 Configuración

Tailwind v4 usa `@import` en el CSS — **no** `tailwind.config.js` para la mayoría de tokens:

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* Tokens de color del sistema */
  --color-sipra-primary: oklch(55% 0.2 250);
  --color-sipra-danger:  oklch(55% 0.22 25);
  --color-sipra-warning: oklch(70% 0.18 85);
  --color-sipra-success: oklch(60% 0.18 145);

  /* Tipografía */
  --font-sans: 'Inter', sans-serif;

  /* Spacing y radios custom */
  --radius-card: 0.75rem;
}
```

### 8.2 Reglas de Uso

- ✅ Usar clases utilitarias de Tailwind directamente en JSX
- ✅ Usar `cn()` de `lib/utils` (wrapper de `clsx` + `tailwind-merge`) para clases condicionales
- ✅ Definir tokens semánticos en `@theme` — no hardcodear colores en clases
- ❌ No usar `@apply` salvo en componentes base de shadcn/ui que lo requieran
- ❌ No mezclar sintaxis v3 (`tailwind.config.js` con `theme.extend`) con v4
- ❌ No usar valores arbitrarios `[123px]` para espaciados — usar tokens definidos en `@theme`

### 8.3 Componentes shadcn/ui

- Los componentes en `components/ui/` son de shadcn/ui — **no modificar directamente**
- Para variantes custom: extender en `components/domain/` wrapeando el componente base
- Instalar nuevos componentes: `npx shadcn@latest add {componente}`

---

## 9. Políticas de Seguridad

### 9.1 Multi-Tenancy — Reglas Absolutas

1. **Toda tabla operativa** contiene `academia_id UUID NOT NULL` — sin excepciones
2. **Toda query** desde workers con `service_role` incluye filtro explícito `WHERE academia_id = $1`
3. **Nunca** confiar únicamente en el JWT para operaciones de escritura — validar en DB via `can_write_to_academia()`
4. **Tests de aislamiento** cross-tenant son obligatorios antes de merge a `main`

### 9.2 Operaciones Financieras

- ❌ `DELETE FROM cargo`, `DELETE FROM movimiento`, `DELETE FROM aplicacion_movimiento` — absolutamente prohibido
- ❌ `UPDATE cargo SET estado_financiero = '...'` directo — solo vía RPC transaccional
- ✅ Toda reversión = contra-transacción (nuevo movimiento con `estado='anulado'`)
- ✅ `idempotency_key` obligatorio en toda operación financiera — generado en frontend, validado en RPC

### 9.3 Archivos

- ❌ Buckets públicos — todo archivo requiere signed URL
- ✅ Signed URLs generadas server-side con duración máxima de 300s
- ✅ Paths incluyen `academia_id` como primer segmento — imposible acceso cross-tenant por construcción

### 9.4 Variables de Entorno

```
# .env.local — NUNCA al repositorio
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # Solo en Edge Functions y scripts server-side
```

- `SUPABASE_SERVICE_ROLE_KEY` nunca en código cliente ni en variables `NEXT_PUBLIC_`

---

## 10. Reglas de Rendimiento

### 10.1 Índices Obligatorios

Toda tabla operativa debe tener como mínimo:
```sql
-- Tenant isolation (base de todos los filtros)
CREATE INDEX idx_{tabla}_academia ON {tabla} (academia_id);

-- Estado operativo (para listas y filtros de UI)
CREATE INDEX idx_{tabla}_estado ON {tabla} (academia_id, {campo_estado});
```

Índice compuesto obligatorio para el cron de facturación:
```sql
CREATE INDEX idx_cargo_operativo ON cargo (academia_id, estado_financiero, fecha_vencimiento);
```

### 10.2 Objetivos de Performance

| Operación | Objetivo |
|---|---|
| Carga pantalla Pendientes | < 2s (query indexada, sin materialized views en V1) |
| RPC financiera (`registrar_pago`) | < 500ms |
| Timeline por persona (100 eventos) | < 300ms |
| Signed URL de archivo | < 200ms |

### 10.3 Prohibiciones de Performance

- ❌ `SELECT *` — siempre especificar columnas necesarias
- ❌ N+1 queries — usar joins o selects con relaciones en una sola query
- ❌ `WHERE now() AT TIME ZONE '...'` sobre tablas masivas — rompe índices B-Tree
- ❌ Joins complejos en políticas RLS de SELECT — usan solo funciones helper sobre el JWT
- ❌ `Promise.all()` con más de 20 operaciones concurrentes hacia DB (Bounded Concurrency)

### 10.4 Timezone

- **Todo campo de fecha/hora** usa `TIMESTAMPTZ` — nunca `TIMESTAMP` sin zona
- El campo `next_run_utc` en academia se calcula como: `previous_scheduled + interval` (nunca `now() + interval`)
- Queries de cron usan: `WHERE next_run_utc <= now()` — aprovecha índices B-Tree

---

## 11. Convenciones Git

```
feat(dominio): descripción corta
fix(rls): corrección política cargo
chore(db): migración tabla envio_sugerido
docs(agents): actualizar reglas typescript
```

- `main` — producción, protegida, requiere PR
- `staging` — integración y QA
- `feat/*` — ramas de feature
- Toda migración SQL va en su propio commit
- Tests de aislamiento multi-tenant deben pasar en CI antes de merge a `main`

---

## 12. Reglas que NUNCA se Violan

> Violar cualquiera de estas reglas requiere RFC documentado y aprobación explícita.

1. **RLS activado** en toda tabla con datos de tenant
2. **No DELETE físico** en tablas financieras (cargo, movimiento, aplicacion_movimiento, evento_timeline)
3. **No mutación directa** del ledger desde frontend — siempre via RPC
4. **`academia_id` presente** en toda tabla operativa como FK NOT NULL
5. **`FOR UPDATE` en orden ASC** en toda RPC que toque múltiples filas financieras
6. **Idempotency key** en toda operación financiera expuesta al usuario
7. **Un owner activo mínimo** por academia — rechazar operaciones que lo eliminen
8. **Timeline atómico** — eventos financieros se insertan en la misma transacción que los originó
9. **Signed URLs on-demand** — nunca persistidas ni cacheadas en cliente
10. **TypeScript strict** — `any` no se fusiona a `main`

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
