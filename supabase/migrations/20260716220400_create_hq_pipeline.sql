-- Tabla de pipeline comercial para SIPRA HQ
CREATE TABLE public.hq_pipeline (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_nombre    text NOT NULL,
  contacto_nombre    text,
  contacto_telefono  text,
  stage              text NOT NULL DEFAULT 'prospecto',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_pipeline_stage CHECK (stage IN (
    'prospecto', 'demo_agendada', 'demo_realizada', 'invitacion_enviada', 'completada'
  ))
);

-- RLS habilitado sin policies: acceso exclusivo vía service role
ALTER TABLE public.hq_pipeline ENABLE ROW LEVEL SECURITY;
