**ESPECIFICACIÓN DE ENTIDAD: job_execution (La Caja Negra)**

**1. Filosofía de la Entidad**

job_execution es el **Trace Log** de infraestructura de SIPRA. Su
propósito es registrar cada proceso automatizado o de fondo, permitiendo
reconstruir qué sucedió, por qué falló y qué impacto tuvo. Al utilizar
un execution_id de correlación, permite vincular múltiples eventos bajo
una misma narrativa técnica, facilitando el debugging en entornos de
Edge Functions y Workers.

**Nombre de Tabla:** job_execution

**2. Estructura de Campos (Esquema Físico)**

  -----------------------------------------------------------------------------------------
  **Campo**              **Tipo**       **Reglas y          **Propósito**
                                        Restricciones**     
  ---------------------- -------------- ------------------- -------------------------------
  **id**                 UUID           **PK**, DEFAULT     ID físico del registro.
                                        gen_random_uuid()   

  **execution_id**       UUID           **NOT NULL**,       **Trace ID:** Correlación entre
                                        Indexado            procesos vinculados.

  **academia_id**        UUID           FK, NULLABLE,       Tenant afectado (NULL = Job
                                        Indexado            Global).

  **job_name**           Varchar(100)   **NOT NULL**,       Nombre técnico (Ver taxonomía).
                                        Indexado            

  **job_type**           Varchar(30)    **NOT NULL**        cron, webhook, rpc, worker.

  **status**             Varchar(20)    **NOT NULL**        running, success, warning,
                                                            failed.

  **severity**           Varchar(20)    **NOT NULL, DEFAULT info, low, critical.
                                        \'info\'**          

  **started_at**         Timestamptz    **NOT NULL, DEFAULT Marca de inicio real.
                                        now()**             

  **finished_at**        Timestamptz    NULLABLE            Marca de fin real.

  **duration_ms**        Integer        NULLABLE            **Persistido al finalizar:**
                                                            Para métricas rápidas.

  **affected_records**   Integer        **NULLABLE, DEFAULT Métrica de volumen para
                                        0**                 dashboards.

  **retry_count**        Smallint       **NOT NULL, DEFAULT Contador de intentos de
                                        0**                 re-ejecución.

  **triggered_by**       Varchar(30)    **NOT NULL**        system, user, webhook.

  **triggered_user**     UUID           FK usuario.id,      Operador que disparó el proceso
                                        NULLABLE            (si aplica).

  **result_summary**     JSONB          **NOT NULL, DEFAULT Detalle estructurado (Ej: {
                                        \'{}\'**            \"creados\": 5 }).

  **error_message**      Text           NULLABLE            Resumen humano del fallo.

  **error_stack**        Text           NULLABLE            **Truncado (Límite 2000 ch):**
                                                            Diagnóstico técnico.

  **created_at**         Timestamptz    DEFAULT now()       Auditoría de creación de fila.
  -----------------------------------------------------------------------------------------

**3. Taxonomía de job_name (Regla de Oro)**

Para mantener un monitoreo coherente, los nombres de los procesos deben
seguir estos prefijos obligatorios:

- **billing\_**: Procesos relacionados con la suscripción SaaS.

- **cron\_**: Tareas programadas periódicas (Cierres, sugerencias).

- **worker\_**: Procesamiento asíncrono de colas de mensajes.

- **rpc\_**: Funciones de base de datos de alto impacto.

- **maintenance\_**: Limpieza, backups y optimización.

**4. Ciclo de Vida y Determinismo**

Para evitar cálculos costosos en tiempo de consulta, el backend es
responsable de medir y persistir los resultados:

1.  **Inicio:** El backend genera un execution_id e inserta la fila en
    running.

2.  **Ejecución:** Se procesa la lógica. El backend mide el tiempo con
    precisión de milisegundos.

3.  **Cierre:** Se realiza un UPDATE final persistiendo el duration_ms
    calculado y el affected_records. Si hay error, se trunca el stack
    trace antes de enviarlo a la BD.

**5. Restricciones y Rendimiento (Constraints)**

- **Índice de Tracing:** CREATE INDEX idx_job_execution_id ON
  job_execution (execution_id);

- **Índice de Salud Crítica:** CREATE INDEX idx_job_failed_critical ON
  job_execution (status, severity) WHERE status = \'failed\';

- **Reglas Lógicas (CHECKs):**

  - CHECK (status IN (\'running\', \'success\', \'warning\',
    \'failed\'))

  - CHECK (job_type IN (\'cron\', \'webhook\', \'rpc\', \'worker\'))

  - CHECK (severity IN (\'info\', \'low\', \'critical\'))

**6. Seguridad y Retención (GC)**

- **Privacidad Absoluta (RLS):** ALTER TABLE job_execution ENABLE ROW
  LEVEL SECURITY; -\> POLICY \"Privado\" USING (false);

  - **Filosofía:** Esta tabla es para el dueño del SaaS. Ningún usuario
    de la academia (ni siquiera el Owner) debe ver trazas técnicas o
    errores de infraestructura.

- **Política de Purga (Garbage Collection):**

  - **success**: Se eliminan automáticamente tras 30 días.

  - **warning**: Se conservan 90 días.

  - **failed**: Se conservan 1 año para análisis de patrones de error.
