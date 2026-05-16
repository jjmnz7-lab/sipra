**ESPECIFICACIÓN COMPLETA Y ACTUALIZADA --- CRON / WORKERS ARCHITECTURE
(SIPRA)**

**1. Filosofía General**

En SIPRA, los Workers y Cron Jobs NO son scripts auxiliares.

Son:

**infraestructura operativa oficial del sistema.**

Responsables de:

✅ automatización\
✅ orquestación\
✅ side-effects async\
✅ integración externa\
✅ mantenimiento\
✅ reconciliación\
✅ scheduling\
✅ observabilidad

**Principio Central**

Workers coordinan.\
RPCs mutan estado.\
DB conserva la verdad.

**Separación Oficial**

  -------------------------------------
  **Capa**        **Responsabilidad**
  --------------- ---------------------
  Cron Scheduler  disparar ejecución

  Worker / Edge   orchestration
  Function        

  RPC             atomicidad

  PostgreSQL      consistencia

  job_execution   observabilidad
  -------------------------------------

**2. Filosofía Oficial**

**Workers:**

**NO contienen lógica financiera crítica.**

**La lógica oficial vive en:**

✅ RPCs\
✅ constraints\
✅ funciones SQL\
✅ RLS\
✅ ledger rules

**Workers únicamente:**

✅ detectan trabajo\
✅ orquestan procesos\
✅ llaman RPCs\
✅ integran APIs externas\
✅ manejan retries\
✅ procesan batches\
✅ generan side-effects

**Regla Congelada**

TS coordina.\
SQL decide.

**3. Arquitectura Oficial**

**Flujo Oficial**

Cron Scheduler\
→ Worker / Edge Function\
→ Advisory Lock\
→ job_execution\
→ RPC transaccional\
→ Side-effects async\
→ Complete

**Si algo falla**

retry / DLQ / alerta

**4. Tipos Oficiales de Workers**

**A. Workers Financieros**

Responsables de:

✅ generar mensualidades\
✅ recalcular vencimientos\
✅ invalidar sugerencias\
✅ conciliaciones\
✅ cierres nocturnos

**B. Workers Comunicación**

Responsables de:

✅ envio_sugerido\
✅ WhatsApp\
✅ emails\
✅ retries comunicación\
✅ consolidación mensajes

**C. Workers Sistema**

Responsables de:

✅ garbage collection\
✅ purga logs\
✅ archivado\
✅ health checks\
✅ mantenimiento

**D. Workers Integración**

Responsables de:

✅ Stripe\
✅ MercadoPago\
✅ webhooks\
✅ sincronización externa

**5. Filosofía Oficial Cron**

**Regla Oficial**

Los Cron Jobs:

**NO ejecutan lógica compleja directamente.**

**Cron:**

únicamente:

**despierta Workers.**

**Ejemplo**

02:00 UTC\
→ Worker Nightly\
→ RPCs

**Beneficios**

✅ separación limpia\
✅ retries independientes\
✅ escalabilidad\
✅ observabilidad

**6. Micro-Workers Especializados**

**Regla Oficial**

NO usar:

mega cron monolítico

**Correcto**

Workers especializados:

  ---------------------------------------------------
  **Worker**                    **Responsabilidad**
  ----------------------------- ---------------------
  nightly_generate_charges      cargos

  nightly_cleanup_suggestions   sugerencias

  nightly_subscription_review   suscripciones

  nightly_gc_jobs               limpieza

  nightly_healthcheck           monitoreo
  ---------------------------------------------------

**Beneficios**

✅ aislamiento fallos\
✅ retries independientes\
✅ menor blast radius\
✅ debugging simple

**7. Estrategia Oficial Timezone**

**Problema**

SIPRA:

**multi-tenant global.**

**Regla Oficial**

Toda automatización:

**respeta timezone tenant.**

**PERO:**

NUNCA usando:

WHERE now() AT TIME ZONE \...

sobre tablas masivas.

**Porque:**

rompe índices.

**Solución Oficial**

Persistir:

next_run_utc

**Filosofía**

NO preguntar:

\"¿A quién le toca?\"

**Mejor**

Guardar:

\"cuándo le toca exactamente\"

**Query oficial**

WHERE next_run_utc \<= now()

**Beneficios**

