-- Migración: 002_academia_usuario
-- Descripción: Creación de tablas de tenant (academia, suscripcion_academia, usuario) y actualización del helper can_write_to_academia.

-- ==============================================================================
-- 1. Tabla: academia
-- ==============================================================================
CREATE TABLE public.academia (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            VARCHAR(150) NOT NULL,
  estado_tenant     VARCHAR(20)  NOT NULL DEFAULT 'activa',
  timezone          VARCHAR(50)  NOT NULL DEFAULT 'America/Mexico_City',
  config_cobro      JSONB        NOT NULL DEFAULT '{"dias_generacion": [1], "horas_minimas_recordatorio": 48}',
  metadata          JSONB        NOT NULL DEFAULT '{}',
  next_run_utc      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT chk_academia_estado CHECK (estado_tenant IN ('activa', 'suspendida', 'archivada')),
  CONSTRAINT chk_academia_nombre CHECK (char_length(trim(nombre)) > 0)
);

ALTER TABLE public.academia ENABLE ROW LEVEL SECURITY;

CREATE POLICY academia_select_policy ON public.academia
FOR SELECT TO authenticated
USING (id = sipra_auth.get_my_tenant_id());

CREATE POLICY academia_update_policy ON public.academia
FOR UPDATE TO authenticated
USING (id = sipra_auth.get_my_tenant_id())
WITH CHECK (
    id = sipra_auth.get_my_tenant_id() 
    AND sipra_auth.get_my_role() = 'owner'
);

-- ==============================================================================
-- 2. Tabla: suscripcion_academia
-- ==============================================================================
CREATE TABLE public.suscripcion_academia (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id         UUID           NOT NULL REFERENCES public.academia(id),
  plan_codigo         VARCHAR(30)    NOT NULL,
  estado              VARCHAR(20)    NOT NULL,
  is_current          BOOLEAN        NOT NULL DEFAULT true,
  max_personas        INTEGER        NOT NULL DEFAULT 30,
  max_usuarios        INTEGER        NOT NULL DEFAULT 2,
  max_grupos          INTEGER,
  precio_mensual      NUMERIC(10,2)  NOT NULL,
  moneda              VARCHAR(10)    NOT NULL DEFAULT 'MXN',
  external_id         VARCHAR(120),
  fecha_inicio        TIMESTAMPTZ    NOT NULL DEFAULT now(),
  fecha_fin           TIMESTAMPTZ,
  fecha_corte         TIMESTAMPTZ,
  trial_ends_at       TIMESTAMPTZ,
  grace_ends_at       TIMESTAMPTZ,
  cancelado_at        TIMESTAMPTZ,
  motivo_cancelacion  TEXT,
  metadata            JSONB          NOT NULL DEFAULT '{}',
  created_by          UUID, -- No referenciamos usuario todavía para evitar problemas de orden
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT chk_sub_plan     CHECK (plan_codigo IN ('trial','basico','pro','personalizado')),
  CONSTRAINT chk_sub_estado   CHECK (estado IN ('trial','activa','gracia','suspendida','cancelada','reemplazada')),
  CONSTRAINT chk_sub_precio   CHECK (precio_mensual >= 0),
  CONSTRAINT chk_sub_personas CHECK (max_personas > 0),
  CONSTRAINT chk_sub_usuarios CHECK (max_usuarios > 0),
  CONSTRAINT chk_sub_fechas   CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE UNIQUE INDEX uq_sub_current ON public.suscripcion_academia (academia_id) WHERE is_current = true;

ALTER TABLE public.suscripcion_academia ENABLE ROW LEVEL SECURITY;

CREATE POLICY suscripcion_select_policy ON public.suscripcion_academia
FOR SELECT TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id));

-- Solo modificable por service_role (backend/workers) o owner en casos específicos (a definirse en RPC)
CREATE POLICY suscripcion_update_policy ON public.suscripcion_academia
FOR UPDATE TO authenticated
USING (false) WITH CHECK (false); 

CREATE POLICY suscripcion_insert_policy ON public.suscripcion_academia
FOR INSERT TO authenticated
WITH CHECK (false);

-- ==============================================================================
-- 3. Tabla: usuario
-- ==============================================================================
CREATE TABLE public.usuario (
  id                UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  academia_id       UUID         NOT NULL REFERENCES public.academia(id),
  nombre            VARCHAR(100) NOT NULL,
  apellido          VARCHAR(100),
  email_snapshot    VARCHAR(150) NOT NULL,
  telefono          VARCHAR(20),
  rol               VARCHAR(20)  NOT NULL DEFAULT 'staff',
  estado            VARCHAR(20)  NOT NULL DEFAULT 'invitado',
  metadata          JSONB        NOT NULL DEFAULT '{}',
  ultimo_acceso_at  TIMESTAMPTZ,
  invitado_por      UUID         REFERENCES public.usuario(id),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT chk_usuario_rol    CHECK (rol IN ('owner', 'admin', 'staff')),
  CONSTRAINT chk_usuario_estado CHECK (estado IN ('invitado', 'activo', 'suspendido', 'archivado')),
  CONSTRAINT chk_usuario_nombre CHECK (char_length(trim(nombre)) > 0),
  CONSTRAINT chk_usuario_email  CHECK (position('@' in email_snapshot) > 1)
);

ALTER TABLE public.suscripcion_academia ADD CONSTRAINT fk_suscripcion_created_by FOREIGN KEY (created_by) REFERENCES public.usuario(id);

CREATE INDEX idx_usuario_academia     ON public.usuario (academia_id, estado);
CREATE INDEX idx_usuario_roles        ON public.usuario (academia_id, rol);
CREATE INDEX idx_usuario_email        ON public.usuario (email_snapshot);

CREATE UNIQUE INDEX uq_owner_activo ON public.usuario (academia_id)
WHERE (rol = 'owner' AND estado = 'activo');

ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY usuario_select_policy ON public.usuario
FOR SELECT TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id));

CREATE POLICY usuario_insert_policy ON public.usuario
FOR INSERT TO authenticated
WITH CHECK (sipra_auth.is_admin_of_tenant(academia_id));

CREATE POLICY usuario_update_policy ON public.usuario
FOR UPDATE TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id))
WITH CHECK (sipra_auth.is_admin_of_tenant(academia_id));

-- ==============================================================================
-- 4. Actualizar helper can_write_to_academia ahora que las tablas existen
-- ==============================================================================
CREATE OR REPLACE FUNCTION sipra_auth.can_write_to_academia(tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = sipra_auth, public AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  -- Tenant mismatch
  IF tenant_id != sipra_auth.get_my_tenant_id() THEN
    RETURN false;
  END IF;

  -- Usuario suspendido/inactivo
  IF NOT EXISTS (
    SELECT 1 FROM public.usuario u
    WHERE u.id = current_user_id
    AND u.academia_id = tenant_id
    AND u.estado = 'activo'
  ) THEN
    RETURN false;
  END IF;

  -- Academia suspendida
  IF NOT EXISTS (
    SELECT 1 FROM public.academia a
    WHERE a.id = tenant_id
    AND a.estado_tenant = 'activa'
  ) THEN
    RETURN false;
  END IF;

  -- Suscripción inválida
  IF NOT EXISTS (
    SELECT 1 FROM public.suscripcion_academia s
    WHERE s.academia_id = tenant_id
    AND s.is_current = true
    AND s.estado IN ('trial', 'activa', 'gracia')
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;
