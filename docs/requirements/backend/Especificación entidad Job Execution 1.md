**ESPECIFICACIÓN COMPLETA Y ACTUALIZADA --- ENTIDAD: job_execution**

**1. Filosofía de la Entidad**

La entidad job_execution representa:

**la bitácora técnica y operacional de automatizaciones internas de
SIPRA.**

**Su propósito**

Permite:

✅ observabilidad operacional\
✅ monitoreo de automatizaciones\
✅ debugging productivo\
✅ soporte técnico\
✅ auditoría técnica\
✅ correlación de procesos\
✅ health monitoring\
✅ trazabilidad backend

**NO representa**

❌ eventos de negocio\
❌ timeline usuario\
❌ auditoría financiera visible\
❌ actividad del alumno\
❌ logs completos de infraestructura

**Regla Arquitectónica Congelada**

job_execution:

**es infraestructura interna de SIPRA.**

NO forma parte del producto visible al cliente.

**Separación oficial de dominios**

  ---------------------------------------
  **Sistema**       **Responsabilidad**
  ----------------- ---------------------
  evento_timeline   narrativa negocio

  job_execution     observabilidad
                    backend

  logs externos     debugging profundo
  ---------------------------------------

**2. Nombre Físico de Tabla**

job_execution

**3. Filosofía Operativa**

Cada automatización crítica:

**debe dejar evidencia estructurada.**

**Ejemplos**

✅ cron nocturno\
✅ reconciliación financiera\
✅ generación de sugerencias\
✅ procesamiento billing\
✅ webhooks Stripe\
✅ workers async\
✅ invalidaciones automáticas

**4. Estructura de Campos (Esquema Físico)**

  -----------------------------------------------------------------------------
  **Campo**          **Tipo**       **Reglas y            **Propósito**
                                    Restricciones**       
  ------------------ -------------- --------------------- ---------------------
  id                 UUID           PK, DEFAULT           Identificador físico
                                    gen_random_uuid()     

  execution_id       UUID           NOT NULL, INDEX       Correlación
                                                          distribuida

  academia_id        UUID           FK NULLABLE, INDEX    Tenant afectado

  job_name           VARCHAR(100)   NOT NULL, INDEX       Nombre técnico del
                                                          proceso

  job_type           VARCHAR(30)    NOT NULL              cron, webhook, rpc,
                                                          worker

  status             VARCHAR(20)    NOT NULL              running, success,
                                                          warning, failed

  trigger_type       VARCHAR(20)    NOT NULL              cron, webhook,
                                                          manual, retry

  started_at         TIMESTAMPTZ    NOT NULL DEFAULT      Inicio real
                                    now()                 

  finished_at        TIMESTAMPTZ    NULLABLE              Fin real

  duration_ms        INTEGER        NULLABLE              Duración medida por
                                                          backend

  retry_count        SMALLINT       NOT NULL DEFAULT 0    Número de reintentos

  affected_records   INTEGER        NULLABLE              Métrica resumida
                                                          opcional

  result_summary     JSONB          NOT NULL DEFAULT      Snapshot negocio
                                    \'{}\'                resumido

  error_payload      JSONB          NOT NULL DEFAULT      Snapshot técnico
                                    \'{}\'                resumido

  metadata           JSONB          NOT NULL DEFAULT      Contexto adicional
                                    \'{}\'                

  created_at         TIMESTAMPTZ    NOT NULL DEFAULT      Auditoría
                                    now()                 
  -----------------------------------------------------------------------------

**5. Filosofía de execution_id**

execution_id:

**NO reemplaza el PK.**

**Existe para**

✅ tracing distribuido\
✅ correlación multi-servicio\
✅ debugging\
✅ rastreo cross-system\
✅ relación con logs externos

**Ejemplo**

Un cron:

cron_generar_sugerencias

puede:

- llamar RPC,

- invalidar envíos,

- tocar ledger,

- generar timelines,

- disparar webhooks.

Todos comparten:

execution_id

**6. Tipos Oficiales (job_type)**

  --------------------------
  **Tipo**   **Uso**
  ---------- ---------------
  cron       tareas
             programadas

  webhook    eventos
             externos

  rpc        procesos
             backend

  worker     procesamiento
             async
  --------------------------

**Restricción**

