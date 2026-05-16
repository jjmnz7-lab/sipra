**1. Filosofía General**

En SIPRA:

**el Frontend NO ejecuta lógica financiera ni muta directamente el
estado del sistema.**

El frontend:

- captura datos,

- muestra UI,

- dispara intenciones.

La Base de Datos:

**es el motor oficial de estado.**

Toda operación crítica ocurre mediante:

✅ RPCs transaccionales\
✅ funciones PL/pgSQL\
✅ transacciones atómicas\
✅ reglas de negocio centralizadas

**Principio Central**

Frontend → Intención\
DB/RPC → Verdad

**Objetivos Arquitectónicos**

✅ consistencia financiera\
✅ atomicidad total\
✅ anti doble gasto\
✅ idempotencia real\
✅ rollback automático\
✅ multi-tenancy seguro\
✅ trazabilidad completa\
✅ ledger consistente\
✅ side-effects controlados\
✅ separación frontend/backend

**2. Principios Congelados**

  ------------------------------------------
  **Regla**       **Decisión**
  --------------- --------------------------
  Frontend        NO toca ledger

  Estados         derivados, no manuales

  Ledger          fuente financiera oficial

  RPC             acción negocio completa

  Transacciones   obligatorias

  Timeline        atómico
  financiero      

  Reversiones     contra-transacciones

  Idempotencia    persistente

  FOR UPDATE      obligatorio

  Edge Functions  integración/orquestación

  DB              motor transaccional
  ------------------------------------------

**3. Arquitectura Oficial**

**Flujo Oficial**

Frontend\
→ Edge Function (opcional)\
→ RPC transaccional\
→ BEGIN\
→ Validaciones\
→ Locks\
→ Mutaciones Ledger\
→ Side Effects internos\
→ Timeline\
→ COMMIT

**Si algo falla**

ROLLBACK

**Resultado**

La operación:

**existe completa o no existe.**

**4. Filosofía Oficial RPC**

**RPC ≠ CRUD**

Las RPC representan:

**acciones de negocio completas.**

**Ejemplos Correctos**

✅ registrar_pago_v1\
✅ generar_cargos_grupo_v1\
✅ revertir_movimiento_v1\
✅ registrar_promesa_pago_v1\
✅ reorganizar_membresia_v1\
✅ suspender_academia_v1

**Ejemplos Incorrectos**

❌ update saldo\
❌ insert aplicacion_movimiento manual\
❌ delete movimiento\
❌ update estado_financiero desde frontend

**Regla Congelada**

El Frontend:

**nunca modifica tablas financieras directamente.**

**5. Patrón Oficial de Capas RPC**

Toda RPC crítica debe seguir este orden exacto:

**CAPA 1 --- Seguridad**

Validar:

sipra_auth.can_write_to_academia()

**Incluye**

✅ tenant\
✅ usuario activo\
✅ suscripción válida\
✅ permisos RBAC

**CAPA 2 --- Validación Negocio**

Validar:

✅ saldos\
✅ estados\
✅ cuotas\
✅ duplicados\
✅ reglas dominio\
✅ integridad

**CAPA 3 --- Locks Transaccionales**

Bloquear filas:

FOR UPDATE

**Objetivo**

Evitar:

❌ race conditions\
❌ doble gasto\
❌ inconsistencias

**CAPA 4 --- Ledger**

Mutar:

✅ movimiento\
✅ cargo\
✅ aplicacion_movimiento

**Preservando**

conservación matemática del dinero

**CAPA 5 --- Side Effects Internos**

Ejecutar:

✅ invalidar envio_sugerido\
✅ emitir realtime\
✅ marcar sincronizaciones\
✅ limpiar caches internas

**CAPA 6 --- Narrativa y Auditoría**

Insertar:

✅ evento_timeline\
✅ job_execution (si aplica)

**6. Atomicidad Oficial**

**Regla Congelada**

Toda operación financiera:

**ocurre en UNA sola transacción.**

