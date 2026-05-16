-- Migración: 003_persona_grupo
-- Descripción: Creación de tablas de entidades core (persona, grupo, persona_grupo) y sus políticas RLS.

-- ==============================================================================
-- 1. Tabla: persona
-- ==============================================================================
CREATE TABLE public.persona (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id           UUID         NOT NULL REFERENCES public.academia(id),
  nombre                VARCHAR(100) NOT NULL,
  apellido              VARCHAR(100),
  nombre_referencia     VARCHAR(100),
  telefono_whatsapp     VARCHAR(20),
  email                 VARCHAR(150),
  etiqueta              VARCHAR(50)  NOT NULL DEFAULT 'alumno',
  estado_global         VARCHAR(20)  NOT NULL DEFAULT 'al_corriente',
  estado_registro       VARCHAR(20)  NOT NULL DEFAULT 'activo',
  notas_internas        TEXT,
  metadata              JSONB        NOT NULL DEFAULT '{}',
  search_text           TEXT,
  ultima_interaccion_at TIMESTAMPTZ,
  fecha_baja            DATE,
  created_by            UUID         REFERENCES public.usuario(id),
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT chk_persona_nombre         CHECK (char_length(trim(nombre)) > 0),
  CONSTRAINT chk_persona_estado_global  CHECK (estado_global  IN ('al_corriente','pendiente','vencido','pausado','archivado')),
  CONSTRAINT chk_persona_estado_reg     CHECK (estado_registro IN ('activo','inactivo','archivado')),
  CONSTRAINT chk_persona_etiqueta       CHECK (etiqueta IN ('alumno','tutor','staff_externo')),
  CONSTRAINT chk_persona_telefono       CHECK (telefono_whatsapp IS NULL OR char_length(telefono_whatsapp) BETWEEN 10 AND 20)
);

CREATE INDEX idx_persona_academia     ON public.persona (academia_id);
CREATE INDEX idx_persona_estado       ON public.persona (academia_id, estado_global);
CREATE INDEX idx_persona_nombre       ON public.persona (academia_id, nombre, apellido);
CREATE INDEX idx_persona_telefono     ON public.persona (academia_id, telefono_whatsapp);
CREATE INDEX idx_persona_interaccion  ON public.persona (academia_id, ultima_interaccion_at DESC);

ALTER TABLE public.persona ENABLE ROW LEVEL SECURITY;

CREATE POLICY persona_select_policy ON public.persona
FOR SELECT TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id));

CREATE POLICY persona_insert_policy ON public.persona
FOR INSERT TO authenticated
WITH CHECK (
  sipra_auth.is_admin_of_tenant(academia_id)
  AND sipra_auth.can_write_to_academia(academia_id)
);

CREATE POLICY persona_update_policy ON public.persona
FOR UPDATE TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id))
WITH CHECK (sipra_auth.can_write_to_academia(academia_id));

CREATE POLICY persona_delete_policy ON public.persona
FOR DELETE TO authenticated
USING (false);

-- ==============================================================================
-- 2. Tabla: grupo
-- ==============================================================================
CREATE TABLE public.grupo (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id  UUID         NOT NULL REFERENCES public.academia(id),
  nombre       VARCHAR(120) NOT NULL,
  descripcion  TEXT,
  color        VARCHAR(20),
  estado       VARCHAR(20)  NOT NULL DEFAULT 'activo',
  orden_visual INTEGER      NOT NULL DEFAULT 0,
  created_by   UUID         REFERENCES public.usuario(id),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT chk_grupo_estado        CHECK (estado IN ('activo', 'archivado')),
  CONSTRAINT chk_grupo_nombre        CHECK (char_length(trim(nombre)) > 0),
  CONSTRAINT chk_grupo_orden         CHECK (orden_visual >= 0)
);

CREATE UNIQUE INDEX uq_grupo_nombre_tenant ON public.grupo (academia_id, lower(nombre));
CREATE INDEX idx_grupo_academia ON public.grupo (academia_id, estado);

ALTER TABLE public.grupo ENABLE ROW LEVEL SECURITY;

CREATE POLICY grupo_select_policy ON public.grupo
FOR SELECT TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id));

CREATE POLICY grupo_insert_policy ON public.grupo
FOR INSERT TO authenticated
WITH CHECK (
  sipra_auth.is_admin_of_tenant(academia_id)
  AND sipra_auth.can_write_to_academia(academia_id)
);

CREATE POLICY grupo_update_policy ON public.grupo
FOR UPDATE TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id))
WITH CHECK (sipra_auth.can_write_to_academia(academia_id));

CREATE POLICY grupo_delete_policy ON public.grupo
FOR DELETE TO authenticated
USING (false);

-- ==============================================================================
-- 3. Tabla: persona_grupo
-- ==============================================================================
CREATE TABLE public.persona_grupo (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id       UUID         NOT NULL REFERENCES public.academia(id),
  persona_id        UUID         NOT NULL REFERENCES public.persona(id),
  grupo_id          UUID         NOT NULL REFERENCES public.grupo(id),
  estado            VARCHAR(20)  NOT NULL DEFAULT 'activo',
  fecha_inscripcion TIMESTAMPTZ  NOT NULL DEFAULT now(),
  fecha_remocion    TIMESTAMPTZ,
  created_by        UUID         REFERENCES public.usuario(id),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT chk_pg_estado  CHECK (estado IN ('activo', 'removido')),
  CONSTRAINT uq_pg_relacion UNIQUE (persona_id, grupo_id)
);

CREATE INDEX idx_pg_academia ON public.persona_grupo (academia_id, estado);
CREATE INDEX idx_pg_persona  ON public.persona_grupo (persona_id);
CREATE INDEX idx_pg_grupo    ON public.persona_grupo (grupo_id);

ALTER TABLE public.persona_grupo ENABLE ROW LEVEL SECURITY;

CREATE POLICY pg_select_policy ON public.persona_grupo
FOR SELECT TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id));

CREATE POLICY pg_insert_policy ON public.persona_grupo
FOR INSERT TO authenticated
WITH CHECK (
  sipra_auth.is_admin_of_tenant(academia_id)
  AND sipra_auth.can_write_to_academia(academia_id)
);

CREATE POLICY pg_update_policy ON public.persona_grupo
FOR UPDATE TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id))
WITH CHECK (sipra_auth.can_write_to_academia(academia_id));

CREATE POLICY pg_delete_policy ON public.persona_grupo
FOR DELETE TO authenticated
USING (false);