CHECK (\
job_type IN (\
\'cron\',\
\'webhook\',\
\'rpc\',\
\'worker\'\
)\
)

**7. Estados Oficiales (status)**

  ------------------------------
  **Estado**   **Significado**
  ------------ -----------------
  running      ejecución activa

  success      terminó
               correctamente

  warning      terminó con
               anomalías

  failed       fallo técnico
  ------------------------------

**Restricción**

CHECK (\
status IN (\
\'running\',\
\'success\',\
\'warning\',\
\'failed\'\
)\
)

**8. Tipos de Trigger (trigger_type)**

  ----------------------------
  **Tipo**   **Significado**
  ---------- -----------------
  cron       programado

  webhook    externo

  manual     disparado
             manualmente

  retry      reintento
             automático
  ----------------------------

**Restricción**

CHECK (\
trigger_type IN (\
\'cron\',\
\'webhook\',\
\'manual\',\
\'retry\'\
)\
)

**9. Restricciones Matemáticas**

**duration_ms válido**

CHECK (\
duration_ms IS NULL\
OR duration_ms \>= 0\
)

**retry_count válido**

CHECK (\
retry_count \>= 0\
)

**affected_records válido**

CHECK (\
affected_records IS NULL\
OR affected_records \>= 0\
)

**10. Filosofía de academia_id**

academia_id:

**es NULLABLE intencionalmente.**

**Porque existen jobs:**

  ---------------------------
  **Tipo**   **Ejemplo**
  ---------- ----------------
  Global     billing masivo

  Global     cleanup logs

  Global     reconciliación
             global

  Tenant     generar
             sugerencias

  Tenant     invalidar envíos

  Tenant     cierre nocturno
  ---------------------------

**11. Filosofía de result_summary**

result_summary:

**NO es log técnico.**

Es:

**resumen estructurado de negocio.**

**Ejemplo**

{\
\"personas_analizadas\": 120,\
\"sugerencias_creadas\": 35,\
\"omitidos_sin_telefono\": 4\
}

**Beneficio**

Permite:

- dashboards,

- métricas,

- KPIs,

- monitoreo rápido.

**12. Filosofía de error_payload**

error_payload:

**NO debe almacenar logs gigantes.**

**Contenido correcto**

✅ código error\
✅ paso fallido\
✅ mensaje resumido\
✅ retry_attempt\
✅ contexto serializable

**Ejemplo correcto**

{\
\"step\": \"rpc_registrar_pago\",\
\"code\": \"57014\",\
\"message\": \"statement timeout\",\
\"retry_attempt\": 2\
}

**NO permitido**

❌ dumps completos\
❌ stack traces gigantes\
❌ payloads enormes\
❌ secretos/API keys

**Stack traces completos deben vivir en:**

✅ Sentry\
✅ Datadog\
✅ Logtail\
✅ Cloudflare Logs\
✅ Vercel Logs

**13. Filosofía de affected_records**

Campo:

**opcional y resumido.**

**Existe para**

✅ dashboards rápidos\
✅ throughput\
✅ analytics simples\
✅ monitoreo ligero

**El detalle completo:**

vive en:

result_summary

**14. Taxonomía Oficial de job_name**

Regla congelada:

**nomenclatura consistente obligatoria.**

**Prefijos oficiales**

  ----------------------------------
  **Prefijo**     **Uso**
  --------------- ------------------
  cron\_          automatización
                  programada

  worker\_        procesamiento
                  async

  billing\_       billing SaaS

  rpc\_           procesos backend

  maintenance\_   mantenimiento
  ----------------------------------

**Ejemplos válidos**

cron_generar_sugerencias

worker_reconciliar_ledger

billing_renovar_tenants

**15. Índices Recomendados**

**Historial jobs**

CREATE INDEX idx_job_history\
ON job_execution (\
job_name,\
started_at DESC\
);

**Fallos**

CREATE INDEX idx_job_failures\
ON job_execution (\
status,\
started_at DESC\
)\
WHERE status = \'failed\';

**Tenant jobs**

CREATE INDEX idx_job_tenant\
ON job_execution (\
academia_id,\
started_at DESC\
);

**Correlación**

CREATE INDEX idx_job_execution_id\
ON job_execution (\
execution_id\
);

**16. Seguridad y RLS (CRÍTICO)**

**Activación**

ALTER TABLE job_execution\
ENABLE ROW LEVEL SECURITY;

**Política global**

CREATE POLICY no_tenant_access\
ON job_execution\
USING (false);

**Regla congelada**

La tabla:

**es invisible para tenants.**

**Acceso permitido SOLO para**

  --------------------------
  **Actor**     **Acceso**
  ------------- ------------
  Service Role  Sí

  Backend SIPRA Sí

  Consola       Sí
  SuperAdmin    

  Tenant        NO
  --------------------------

**17. Integración con Automatización**

Todo proceso crítico debe:

1.  crear fila running

2.  ejecutar lógica

3.  actualizar:

    - status

    - duration

    - payloads

4.  registrar errores si existen

**Regla congelada**

Ningún cron crítico:

**debe ejecutarse sin logging.**

**18. duration_ms (MUY IMPORTANTE)**

duration_ms:

**NO se calcula en SQL.**

**Regla oficial**

El backend:

- mide tiempo,

- calcula duración,

- persiste entero final.

**Razón**

Evitar:

- problemas INTERVAL,

- casts SQL,

- triggers complejos.

**19. Retención y Garbage Collection**

Esta tabla:

**crecerá agresivamente.**

**Política oficial sugerida**

  ----------------------------
  **Tipo**   **Retención**
  ---------- -----------------
  success    30 días

  warning    90 días

  failed     180-365 días

  billing    recomendado
             permanente
  ----------------------------

**Debe existir**

cron/worker de limpieza.

**20. Reglas Arquitectónicas Congeladas**

**Regla 1**

job_execution

**NO es producto.**

**Regla 2**

Observabilidad:

**completamente privada.**

**Regla 3**

NO reemplaza:

- logs app,

- tracing,

- APM.

**Regla 4**

error_payload:

**resumido y serializable.**

**Regla 5**

execution_id:

**obligatorio para correlación.**

**Regla 6**

duration_ms:

**calculado por backend.**

**Regla 7**

job_name:

**taxonomía consistente obligatoria.**

**Regla 8**

Todo cron crítico:

**debe dejar evidencia.**