**Ejemplo**

Registrar pago implica:

1.  crear movimiento

2.  lockear filas

3.  crear aplicaciones

4.  recalcular saldos

5.  recalcular estados

6.  invalidar sugerencias

7.  insertar timeline

8.  commit

**Nunca**

2 RPCs separadas

para una misma operación de negocio crítica.

**7. Regla Oficial Edge Functions**

**Edge Functions**

Responsables de:

✅ integraciones externas\
✅ webhooks\
✅ WhatsApp\
✅ Stripe\
✅ MercadoPago\
✅ orchestration\
✅ cron dispatching

**RPC**

Responsable de:

✅ atomicidad\
✅ consistencia\
✅ ledger\
✅ commit único

**Regla Congelada**

Una operación crítica\
→ una sola RPC transaccional.

**Prohibido**

await rpcA()\
await rpcB()

si ambas forman:

**una sola operación negocio.**

**8. FOR UPDATE Oficial**

**Regla Congelada**

Toda RPC financiera:

**debe usar FOR UPDATE.**

**Filas mínimas**

  -----------------------------------
  **Tabla**              **Motivo**
  ---------------------- ------------
  movimiento             disponible

  cargo                  saldo

  usuario                estado

  suscripcion_academia   write
                         validation
  -----------------------------------

**9. Prevención Oficial Deadlocks**

**Problema**

Lock ordering inconsistente:

**deadlocks.**

**Solución Oficial**

Toda RPC:

**bloquea filas en orden determinístico.**

**Ejemplo Oficial**

SELECT id\
FROM cargo\
WHERE id IN (\...)\
ORDER BY id ASC\
FOR UPDATE;

**Regla Congelada**

Locks múltiples:

**siempre mismo orden.**

**10. Advisory Locks**

**Uso Oficial**

Procesos globales:

✅ generación mensualidades\
✅ cron masivos\
✅ conciliaciones\
✅ imports

**Implementación**

pg_advisory_xact_lock(\...)

**Beneficio**

Evita:

❌ doble cron\
❌ doble generación\
❌ workers paralelos

**11. lock_timeout Defensivo**

**Regla Oficial**

RPCs críticas deben usar:

SET LOCAL lock_timeout = \'5s\';

**Objetivo**

Evitar:

❌ locks infinitos\
❌ workers colgados\
❌ cascadas lentas

**12. Estrategia Oficial Idempotencia**

**Problema**

❌ doble click\
❌ reconnect\
❌ retry móvil\
❌ retry webhook\
❌ timeout red

**Solución Oficial**

Tabla dedicada:

rpc_execution

**Campos mínimos**

  -------------------------------------------
  **Campo**          **Uso**
  ------------------ ------------------------
  execution_id       UUID

  tenant_id          aislamiento

  rpc_name           scope

  request_hash       validación

  status             running/success/failed

  response_payload   replay

  created_at         TTL

  completed_at       auditoría
  -------------------------------------------

**Flujo Oficial**

**Paso 1**

Registrar execution_id:

**ANTES de lógica negocio.**

**Paso 2**

Si ya existe:

success

→ devolver:

response_payload

**Paso 3**

Si:

running

→ rechazar/retry.

**Beneficios**

✅ replay exacto\
✅ retries seguros\
✅ anti duplicados\
✅ observabilidad limpia

**13. Estrategia Oficial Estados**

**Regla**

Estados:

**NO se editan manualmente.**

**Estados son:**

**derivados.**

**Ejemplo**

saldo = 0\
→ liquidado

**Prohibido**

UPDATE cargo\
SET estado_financiero = \'liquidado\'

manual.

**14. Conservación Matemática**

**Regla Oficial**

El dinero no se crea ni se destruye.

**Movimiento**

monto_total =\
monto_disponible +\
SUM(aplicaciones)

**Cargo**

monto_original =\
saldo_pendiente +\
SUM(aplicaciones)

**Toda RPC:**

debe preservar estas ecuaciones.