✅ B-Tree indexes\
✅ scans rápidos\
✅ workers baratos\
✅ escalabilidad real

**8. next_run_utc Oficial**

**Regla Congelada**

next_run_utc

es:

**estado operacional persistente.**

**NO:**

campo temporal calculado.

**Beneficios**

✅ retries\
✅ pausas\
✅ staggering\
✅ throttling\
✅ failover\
✅ replay

**9. Cron Staggering**

**Problema**

Todos los tenants:

00:00 UTC

→ pico masivo.

**Solución Oficial**

staggered execution

**Estrategias válidas**

✅ timezone\
✅ hash academia_id\
✅ ventanas distribuidas

**Resultado**

✅ menos contention\
✅ menos spikes\
✅ menos locks\
✅ menor costo

**10. Scheduling Drift Prevention**

**Regla Oficial**

NO usar:

next = now() + interval

**Porque:**

genera drift acumulativo.

**Correcto**

next = previous_scheduled + interval

**Beneficio**

Cron:

**mantiene horarios exactos.**

**11. Batching Oficial**

**Problema**

Workers:

**tienen timeout duro.**

**Solución Oficial**

Procesamiento:

**paginado por cursor.**

**Flujo Oficial**

**Paso 1**

Cron dispara:

procesar(cursor = null)

**Paso 2**

Worker procesa:

N tenants

**Paso 3**

Retorna:

