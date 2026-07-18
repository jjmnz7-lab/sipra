-- Alterar column admin_id de hq_audit_logs para NOT NULL
ALTER TABLE public.hq_audit_logs ALTER COLUMN admin_id SET NOT NULL;

-- Crear tabla hq_impersonation_tokens
CREATE TABLE IF NOT EXISTS public.hq_impersonation_tokens (
  token          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id    uuid NOT NULL REFERENCES public.academia(id) ON DELETE CASCADE,
  admin_id       uuid NOT NULL REFERENCES public.hq_admins(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at     timestamptz NOT NULL,
  used           boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);
