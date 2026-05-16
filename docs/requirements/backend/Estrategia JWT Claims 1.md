**ESPECIFICACIÓN COMPLETA Y ACTUALIZADA --- ESTRATEGIA JWT CLAIMS
(SIPRA)**

**1. Filosofía General**

La estrategia JWT Claims de SIPRA está diseñada bajo un principio
central:

**JWT = caché rápida de identidad**

**Base de Datos = fuente viva de verdad**

El JWT permite:

- RLS ultrarrápido,

- aislamiento multi-tenant eficiente,

- RBAC ligero,

- UX inmediata en frontend.

Mientras que la Base de Datos mantiene:

- estados vivos,

- permisos críticos,

- control financiero,

- seguridad operacional.

**Objetivos Arquitectónicos**

✅ minimizar JOINs en RLS\
✅ aislar tenants por diseño\
✅ permitir RBAC rápido\
✅ evitar stale-security crítica\
✅ desacoplar frontend/backend\
✅ mantener PostgreSQL como autoridad real

**2. Principios Congelados**

  ------------------------------
  **Regla**       **Decisión**
  --------------- --------------
  JWT             caché
                  identidad

  DB              verdad viva

  SELECT          JWT

  INSERT/UPDATE   validación
                  realtime

  Frontend        UX

  PostgreSQL      seguridad real

  Claims          mínimos

  Claims críticos prohibidos
  vivos           
  ------------------------------

**3. Payload Oficial JWT**

**Ubicación**

Los claims viven exclusivamente en:

app_metadata

**Payload Oficial**