{\
\"has_more\": true,\
\"next_cursor\": \"uuid\"\
}

**Paso 4**

Re-encolar siguiente batch.

**Beneficios**

✅ timeout-safe\
✅ resumable\
✅ scalable\
✅ retry-safe

**12. Cursor Persistence**

**Regla Oficial**

Los cursores:

**deben persistirse.**

**Entidad recomendada**

worker_checkpoint

**Campos sugeridos**

  ----------------------------
  **Campo**      **Uso**
  -------------- -------------
  worker_name    scope

  cursor         posición

  execution_id   correlación

  updated_at     heartbeat
  ----------------------------

**Beneficio**

Workers:

**pueden resumirse tras fallos.**

**13. Bounded Concurrency**

**Problema**

Promise.all(500)

→ DDOS interno DB.

**Regla Oficial**

Concurrency:

**limitada explícitamente.**

**Ejemplo recomendado**

5-20 tenants concurrentes

**Beneficios**

✅ estabilidad DB\
✅ menos locks\
✅ menos WAL pressure\
✅ menor memory spike

**14. Advisory Locks Oficiales**

**Regla Congelada**

Workers globales:

**deben usar advisory locks.**

**Implementación**

pg_advisory_xact_lock(\...)

**Casos obligatorios**

✅ mensualidades\
✅ cierres nocturnos\
✅ conciliaciones\
✅ imports\
✅ recalculaciones globales

**Beneficio**

Evita:

❌ doble cron\
❌ doble procesamiento\
❌ workers paralelos conflictivos

**15. lease ownership**

**Problema**

Múltiples workers:

**toman mismo batch.**

**Solución Oficial**

Persistir:

  ---------------------------
  **Campo**      **Uso**
  -------------- ------------
  claimed_by     ownership

  lease_until    expiración

  heartbeat_at   vida worker
  ---------------------------

**Beneficios**

✅ distributed safety\
✅ anti doble procesamiento\
✅ failover limpio

**16. Heartbeat Monitoring**

**Problema**

Worker zombie:

**desaparece sin terminar.**

**Solución Oficial**

Actualizar:

heartbeat_at

periódicamente.

**Si heartbeat expira**

→ job recuperable/retryable.

**17. Estrategia Oficial Retry**

**Regla Oficial**

Workers:

**inevitablemente fallan.**

**Retries**

✅ exponenciales\
✅ limitados\
✅ idempotentes

**Ejemplo**

  ------------------------
  **Retry**   **Espera**
  ----------- ------------
  1           15s

  2           30s

  3           2m

  4           10m
  ------------------------

**18. Error Classification**

**Regla Oficial**

Errores:

**clasificados.**

**Tipos oficiales**

  ------------------------
  **Tipo**     **Retry**
  ------------ -----------
  retryable    sí

  provider     sí

  timeout      sí

  validation   NO

  permanent    NO

  corruption   manual
  ------------------------

**Beneficio**

Evita:

**retries inútiles.**

**19. Dead Letter Queue (DLQ)**

**Problema**

Retries agotados.

**Solución Oficial**

Estado:

failed_permanently

**Acción**

✅ alerta Slack/Discord\
✅ revisión manual\
✅ marcar tenant afectado

**Beneficio**

Nada:

**"muere silenciosamente".**

**20. job_execution Oficial**

**Filosofía**

Todo worker relevante:

**deja rastro observable.**

**Se registra SOLO si:**

✅ hubo trabajo real\
✅ hubo error\
✅ hubo retry\
✅ hubo anomalía

**NO registrar**

❌ polling vacío\
❌ scans silenciosos

**Payload Oficial**

**result_summary**

{\
\"tenants_processed\": 50,\
\"charges_created\": 1200,\
\"failed\": 2\
}

**error_payload**

{\
\"step\": \"rpc_call\",\
\"message\": \"timeout\",\
\"tenant_id\": \"uuid\"\
}

**21. correlation_id Oficial**

**Regla Oficial**

Todo worker:

**correlation_id obligatorio.**

**Permite cruzar:**

✅ DB logs\
✅ provider logs\
✅ retries\
✅ worker logs\
✅ RPC tracing

**22. Estrategia Oficial Comunicación Async**

**Regla Congelada**

WhatsApp:

**SIEMPRE async.**

**Nunca:**

COMMIT esperando provider externo

**Flujo Oficial**

RPC:

genera intención

Worker:

procesa comunicación

**23. Delivery States Oficiales**

**Estados recomendados**

  ---------------------------------
  **Estado**      **Significado**
  --------------- -----------------
  pendiente       esperando envío

  enviado         provider aceptó

  entregado       confirmado

  retry_pending   retry programado

  fallido         error definitivo
  ---------------------------------

**Beneficio**

Separar:

\"200 OK\"

de:

\"entregado realmente\"

**24. Reconciliación Webhooks**

**Regla Oficial**

Webhook:

**NO es fuente de verdad.**

**Flujo correcto**

Webhook\
→ guardar evento\
→ worker conciliador\
→ consultar provider\
→ RPC actualizar estado

**Beneficio**

Evita:

❌ webhooks fuera orden\
❌ duplicados\
❌ payload corrupto

**25. Service Role Rules**

**Regla Oficial**

Workers usan:

service_role

**PERO:**

siempre:

✅ tenant explícito\
✅ filtros explícitos\
✅ aislamiento manual

**Porque:**

service_role

**bypass RLS completamente.**

**26. Graceful Degradation**

**Prioridades oficiales**

  -------------------------------
  **Worker**      **Prioridad**
  --------------- ---------------
  ledger          crítica

  suscripciones   alta

  WhatsApp        media

  analytics       baja
  -------------------------------

**Beneficio**

Fallo WhatsApp:

**NO rompe ledger.**

**27. Future Queue Architecture**

**Roadmap Oficial**

Futura entidad:

worker_queue

**Uso futuro**

✅ delayed jobs\
✅ retries\
✅ priorities\
✅ throttling\
✅ rate limiting\
✅ backpressure

**28. Reglas Arquitectónicas Congeladas**

**Regla 1**

Workers:

**NO contienen verdad financiera.**

**Regla 2**

Toda mutación:

**RPC transaccional.**

**Regla 3**

Cron:

**despierta workers.**

**Regla 4**

Toda automatización:

**timezone-aware.**

**Regla 5**

Usar:

next_run_utc

persistente.

**Regla 6**

Workers:

**paginados por cursor.**

**Regla 7**

Concurrency:

**limitada explícitamente.**

**Regla 8**

Workers globales:

**advisory locks.**

**Regla 9**

Retries:

**idempotentes.**

**Regla 10**

Errores:

**clasificados.**

**Regla 11**

Retries agotados:

**DLQ + alerta humana.**

**Regla 12**

job_execution:

**solo trabajo real.**

**Regla 13**

WhatsApp:

**async siempre.**

**Regla 14**

Webhook:

**nunca verdad oficial.**

**Regla 15**

service_role:

**requiere tenant explícito.**

**Regla 16**

Ledger:

**jamás depende de workers vivos.**

**Regla 17**

DB:

**source of truth.**
