**Frontend**\
Next.js App Router + TypeScript + Tailwind + shadcn/ui.

**Backend operativo**\
Supabase Postgres con RLS, Auth y funciones RPC para transacciones
críticas.

**Jobs**\
pg_cron para cambios de estado y Edge Functions para tareas externas o
futuras integraciones.

**Multitenancy**\
single DB, shared schema, academia_id en todas las tablas core, y RLS
como guardián principal.

**WhatsApp V1**\
deep linking wa.me / whatsapp:// desde el front, sin automatización
pirata.
