**1. Objetivo de la Entidad**

La entidad academia representa el tenant principal del sistema SIPRA.

Es:

- el límite lógico de los datos,

- el límite operativo,

- el límite financiero,

- y el límite de seguridad multi-tenant.

Toda entidad operativa del sistema debe pertenecer explícitamente a una
academia mediante academia_id.

**2. Filosofía Arquitectónica**

SIPRA utiliza arquitectura:

Single Database\
+\
Shared Schema\
+\
Tenant Isolation via academia_id + RLS

La tabla academia es el contenedor raíz de:

- usuarios,

- personas,

- grupos,

- cargos,

- movimientos,

- eventos,

- automatizaciones,

- y configuración operativa.

**3. Nombre Físico de Tabla**

academia

**4. Responsabilidades**

La entidad academia es responsable de:

- delimitar aislamiento multi-tenant,

- almacenar configuración operativa global,

- almacenar reglas de automatización,

- definir comportamiento de cobranza,

- almacenar configuración de mensajes,

- definir zona horaria operativa,

- controlar suspensión/cancelación del tenant.

**5. Estructura de Campos**

  ------------------------------------------------------------------------------------
  **Campo**            **Tipo**       **Restricciones / Reglas** **Propósito**
  -------------------- -------------- -------------------------- ---------------------
  id                   uuid           PK, NOT NULL, DEFAULT      Identificador único
                                      gen_random_uuid()          del tenant

  nombre               varchar(150)   NOT NULL                   Nombre comercial

  slug                 varchar(80)    UNIQUE, lowercase          Identificador
                                                                 URL-safe future-proof

  nombre_responsable   varchar(100)   NULLABLE                   Firma humana para
                                                                 mensajes

  telefono_contacto    varchar(20)    NULLABLE                   Teléfono
                                                                 administrativo

  whatsapp_contacto    varchar(20)    NULLABLE                   Número operativo de
                                                                 cobranza

  timezone             varchar(80)    NOT NULL DEFAULT           Zona horaria
                                      \'America/Mazatlan\'       operativa

  moneda               varchar(10)    NOT NULL DEFAULT \'MXN\'   Moneda operativa

  config_cobro         jsonb          NOT NULL DEFAULT \'{}\'    Configuración
                                                                 financiera

  config_mensajes      jsonb          NOT NULL DEFAULT \'{}\'    Templates y
                                                                 automatización

  estado               varchar(20)    NOT NULL DEFAULT           Estado del tenant
                                      \'activa\'                 

  created_at           timestamptz    NOT NULL DEFAULT now()     Auditoría

  updated_at           timestamptz    NOT NULL DEFAULT now()     Auditoría
  ------------------------------------------------------------------------------------

**6. Estructura JSONB Recomendada**

**config_cobro**

**Objetivo**

Centralizar reglas financieras y operativas sin requerir migraciones
frecuentes.

**Estructura sugerida V1**

