**ESPECIFICACIÓN: Arquitectura de Cron / Workers (V1)**

**1. Filosofía de Automatización**

En SIPRA, la automatización se divide en tres capas desacopladas para
garantizar que un fallo en la red o un timeout no corrompa la verdad
financiera.

1.  **Scheduler (Gatillo):** Disparador temporal externo (GitHub
    Actions, Upstash, o Supabase pg_cron) que invoca un endpoint.

2.  **Worker (Orquestador):** Edge Functions (TypeScript) en el
    \"Borde\". Son **stateless**, manejan conectividad externa
    (WhatsApp/Stripe) y orquestan el flujo.

3.  **RPC (Músculo):** PostgreSQL. Es la única capa que muta el estado.
    **Jamás realiza peticiones HTTP.**

**2. El Catálogo de Micro-workers**

Abandonamos el cron monolítico. SIPRA utiliza una flota de trabajadores
especializados para reducir el \"blast radius\" (radio de impacto) ante
fallos.

  -------------------------------------------------------------------------------
  **Worker**            **Responsabilidad**                      **Frecuencia**
  --------------------- ---------------------------------------- ----------------
  **nightly_billing**   Generación de cargos recurrentes y       Diaria (Ventana
                        revisión de suscripciones.               UTC)

  **nightly_cleanup**   Invalidación de sugerencias y purga de   Diaria (Baja
                        logs antiguos.                           carga)

  **reminder_engine**   Envío de WhatsApps y gestión de          Cada 15-30 min
                        reintentos de entrega.                   

  **reconciler**        Conciliación de webhooks (Stripe/MP) vs  Por evento
                        API oficial.                             
  -------------------------------------------------------------------------------

**3. Agendamiento Determinista (Anti-Drift)**

Para evitar que los procesos se desplacen en el tiempo debido a la
latencia acumulada, el cálculo de la siguiente ejecución es **matemático
sobre el agendamiento previo**, no sobre el tiempo real de ejecución.

\$\$T\_{next} = T\_{scheduled} + Intervalo\$\$

**Regla de Oro:** Todas las fechas de \"próxima corrida\" se almacenan
en la columna next_run_utc de forma absoluta e indexada para permitir
búsquedas instantáneas \$O(1)\$.

**4. Resiliencia: Checkpointing y Heartbeats**

Diseñado para sobrevivir a los timeouts de las Edge Functions (10s -
60s).

**A. Worker Checkpoint**

Si un proceso masivo (ej. cobrar a 10,000 alumnos) es interrumpido, el
sistema guarda su progreso en la tabla worker_checkpoint.

- **Mecánica:** El worker procesa en **Chunks** (ej. 500 registros). Al
  terminar un chunk, actualiza el last_cursor_id. Si muere, el siguiente
  worker retoma desde ese ID.

**B. Zombie Prevention (Lease & Heartbeat)**

- **Lease:** Un worker \"arrienda\" una academia para procesar
  actualizando claimed_at.

- **Heartbeat:** Cada 5 segundos, el worker actualiza heartbeat_at.

- **Watchdog:** Si un heartbeat tiene más de 2 minutos de antigüedad, el
  sistema libera el lease para que otro worker lo reclame.

**5. Manejo de Errores y DLQ (Dead Letter Queue)**

Clasificamos los fallos para evitar el \"spam\" de reintentos en errores
permanentes.

  ------------------------------------------------------------------
  **Tipo de        **Estrategia**   **Acción**
  Error**                           
  ---------------- ---------------- --------------------------------
  **retryable**    Backoff          Reintentar (Red, Timeout, 503).
                   Exponencial      

  **validation**   **Abortar**      Log en failed_permanently +
                                    Alerta Soporte.

  **provider**     Circuit Breaker  Pausar envíos si WhatsApp/Stripe
                                    reportan caída.

  **system**       Alerta Crítica   Error de SQL o lógica interna.
  ------------------------------------------------------------------

**6. Concurrencia Acotada (Anti-DDoS Interno)**

Para no saturar el pool de conexiones de PostgreSQL, el orquestador
implementa **Bounded Concurrency**.

- **Límite:** Máximo 10-20 ejecuciones de tenants en paralelo.

- **Batching:** Si hay 500 academias listas, se procesan en ráfagas
  controladas, nunca todas al mismo tiempo.

**7. Reglas Arquitectónicas Congeladas (Workers)**

1.  **Service Role + Explicit Tenant Filter:** Los workers usan la llave
    maestra de Supabase, pero **obligatoriamente** deben incluir el
    academia_id en cada query para evitar fugas de datos.

2.  **No Logic in TypeScript:** La Edge Function no decide \"quién debe
    cuánto\". Solo le dice a la RPC: \"Procesa esta academia\".

3.  **Audit Trail Obligatorio:** Todo worker que mueva dinero o estados
    debe registrarse en job_execution con su execution_id de
    correlación.

4.  **WhatsApp es Async:** La DB genera la intención (envio_sugerido),
    el Worker envía y luego confirma. Nunca se espera al proveedor
    externo dentro de una transacción de base de datos.

5.  **Clean Search Path:** Toda RPC invocada por un worker debe fijar su
    search_path para evitar ataques de inyección de esquemas.
