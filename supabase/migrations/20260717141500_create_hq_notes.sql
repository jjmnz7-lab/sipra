-- Crear tabla hq_notes
CREATE TABLE public.hq_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id uuid NOT NULL REFERENCES public.academia(id),
  admin_id    uuid NOT NULL REFERENCES hq_admins(id),
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS sin políticas (acceso exclusivo vía service role desde HQ)
ALTER TABLE public.hq_notes ENABLE ROW LEVEL SECURITY;
