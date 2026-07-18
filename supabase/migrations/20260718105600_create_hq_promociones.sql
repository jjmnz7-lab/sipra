-- Crear tabla hq_promociones
CREATE TABLE public.hq_promociones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL UNIQUE,
  capacidades jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS sin políticas (acceso exclusivo para service_role desde HQ)
ALTER TABLE public.hq_promociones ENABLE ROW LEVEL SECURITY;