**15. Estrategia Oficial Reversiones**

**Regla Congelada**

Las operaciones:

**NO se editan.**

**Se revierten mediante:**

**contra-transacciones.**

**Flujo Oficial**

**Paso 1**

Movimiento original:

estado = revertido

**Paso 2**

Crear nuevo movimiento:

tipo = reverso

**Paso 3**

Revertir:

aplicacion_movimiento

**Paso 4**

Recalcular:

✅ saldos\
✅ estados\
✅ timeline

**Beneficios**

✅ auditoría real\
✅ historia financiera intacta\
✅ trazabilidad legal\
✅ debugging perfecto

**16. Estrategia Oficial Timeline**

**Regla Congelada**

Toda RPC que cambie:

✅ dinero\
✅ estados persona\
✅ membresías\
✅ relaciones financieras

→ debe insertar:

evento_timeline

**Timeline Financiero**

**obligatorio y atómico.**

**Timeline Sistema/Comunicación**

puede ser:

**async.**

**17. envio_sugerido Integration**

**Regla Oficial**

RPCs financieras:

**invalidan sugerencias automáticamente.**

**Ejemplo**

saldo → 0

→

estado = \'autodescartado\'

**18. job_execution Strategy**

**Usar SOLO para:**

✅ cron\
✅ imports\
✅ procesos masivos\
✅ conciliaciones\
✅ jobs backend

**NO usar para:**

❌ pagos individuales\
❌ CRUD simples\
❌ operaciones triviales

**19. Error Handling Oficial**

**Regla Oficial**

Errores:

**estructurados.**

**Ejemplo**

RAISE EXCEPTION USING\
MESSAGE = \'Saldo insuficiente\',\
ERRCODE = \'P0001\',\
DETAIL = \'El cargo ya fue liquidado\';

**Beneficios**

✅ frontend limpio\
✅ UX consistente\
✅ internacionalización\
✅ clasificación errores

**20. Return Payload Oficial**

**Toda RPC retorna JSON estructurado**

**Formato Oficial**

{\
\"success\": true,\
\"operation_id\": \"uuid\",\
\"timeline_event_id\": \"uuid\",\
\"data\": {},\
\"warnings\": \[\],\
\"needs_refresh\": false\
}

**Nunca retornar**

TRUE/FALSE

simple.

**21. SECURITY DEFINER**

**Regla Oficial**

RPCs operativas:

SECURITY DEFINER

**Obligatorio**

SET search_path = public, sipra_auth

**Prohibido**

❌ SQL dinámico inseguro\
❌ concatenación queries\
❌ EXECUTE arbitrario

**22. RPC Versioning**

**Regla Oficial**

RPCs:

**versionadas.**

**Correcto**

registrar_pago_v1\
registrar_pago_v2

**Incorrecto**

registrar_pago

mutable eterna.

**Beneficio**

✅ apps móviles\
✅ backwards compatibility\
✅ migraciones limpias

**23. Reglas Arquitectónicas Congeladas**

**Regla 1**

Frontend:

**NO toca ledger.**

**Regla 2**

Toda operación financiera:

**transacción única.**

**Regla 3**

FOR UPDATE:

**obligatorio.**

**Regla 4**

Locks múltiples:

**orden determinístico.**

**Regla 5**

Estados:

**derivados, no manuales.**

**Regla 6**

Idempotencia:

**persistente.**

**Regla 7**

Reversiones:

**contra-transacciones.**

**Regla 8**

Timeline financiero:

**obligatorio.**

**Regla 9**

Una operación crítica:

**una RPC.**

**Regla 10**

Edge Functions:

**integración, no consistencia.**

**Regla 11**

El dinero:

**se conserva matemáticamente.**

**Regla 12**

DB:

**motor oficial de estado.**

**Regla 13**

RPCs:

**SECURITY DEFINER endurecidas.**

**Regla 14**

Errores:

**estructurados.**

**Regla 15**

RPCs:

**versionadas.**
