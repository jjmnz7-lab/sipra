-- Migración: 001_auth_schema
-- Descripción: Creación del esquema de seguridad y helpers JWT/RLS

CREATE SCHEMA IF NOT EXISTS sipra_auth;

-- A. Identidad del usuario autenticado
CREATE OR REPLACE FUNCTION sipra_auth.get_my_user_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT auth.uid();
$$;

-- B. Tenant del usuario autenticado
CREATE OR REPLACE FUNCTION sipra_auth.get_my_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'academia_id')::uuid;
$$;

-- C. Rol del usuario autenticado
CREATE OR REPLACE FUNCTION sipra_auth.get_my_role()
RETURNS text
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'rol')::text;
$$;

-- D. Validar pertenencia al tenant (usado en SELECT)
CREATE OR REPLACE FUNCTION sipra_auth.is_auth_user_for_tenant(tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT tenant_id = sipra_auth.get_my_tenant_id();
$$;

-- E. Validar rol admin u owner
CREATE OR REPLACE FUNCTION sipra_auth.is_admin_of_tenant(tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT (
    sipra_auth.is_auth_user_for_tenant(tenant_id)
    AND sipra_auth.get_my_role() IN ('owner', 'admin')
  );
$$;

-- F. Validar rol owner exclusivo
CREATE OR REPLACE FUNCTION sipra_auth.is_owner_of_tenant(tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT (
    sipra_auth.is_auth_user_for_tenant(tenant_id)
    AND sipra_auth.get_my_role() = 'owner'
  );
$$;

-- G. Validar capacidad de escritura (INSERT/UPDATE)
-- (El cuerpo completo se actualizará después de crear las tablas academia y suscripcion_academia,
-- por ahora devolvemos true si el tenant coincide para evitar errores de referencias circulares 
-- en la creación, se parcheará en la siguiente migración).
CREATE OR REPLACE FUNCTION sipra_auth.can_write_to_academia(tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = sipra_auth, public AS $$
BEGIN
  RETURN tenant_id = sipra_auth.get_my_tenant_id();
END;
$$;

-- H. Informar si tenant está en modo read-only (uso en frontend para banners/UX)
CREATE OR REPLACE FUNCTION sipra_auth.is_academia_readonly(tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = sipra_auth, public AS $$
  SELECT NOT sipra_auth.can_write_to_academia(tenant_id);
$$;
