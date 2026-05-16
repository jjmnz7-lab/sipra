**Sistema de Seguridad y Helpers RLS**

**1. Filosofía de \"Defensa en Profundidad\"**

El acceso a SIPRA se rige por tres capas de validación que deben
cumplirse en cascada:

1.  **Capa de Red (TO authenticated):** Solo usuarios con sesión activa
    entran al motor.

2.  **Capa de Inquilino (security.is_auth_user_for_tenant):**
    Aislamiento total de datos (Tenant Isolation) vía JWT.

3.  **Capa de Negocio (security.can_write_to_academia):** Validación en
    tiempo real de estados de pago y estatus del staff para operaciones
    de escritura.

**2. Nivel 1: Funciones de Identidad (Esquema security)**

Estas funciones son STABLE y SECURITY INVOKER. Extraen la verdad del
JWT.

SQL

\-- Obtiene el Tenant ID del JWT

CREATE OR REPLACE FUNCTION security.get_my_tenant_id()

RETURNS UUID

LANGUAGE sql STABLE SECURITY INVOKER AS \$\$

SELECT (auth.jwt() -\> \'app_metadata\' -\>\> \'academia_id\')::uuid;

\$\$;

\-- Obtiene el Rol del JWT

CREATE OR REPLACE FUNCTION security.get_my_role()

RETURNS text

LANGUAGE sql STABLE SECURITY INVOKER AS \$\$

SELECT auth.jwt() -\> \'app_metadata\' -\>\> \'rol\';

\$\$;

**3. Nivel 2: El \"Muro de Fuego\" de Escritura (State-full)**

Valida la consistencia humana y comercial en tiempo real para mitigar el
riesgo de *Stale JWTs*.

SQL

CREATE OR REPLACE FUNCTION
security.can_write_to_academia(target_tenant_id uuid)

RETURNS BOOLEAN

LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public,
security AS \$\$

DECLARE

v_user_status VARCHAR;

v_sub_status VARCHAR;

v_grace_ends_at TIMESTAMPTZ;

BEGIN

\-- 1. Aislamiento básico

IF target_tenant_id != security.get_my_tenant_id() THEN RETURN FALSE;
END IF;

\-- 2. Validación de Usuario en tiempo real (DB lookup)

SELECT estado INTO v_user_status FROM usuario

WHERE id = auth.uid() AND academia_id = target_tenant_id;

IF v_user_status != \'activo\' THEN RETURN FALSE; END IF;

\-- 3. Validación de Suscripción

SELECT estado, grace_ends_at INTO v_sub_status, v_grace_ends_at

FROM suscripcion_academia WHERE academia_id = target_tenant_id AND
is_current = TRUE;

IF v_sub_status IN (\'cancelada\', \'suspendida\') THEN RETURN FALSE;
END IF;

IF v_sub_status = \'past_due\' AND now() \> v_grace_ends_at THEN RETURN
FALSE; END IF;

RETURN TRUE;

END;

\$\$;

**4. Patrón de Diseño para Políticas RLS (Congelado)**

Este es el estándar que deben seguir todas las tablas en SIPRA para ser
consideradas \"Production-Ready\".

**Ejemplo: Tabla cargo**

SQL

ALTER TABLE cargo ENABLE ROW LEVEL SECURITY;

\-- LECTURA: Aislamiento tenant rápido

CREATE POLICY \"tenant_isolation_select\" ON cargo

FOR SELECT

TO authenticated

USING ( academia_id = security.get_my_tenant_id() );

\-- ESCRITURA: Validación completa de negocio

CREATE POLICY \"business_rules_insert_update\" ON cargo

FOR ALL \-- Aplica a INSERT y UPDATE

TO authenticated

USING ( security.is_admin_or_owner() ) \-- Solo admin/owner

WITH CHECK ( security.can_write_to_academia(academia_id) );

\-- BORRADO: Prohibido físicamente

CREATE POLICY \"no_physical_delete\" ON cargo

FOR DELETE

TO authenticated

USING ( false );

**5. Reglas Arquitectónicas de Seguridad (V1)**

1.  **Rol anon Deshabilitado:** Ninguna tabla de SIPRA (excepto quizás
    tablas de marketing público en el futuro) debe tener políticas para
    el rol anon.

2.  **Uso de TO authenticated:** Obligatorio en todas las políticas para
    prevenir fugas de datos accidentales por errores de lógica en el
    USING.

3.  **Inmutabilidad de Tenant:** Una vez creado un registro, el
    academia_id no puede cambiarse mediante UPDATE. Esto se protege con
    el WITH CHECK de las políticas.

4.  **JWT as Truth for Reading:** Para lecturas masivas (SELECT),
    confiamos en el academia_id del JWT. Es el balance perfecto entre
    seguridad y performance.

5.  **DB as Truth for Writing:** Para cualquier cambio que afecte dinero
    o personas, la base de datos verifica el estado actual del usuario y
    la suscripción en tiempo real.
