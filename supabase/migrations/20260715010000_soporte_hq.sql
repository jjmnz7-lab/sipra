-- Migración: 20260715010000_soporte_hq
-- Descripción: Ampliar estados de la academia, actualizar can_write_to_academia, agregar shadow_email y crear tablas de invitaciones y capacidades para soporte de HQ.

-- 1. Ampliar el modelo de estados de la academia
ALTER TABLE public.academia DROP CONSTRAINT chk_academia_estado;
ALTER TABLE public.academia ADD CONSTRAINT chk_academia_estado
  CHECK (estado_tenant IN (
    'invitada', 'onboarding_pendiente', 'prueba',
    'activa', 'suspendida', 'cancelada'
  ));

-- 2. Actualizar can_write_to_academia para permitir escritura en estado 'prueba'
CREATE OR REPLACE FUNCTION sipra_auth.can_write_to_academia(tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = sipra_auth, public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuario u
    JOIN public.academia a ON a.id = u.academia_id
    JOIN public.suscripcion_academia s ON s.academia_id = u.academia_id
    WHERE u.id             = auth.uid()
      AND u.academia_id    = tenant_id
      AND u.estado         = 'activo'
      AND a.estado_tenant  IN ('prueba', 'activa')
      AND s.is_current     = true
      AND s.estado         IN ('trial', 'activa', 'gracia')
  )
  AND tenant_id = sipra_auth.get_my_tenant_id();
$$;

-- 3. Nueva columna shadow_email en public.academia
ALTER TABLE public.academia ADD COLUMN shadow_email text UNIQUE;

-- 4. Nueva tabla invitacion_academia
CREATE TABLE public.invitacion_academia (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id   uuid NOT NULL REFERENCES public.academia(id),
  token         text NOT NULL UNIQUE,
  status        text NOT NULL DEFAULT 'pendiente',
  expires_at    timestamptz NOT NULL,
  opened_at     timestamptz,
  opened_ip     text,
  opened_device text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_invitacion_status CHECK (
    status IN ('pendiente', 'utilizada', 'expirada', 'cancelada')
  )
);

-- RLS para invitacion_academia (Acceso denegado por defecto para anon/authenticated)
ALTER TABLE public.invitacion_academia ENABLE ROW LEVEL SECURITY;

-- 5. Nueva tabla capacidad_academia
CREATE TABLE public.capacidad_academia (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id  uuid NOT NULL REFERENCES public.academia(id),
  capacidad    text NOT NULL,
  enabled      boolean NOT NULL DEFAULT false,
  origin       text NOT NULL DEFAULT 'manual',
  expires_at   timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_capacidad_nombre CHECK (capacidad IN (
    'agenda', 'exportacion_excel', 'portal_alumno',
    'automatizaciones', 'historial_compartido'
  )),
  CONSTRAINT chk_capacidad_origin CHECK (origin IN (
    'plan', 'beta', 'manual', 'promocion'
  )),
  UNIQUE (academia_id, capacidad)
);

-- RLS para capacidad_academia
ALTER TABLE public.capacidad_academia ENABLE ROW LEVEL SECURITY;

CREATE POLICY capacidad_academia_select_policy ON public.capacidad_academia
  FOR SELECT TO authenticated
  USING (sipra_auth.is_auth_user_for_tenant(academia_id));

-- 6. Nueva tabla plan_capacidad_default
CREATE TABLE public.plan_capacidad_default (
  plan_codigo text NOT NULL,
  capacidad   text NOT NULL,
  enabled     boolean NOT NULL DEFAULT false,
  PRIMARY KEY (plan_codigo, capacidad),
  CONSTRAINT chk_plan_codigo CHECK (
    plan_codigo IN ('trial', 'basico', 'pro', 'personalizado')
  ),
  CONSTRAINT chk_capacidad_nombre_default CHECK (capacidad IN (
    'agenda', 'exportacion_excel', 'portal_alumno',
    'automatizaciones', 'historial_compartido'
  ))
);

-- RLS para plan_capacidad_default
ALTER TABLE public.plan_capacidad_default ENABLE ROW LEVEL SECURITY;

CREATE POLICY plan_capacidad_default_select_policy ON public.plan_capacidad_default
  FOR SELECT TO authenticated
  USING (true);

-- Poblar valores por defecto para plan_capacidad_default
INSERT INTO public.plan_capacidad_default (plan_codigo, capacidad, enabled) VALUES
  ('trial', 'portal_alumno', true),
  ('trial', 'agenda', false),
  ('trial', 'exportacion_excel', false),
  ('trial', 'automatizaciones', false),
  ('trial', 'historial_compartido', false),

  ('basico', 'portal_alumno', true),
  ('basico', 'agenda', false),
  ('basico', 'exportacion_excel', false),
  ('basico', 'automatizaciones', false),
  ('basico', 'historial_compartido', false),

  ('pro', 'portal_alumno', true),
  ('pro', 'agenda', true),
  ('pro', 'exportacion_excel', true),
  ('pro', 'automatizaciones', true),
  ('pro', 'historial_compartido', true),

  ('personalizado', 'portal_alumno', true),
  ('personalizado', 'agenda', true),
  ('personalizado', 'exportacion_excel', true),
  ('personalizado', 'automatizaciones', true),
  ('personalizado', 'historial_compartido', true);

/*
-- DOWN MIGRATION (para referencia)
-- Para revertir esta migración, ejecuta el siguiente SQL:

DELETE FROM public.plan_capacidad_default;
DROP POLICY plan_capacidad_default_select_policy ON public.plan_capacidad_default;
ALTER TABLE public.plan_capacidad_default DISABLE ROW LEVEL SECURITY;
DROP TABLE public.plan_capacidad_default;

DROP POLICY capacidad_academia_select_policy ON public.capacidad_academia;
ALTER TABLE public.capacidad_academia DISABLE ROW LEVEL SECURITY;
DROP TABLE public.capacidad_academia;

ALTER TABLE public.invitacion_academia DISABLE ROW LEVEL SECURITY;
DROP TABLE public.invitacion_academia;

ALTER TABLE public.academia DROP COLUMN shadow_email;

CREATE OR REPLACE FUNCTION sipra_auth.can_write_to_academia(tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = sipra_auth, public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuario u
    JOIN public.academia a ON a.id = u.academia_id
    JOIN public.suscripcion_academia s ON s.academia_id = u.academia_id
    WHERE u.id             = auth.uid()
      AND u.academia_id    = tenant_id
      AND u.estado         = 'activo'
      AND a.estado_tenant  = 'activa'
      AND s.is_current     = true
      AND s.estado         IN ('trial', 'activa', 'gracia')
  )
  AND tenant_id = sipra_auth.get_my_tenant_id();
$$;

ALTER TABLE public.academia DROP CONSTRAINT chk_academia_estado;
ALTER TABLE public.academia ADD CONSTRAINT chk_academia_estado
  CHECK (estado_tenant IN ('activa', 'suspendida', 'archivada'));
*/
