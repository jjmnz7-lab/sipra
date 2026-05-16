**1. Filosofía General**

Las Helper Functions RLS centralizan:

- aislamiento multi-tenant,

- RBAC,

- validaciones operativas,

- modo read-only,

- seguridad transversal SaaS.

**Reglas Congeladas**

  -------------------------------
  **Regla**       **Decisión**
  --------------- ---------------
  Lecturas        JWT

  Escrituras      Validación
                  realtime DB

  JWT helpers     SECURITY
                  INVOKER

  Write helpers   SECURITY
                  DEFINER

  DELETE físico   prohibido

  JOINs complejos prohibidos
  en RLS          
  -------------------------------

**2. Schema Oficial**

CREATE SCHEMA IF NOT EXISTS sipra_auth;

**3. JWT Claims Esperados**

{\
\"app_metadata\": {\
\"academia_id\": \"uuid\",\
\"rol\": \"owner\"\
}\
}

**4. Helper Functions Oficiales**

**A. get_my_user_id()**

**Propósito**

Extraer:

auth.uid()

**Código**

CREATE OR REPLACE FUNCTION sipra_auth.get_my_user_id()\
RETURNS uuid\
LANGUAGE sql\
STABLE\
SECURITY INVOKER\
AS \$\$\
SELECT auth.uid();\
\$\$;

**B. get_my_tenant_id()**

**Propósito**

Extraer academia_id desde JWT.

**Código**

CREATE OR REPLACE FUNCTION sipra_auth.get_my_tenant_id()\
RETURNS uuid\
LANGUAGE sql\
STABLE\
SECURITY INVOKER\
AS \$\$\
SELECT (\
auth.jwt() -\> \'app_metadata\' -\>\> \'academia_id\'\
)::uuid;\
\$\$;

**C. get_my_role()**

**Propósito**

Extraer rol desde JWT.

**Código**

CREATE OR REPLACE FUNCTION sipra_auth.get_my_role()\
RETURNS text\
LANGUAGE sql\
STABLE\
SECURITY INVOKER\
AS \$\$\
SELECT (\
auth.jwt() -\> \'app_metadata\' -\>\> \'rol\'\
)::text;\
\$\$;

**D. is_auth_user_for_tenant(tenant_id)**

**Propósito**

Validar aislamiento tenant.

**Código**

CREATE OR REPLACE FUNCTION sipra_auth.is_auth_user_for_tenant(\
tenant_id uuid\
)\
RETURNS boolean\
LANGUAGE sql\
STABLE\
SECURITY INVOKER\
AS \$\$\
SELECT (\
tenant_id = sipra_auth.get_my_tenant_id()\
);\
\$\$;

**E. is_admin_of_tenant(tenant_id)**

**Propósito**

Validar:

owner OR admin

**Código**

CREATE OR REPLACE FUNCTION sipra_auth.is_admin_of_tenant(\
tenant_id uuid\
)\
RETURNS boolean\
LANGUAGE sql\
STABLE\
SECURITY INVOKER\
AS \$\$\
SELECT (\
sipra_auth.is_auth_user_for_tenant(tenant_id)\
AND\
sipra_auth.get_my_role() IN (\
\'owner\',\
\'admin\'\
)\
);\
\$\$;

**F. is_owner_of_tenant(tenant_id)**

**Propósito**

Validar:

owner

**Código**

CREATE OR REPLACE FUNCTION sipra_auth.is_owner_of_tenant(\
tenant_id uuid\
)\
RETURNS boolean\
LANGUAGE sql\
STABLE\
SECURITY INVOKER\
AS \$\$\
SELECT (\
sipra_auth.is_auth_user_for_tenant(tenant_id)\
AND\
sipra_auth.get_my_role() = \'owner\'\
);\
\$\$;

**G. can_write_to_academia(tenant_id)**

**FUNCIÓN CRÍTICA**

**Propósito**

Validar en tiempo real:

✅ tenant\
✅ usuario activo\
✅ academia activa\
✅ suscripción válida

**Estados válidos**

**Usuario**

activo

**Academia**

activa

**Suscripción**

trial\
activa\
past_due

**Código**

CREATE OR REPLACE FUNCTION sipra_auth.can_write_to_academia(\
tenant_id uuid\
)\
RETURNS boolean\
LANGUAGE plpgsql\
STABLE\
SECURITY DEFINER\
SET search_path = sipra_auth, public\
AS \$\$\
DECLARE\
current_user_id uuid;\
BEGIN\
\
current_user_id := auth.uid();\
\
\-- Tenant mismatch\
IF tenant_id != sipra_auth.get_my_tenant_id() THEN\
RETURN false;\
END IF;\
\
\-- Usuario suspendido/inactivo\
IF NOT EXISTS (\
SELECT 1\
FROM usuario u\
WHERE u.id = current_user_id\
AND u.academia_id = tenant_id\
AND u.estado = \'activo\'\
) THEN\
RETURN false;\
END IF;\
\
\-- Academia suspendida\
IF NOT EXISTS (\
SELECT 1\
FROM academia a\
WHERE a.id = tenant_id\
AND a.estado_tenant = \'activa\'\
) THEN\
RETURN false;\
END IF;\
\
\-- Suscripción inválida\
IF NOT EXISTS (\
SELECT 1\
FROM suscripcion_academia s\
WHERE s.academia_id = tenant_id\
AND s.is_current = true\
AND s.estado IN (\
\'trial\',\
\'activa\',\
\'past_due\'\
)\
) THEN\
RETURN false;\
END IF;\
\
RETURN true;\
\
END;\
\$\$;

**H. is_academia_readonly(tenant_id)**

**Propósito**

Informar si tenant está en modo:

read-only

**Uso**

Frontend:

- banners,

- bloqueo UX,

- deshabilitar botones.

**Código**

CREATE OR REPLACE FUNCTION sipra_auth.is_academia_readonly(\
tenant_id uuid\
)\
RETURNS boolean\
LANGUAGE sql\
STABLE\
SECURITY DEFINER\
SET search_path = sipra_auth, public\
AS \$\$\
SELECT NOT sipra_auth.can_write_to_academia(\
tenant_id\
);\
\$\$;

**5. Ejemplo Oficial RLS**

**SELECT**

CREATE POLICY cargo_select_policy\
ON cargo\
FOR SELECT\
TO authenticated\
USING (\
sipra_auth.is_auth_user_for_tenant(\
academia_id\
)\
);

**INSERT**

CREATE POLICY cargo_insert_policy\
ON cargo\
FOR INSERT\
TO authenticated\
WITH CHECK (\
sipra_auth.is_admin_of_tenant(\
academia_id\
)\
AND\
sipra_auth.can_write_to_academia(\
academia_id\
)\
);

**UPDATE**

CREATE POLICY cargo_update_policy\
ON cargo\
FOR UPDATE\
TO authenticated\
USING (\
sipra_auth.is_auth_user_for_tenant(\
academia_id\
)\
)\
WITH CHECK (\
sipra_auth.can_write_to_academia(\
academia_id\
)\
);

**DELETE (Bloqueado)**

CREATE POLICY cargo_delete_policy\
ON cargo\
FOR DELETE\
TO authenticated\
USING (false);

**6. Reglas Arquitectónicas Finales**

**Regla 1**

JWT:

**rápido pero no vivo.**

**Regla 2**

SELECT:

**confía en JWT.**

**Regla 3**

INSERT/UPDATE:

**validación realtime DB.**

**Regla 4**

JWT helpers:

SECURITY INVOKER

**Regla 5**

DB validation helpers:

SECURITY DEFINER

**Regla 6**

Todo helper:

STABLE

**Regla 7**

Nada sensible en:

public

**Regla 8**

DELETE físico:

**prohibido por defecto.**