{\
\"ventana_cobro\": {\
\"dia_inicio\": 1,\
\"dia_fin\": 10\
},\
\"pausar_por_promesa\": true,\
\"dias_repeticion_recordatorio\": 3,\
\"modo_automatizacion\": \"asistido\"\
}

**config_mensajes**

**Objetivo**

Almacenar templates y comportamiento comunicacional.

**Estructura sugerida V1**

{\
\"template_recordatorio\": \"Hola {nombre}, te recordamos\...\",\
\"firma\": \"Profe Juan\"\
}

**7. Índices Recomendados**

PRIMARY KEY (id)

UNIQUE INDEX idx_academia_slug_unique\
ON academia (lower(slug))

INDEX idx_academia_estado\
ON academia (estado)

**8. Restricciones a Nivel de Base de Datos (CHECK Constraints)**

**Estado válido**

CHECK (\
estado IN (\
\'activa\',\
\'suspendida\',\
\'cancelada\'\
)\
)

**Nombre obligatorio no vacío**

CHECK (\
char_length(trim(nombre)) \> 0\
)

**Slug válido**

CHECK (\
slug \~ \'\^\[a-z0-9-\]+\$\'\
)

**Moneda válida V1**

CHECK (\
moneda IN (\'MXN\')\
)

**9. Máquina de Estados**

**Campo**

estado

**Estados posibles**

  -------------------------------
  **Estado**   **Descripción**
  ------------ ------------------
  activa       Operación normal

  suspendida   Tenant en modo
               sólo lectura

  cancelada    Baja lógica del
               servicio
  -------------------------------

**10. Transition Rules**

  -----------------------------------------
  **Estado     **Nuevo      **Permitido**
  Actual**     Estado**     
  ------------ ------------ ---------------
  activa       suspendida   Sí

  suspendida   activa       Sí

  activa       cancelada    Sí

  suspendida   cancelada    Sí

  cancelada    activa       No V1

  cancelada    suspendida   No V1
  -----------------------------------------

**11. Reglas Operativas por Estado**

**activa**

**Permite:**

- login,

- creación de cargos,

- movimientos,

- automatizaciones,

- envíos,

- edición operativa.

**suspendida**

**Comportamiento:**

Modo readonly.

**Bloquea:**

- INSERT operativos,

- UPDATE operativos,

- creación de cargos,

- movimientos,

- generación de envíos,

- cron jobs operativos.

**Permite:**

- login,

- lectura de información,

- exportación.

**cancelada**

**Comportamiento:**

Soft delete lógico.

**Bloquea:**

- login,

- automatización,

- acceso operativo.

**Importante:**

NO elimina datos físicamente.

**12. Reglas Multi-tenant**

**Regla absoluta**

Toda entidad operativa debe contener:

academia_id uuid NOT NULL

**Tablas obligatorias**

- usuario

- persona

- grupo

- cargo

- movimiento

- aplicacion_movimiento

- evento_timeline

- envio_sugerido

**Regla importante**

NO depender de joins implícitos tipo:

cargo -\> persona -\> academia

para seguridad.

Cada tabla debe conocer explícitamente su tenant.

**13. Seguridad / RLS**

**RLS obligatorio**

ALTER TABLE academia ENABLE ROW LEVEL SECURITY;

**Filosofía**

La base de datos es el guardián final de aislamiento multi-tenant.

**Fuente de verdad tenant**

**Tabla usuario**

NO JWT únicamente.

**Regla conceptual RLS**

Un usuario sólo puede acceder a su academia.

**Política conceptual SELECT**

USING (\
EXISTS (\
SELECT 1\
FROM usuario u\
WHERE u.auth_user_id = auth.uid()\
AND u.academia_id = academia.id\
AND u.estado = \'activo\'\
)\
)

**Política UPDATE**

Solo:

- Owner,

- Admin.

**Política DELETE**

USING (false)

DELETE prohibido vía API pública.

**14. JWT / Auth**

**JWT NO es fuente de verdad**

El JWT puede contener:

- academia_id,

- rol,

- metadata útil.

Pero:

- sólo como caché/contexto frontend.

**Fuente oficial:**

tabla usuario.

**15. Timezone (Decisión Arquitectónica Crítica)**

**Campo físico obligatorio**

timezone

NO debe vivir en JSONB.

**Razón**

Los cron jobs operativos dependen de esto.

Ejemplo:

(now() AT TIME ZONE academia.timezone)::date

**Uso**

- vencimientos,

- automatización,

- promesas,

- recordatorios,

- eventos.

**16. Trigger de Auditoría**

**Recomendado**

Actualizar automáticamente:

updated_at

**Trigger conceptual**

NEW.updated_at = now()

**17. Reglas de Backend / RPC**

**Configuración**

La validación profunda de:

- config_cobro

- config_mensajes

debe ocurrir:

- en RPC,

- schema validation,

- o backend layer.

NO únicamente en SQL.

**Cambios sensibles**

Sólo Owner/Admin puede modificar:

- estado,

- configuración,

- timezone,

- moneda,

- slug.

**slug**

**Reglas:**

- único,

- lowercase,

- estable.

**Recomendación:**

No editable libremente.

**18. Soft Delete**

**Regla oficial V1**

NO DELETE físico.

**Estrategia**

Soft delete mediante:

estado = \'cancelada\'

**19. Relación con Otras Entidades**

  --------------------------------------
  **Tabla**               **Relación**
  ----------------------- --------------
  usuario                 1:N

  persona                 1:N

  grupo                   1:N

  cargo                   1:N

  movimiento              1:N

  aplicacion_movimiento   1:N

  evento_timeline         1:N

  envio_sugerido          1:N
  --------------------------------------

**20. Reglas Arquitectónicas Congeladas**

✅ PostgreSQL-first architecture\
✅ Supabase Auth\
✅ RLS obligatorio\
✅ academia_id en TODA entidad operativa\
✅ Single DB + Shared Schema\
✅ JSONB para configuración flexible\
✅ Soft delete obligatorio\
✅ No DELETE público\
✅ Tabla usuario = fuente de verdad de tenant/roles\
✅ Timezone como columna física\
✅ slug único y estable\
✅ Deep linking WhatsApp V1\
✅ RPC para lógica crítica/transaccional
