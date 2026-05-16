-- Migración: 005_timeline_envios
-- Descripción: Creación de tablas para historial narrativo (evento_timeline), outbox de WhatsApp (envio_sugerido) y auditoría de crons (job_execution).

-- ==============================================================================
-- 1. Tabla: evento_timeline
-- ==============================================================================
CREATE TABLE public.evento_timeline (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id  UUID         NOT NULL REFERENCES public.academia(id),
  persona_id   UUID         NOT NULL REFERENCES public.persona(id),
  categoria    VARCHAR(30)  NOT NULL,
  tipo         VARCHAR(50)  NOT NULL,
  titulo       VARCHAR(150) NOT NULL,
  descripcion  TEXT,
  fecha_evento TIMESTAMPTZ  NOT NULL DEFAULT now(),
  actor_id     UUID         REFERENCES public.usuario(id),
  actor_nombre VARCHAR(100), -- Desnormalizado para evitar fallos si el usuario se elimina lógicamente o cambia
  metadata     JSONB        NOT NULL DEFAULT '{}',

  CONSTRAINT chk_et_categoria CHECK (categoria IN ('financiero', 'comunicacion', 'sistema', 'operativo'))
);

CREATE INDEX idx_timeline_academia_persona ON public.evento_timeline (academia_id, persona_id, fecha_evento DESC);
CREATE INDEX idx_timeline_categoria        ON public.evento_timeline (academia_id, categoria, fecha_evento DESC);

ALTER TABLE public.evento_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY timeline_select_policy ON public.evento_timeline
FOR SELECT TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id));

CREATE POLICY timeline_insert_policy ON public.evento_timeline
FOR INSERT TO authenticated
WITH CHECK (
  sipra_auth.is_auth_user_for_tenant(academia_id)
  AND sipra_auth.can_write_to_academia(academia_id)
);

-- Los eventos son inmutables (append-only)
CREATE POLICY timeline_update_policy ON public.evento_timeline
FOR UPDATE TO authenticated
USING (false) WITH CHECK (false);

CREATE POLICY timeline_delete_policy ON public.evento_timeline
FOR DELETE TO authenticated
USING (false);

-- ==============================================================================
-- 2. Tabla: envio_sugerido
-- ==============================================================================
CREATE TABLE public.envio_sugerido (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id     UUID         NOT NULL REFERENCES public.academia(id),
  persona_id      UUID         NOT NULL REFERENCES public.persona(id),
  cargo_id        UUID         REFERENCES public.cargo(id),
  tipo_mensaje    VARCHAR(50)  NOT NULL,
  estado          VARCHAR(30)  NOT NULL DEFAULT 'pendiente_revision',
  invalid_reason  TEXT,
  fecha_sugerida  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  fecha_procesado TIMESTAMPTZ,
  metadata        JSONB        NOT NULL DEFAULT '{}',

  CONSTRAINT chk_es_tipo   CHECK (tipo_mensaje IN ('recordatorio_pago', 'bienvenida_grupo', 'seguimiento_general')),
  CONSTRAINT chk_es_estado CHECK (estado IN ('pendiente_revision', 'enviado', 'ignorado', 'invalidado'))
);

CREATE INDEX idx_envio_sugerido_academia_estado ON public.envio_sugerido (academia_id, estado);
CREATE INDEX idx_envio_sugerido_cargo           ON public.envio_sugerido (cargo_id);

ALTER TABLE public.envio_sugerido ENABLE ROW LEVEL SECURITY;

CREATE POLICY envio_select_policy ON public.envio_sugerido
FOR SELECT TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id));

CREATE POLICY envio_insert_policy ON public.envio_sugerido
FOR INSERT TO authenticated
WITH CHECK (
  sipra_auth.is_auth_user_for_tenant(academia_id)
  AND sipra_auth.can_write_to_academia(academia_id)
);

CREATE POLICY envio_update_policy ON public.envio_sugerido
FOR UPDATE TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id))
WITH CHECK (sipra_auth.can_write_to_academia(academia_id));

CREATE POLICY envio_delete_policy ON public.envio_sugerido
FOR DELETE TO authenticated
USING (false);

-- ==============================================================================
-- 3. Tabla: job_execution
-- ==============================================================================
CREATE TABLE public.job_execution (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name         VARCHAR(100) NOT NULL,
  academia_id      UUID         REFERENCES public.academia(id), -- Null = Global job
  status           VARCHAR(20)  NOT NULL,
  started_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  completed_at     TIMESTAMPTZ,
  records_procesed INTEGER      DEFAULT 0,
  error_message    TEXT,
  metadata         JSONB        NOT NULL DEFAULT '{}',

  CONSTRAINT chk_job_status CHECK (status IN ('running', 'success', 'failed'))
);

CREATE INDEX idx_job_execution_name_status ON public.job_execution (job_name, status);
CREATE INDEX idx_job_execution_academia    ON public.job_execution (academia_id);

ALTER TABLE public.job_execution ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_select_policy ON public.job_execution
FOR SELECT TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id));

-- Solo Edge Functions con service_role pueden insertar/modificar jobs.
CREATE POLICY job_insert_policy ON public.job_execution
FOR INSERT TO authenticated
WITH CHECK (false);

CREATE POLICY job_update_policy ON public.job_execution
FOR UPDATE TO authenticated
USING (false) WITH CHECK (false);

CREATE POLICY job_delete_policy ON public.job_execution
FOR DELETE TO authenticated
USING (false);
