-- Crear tabla hq_audit_logs si no existe
CREATE TABLE IF NOT EXISTS public.hq_audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid REFERENCES public.hq_admins(id) ON DELETE SET NULL,
  academia_id uuid REFERENCES public.academia(id) ON DELETE SET NULL,
  action      text NOT NULL,
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