{\
\"app_metadata\": {\
\"academia_id\": \"uuid\",\
\"rol\": \"admin\",\
\"claims_version\": 1\
}\
}

**Claims Oficiales**

  -----------------------------------------
  **Claim**        **Tipo**   **Uso**
  ---------------- ---------- -------------
  academia_id      UUID       aislamiento
                              tenant

  rol              text       RBAC rápido

  claims_version   integer    versionado
                              claims
  -----------------------------------------

**Claims NO Permitidos**

**Prohibido incluir**

❌ estado_usuario\
❌ estado_suscripcion\
❌ billing_status\
❌ permisos granulares\
❌ flags financieras críticas\
❌ configuraciones dinámicas\
❌ arrays grandes

**Razón**

Evitar:

- stale JWT,

- headers gigantes,

- websocket inflation,

- inconsistencias,

- acoplamiento excesivo.

**4. Identidad Oficial del Usuario**

**Fuente oficial**

auth.uid()

**Claim JWT utilizado**

\"sub\": \"uuid\"

**Regla Congelada**

NO duplicar:

usuario_id

dentro de:

app_metadata

**Razón**

Supabase ya expone:

auth.uid()

de forma estándar y optimizada.

**5. Flujo Oficial de Generación Claims**

**Paso 1**

Usuario autenticado mediante:

Supabase Auth

**Paso 2**

Sistema obtiene:

auth.uid()

**Paso 3**

Backend consulta:

public.usuario

**Paso 4**

Backend construye:

{\
\"academia_id\": \"\...\",\
\"rol\": \"admin\",\
\"claims_version\": 1\
}

**Paso 5**

Backend actualiza:

auth.users.raw_app_meta_data

mediante:

supabase.auth.admin.updateUserById()

**Resultado**

Nuevo JWT generado automáticamente.

**6. Estrategia Oficial de Sincronización**

**Fuente de verdad**

public.usuario

**JWT**

es:

**derivado sincronizado.**

**Regla Arquitectónica**

Cambios en:

- rol,

- tenant,

- claims,

deben sincronizar:

auth.users

**Método Oficial**

**Recomendado**

Edge Function / Backend seguro

**Evitar en lo posible**

UPDATE auth.users

directo desde triggers SQL.

**Razón**

- menos coupling,

- más portable,

- más estable upgrades Supabase,

- menos dependencia internals auth.

**7. Refresh Strategy**

**Problema**

JWT:

**NO se actualiza automáticamente.**

**Entonces:**

Cambios críticos requieren:

supabase.auth.refreshSession()

**Flujo Oficial**

**Backend/RPC**

Retorna:

{\
\"needs_refresh\": true\
}

**Frontend**

Interceptor global:

if (response.needs_refresh) {\
await supabase.auth.refreshSession()\
}

**Beneficios**

✅ UX limpia\
✅ sin logout\
✅ claims inmediatos\
✅ menos fricción

**8. Eventos que Requieren Refresh**

  ---------------------------------
  **Evento**       **Refresh**
  ---------------- ----------------
  cambio rol       obligatorio

  cambio tenant    logout/relogin

  claims_version   obligatorio

  suspensión       recomendado
  usuario          

  downgrade plan   opcional

  cambio           NO
  nombre/avatar    
  ---------------------------------

**9. Estrategia Oficial RLS**

**SELECT**

Confía en JWT.

**Ejemplo**

USING (\
academia_id =\
sipra_auth.get_my_tenant_id()\
)

**Beneficio**

✅ cero JOINs\
✅ performance alta\
✅ RLS barato\
✅ escalabilidad real

**10. Estrategia Oficial WRITE**

**INSERT / UPDATE / DELETE**

NO confiar únicamente en JWT.

**Debe validar realtime:**

✅ usuario activo\
✅ tenant activo\
✅ suscripción válida\
✅ permisos operativos

**Ejemplo**

WITH CHECK (\
sipra_auth.can_write_to_academia(\
academia_id\
)\
)

**Razón**

Mitigar:

**stale JWT.**

**11. Roles Oficiales V1**

  ---------------------------
  **Rol**   **Capacidades**
  --------- -----------------
  owner     control total

  admin     operación
            avanzada

  staff     operación
            limitada
  ---------------------------

**Filosofía V1**

RBAC:

**compacto y simple.**

**NO usar**

permissions\[\]

en JWT.

**12. Multi-Tenant Isolation**

**Regla Congelada**

Toda tabla operativa contiene:

academia_id

**Toda lectura:**

usa:

JWT tenant isolation

**Resultado**

Incluso si frontend falla:

**PostgreSQL sigue aislando tenants.**

**13. Tenant Migration Policy**

**Regla Oficial V1**

Un usuario:

**pertenece a UNA academia.**

**Cambio de tenant**

NO soportado oficialmente.

**Procedimiento recomendado**

crear nuevo usuario

**Razón**

Evitar romper:

- auditoría,

- created_by,

- timeline,

- ownership,

- trazabilidad.

**14. Claims Versioning**

**Campo oficial**

\"claims_version\": 1

**Propósito**

Permitir:

- migraciones JWT,

- invalidaciones,

- compatibilidad futura.

**Beneficios**

✅ evolución segura\
✅ rollback controlado\
✅ frontend compatible\
✅ migraciones limpias

**15. Integración Frontend**

**Permitido**

Frontend puede usar claims para:

✅ ocultar menús\
✅ navegación\
✅ branding\
✅ UX rápida\
✅ feature hints

**Prohibido**

Frontend NO autoriza:

❌ seguridad\
❌ permisos reales\
❌ acceso datos\
❌ operaciones financieras

**Seguridad real vive en:**

PostgreSQL RLS

**16. Reglas Arquitectónicas Congeladas**

**Regla 1**

JWT:

**caché rápida, no verdad viva.**

**Regla 2**

DB:

**autoridad real.**

**Regla 3**

SELECT:

**JWT.**

**Regla 4**

WRITE:

**DB realtime.**

**Regla 5**

Claims:

**mínimos y estables.**

**Regla 6**

NO permisos granulares en JWT.

**Regla 7**

NO estados críticos en JWT.

**Regla 8**

auth.uid()

**identidad oficial.**

**Regla 9**

Cambios críticos:

refreshSession()

**Regla 10**

Toda tabla operativa:

academia_id

**Regla 11**

Frontend:

**UX, no seguridad.**

**Regla 12**

RLS:

**backend-first.**
