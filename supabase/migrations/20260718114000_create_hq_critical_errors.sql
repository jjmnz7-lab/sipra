-- Crear tabla hq_critical_errors
CREATE TABLE public.hq_critical_errors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id   uuid NOT NULL REFERENCES public.academia(id),
  contexto      text NOT NULL, -- e.g., 'procesamiento_pago', 'webhook_stripe', 'registro_usuario'
  error_message text NOT NULL,
  stack_trace   text,
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.hq_critical_errors ENABLE ROW LEVEL SECURITY;

-- Permitir inserción a usuarios autenticados para que el backend de SIPRA pueda reportar errores
CREATE POLICY hq_critical_errors_insert_policy ON public.hq_critical_errors
  FOR INSERT TO authenticated
  WITH CHECK (sipra_auth.is_auth_user_for_tenant(academia_id));
