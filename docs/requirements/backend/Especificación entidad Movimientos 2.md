**ESPECIFICACIÓN DE ENTIDAD: movimiento**

**SIPRA V1 --- Ledger Monetario / Dinero Recibido**

**1. Objetivo de la entidad**

movimiento representa el dinero real que entra al sistema.

Es el registro monetario base de SIPRA para:

- pagos,

- abonos,

- saldo a favor,

- conciliación,

- trazabilidad financiera,

- y reparto posterior hacia cargos.

**2. Filosofía de dominio**

movimiento NO es una deuda, ni un estado de cobranza, ni una factura
fiscal.

Es:

**el hecho histórico de entrada de dinero.**

Un movimiento puede:

- cubrir uno o varios cargos,

- dejar remanente,

- ser aplicado parcialmente,

- o ser anulado lógicamente si hubo error.

**3. Principios arquitectónicos**

**Principio 1 --- El dinero entra una sola vez**

Cada captura válida de dinero genera un movimiento.

**Principio 2 --- El reparto vive aparte**

La distribución del dinero hacia cargos no vive en movimiento.

Eso vive en:

- aplicacion_movimiento

**Principio 3 --- Inmutabilidad del total**

El monto total original del movimiento no se edita libremente.

Si hubo error:

- se anula el movimiento,

- y se registra la corrección por dominio.

**Principio 4 --- Idempotencia fuerte**

La creación de movimientos debe resistir:

- doble tap,

- retries,

- mala señal,

- duplicación accidental.

**4. Nombre físico de tabla**

movimiento

**5. Estructura física de campos**

  ------------------------------------------------------------------------------------
  **Campo**          **Tipo**        **Reglas y          **Propósito**
                                     restricciones**     
  ------------------ --------------- ------------------- -----------------------------
  id                 uuid            PK, DEFAULT         Identificador único
                                     gen_random_uuid()   

  academia_id        uuid            FK, NOT NULL,       Tenant isolation
                                     indexado            

  persona_id         uuid            FK, NOT NULL,       Persona que entregó el dinero
                                     indexado            o a quien se le atribuye

  monto_total        numeric(12,2)   NOT NULL, \> 0      Dinero real recibido

  monto_disponible   numeric(12,2)   NOT NULL            Saldo aún no aplicado

  fecha_pago         timestamptz     NOT NULL, DEFAULT   Momento real en que se
                                     now()               recibió el dinero

  metodo_pago        varchar(50)     NOT NULL            Forma de pago

  idempotency_key    uuid            NOT NULL, UNIQUE    Protección contra duplicados

  estado_registro    varchar(20)     NOT NULL, DEFAULT   Estado lógico del movimiento
                                     \'registrado\'      

  notas              text            NULLABLE            Comentarios operativos

  created_by         uuid            NOT NULL, FK        Auditoría operativa
                                     usuario             

  anulado_by         uuid            NULLABLE, FK        Quién lo anuló
                                     usuario             

  anulado_motivo     text            NULLABLE            Razón de anulación

  created_at         timestamptz     NOT NULL, DEFAULT   Auditoría
                                     now()               

  updated_at         timestamptz     NOT NULL, DEFAULT   Auditoría
                                     now()               
  ------------------------------------------------------------------------------------

**6. Semántica de campos críticos**

**monto_total**

Es el dinero total recibido en una sola operación.

**Regla**

Inmutable.

Si el usuario capturó un monto incorrecto:

- no se edita,

- se anula el movimiento,

- se crea uno nuevo correcto.

**monto_disponible**

Es la porción del movimiento que todavía no se ha aplicado a cargos.

**Regla**

Mutable solo por backend dentro de transacciones atómicas.

**Fórmula lógica**

monto_disponible = monto_total - suma(aplicaciones)

**Importante**

Este campo es el contenedor del saldo a favor.

**fecha_pago**

Fecha y hora real del pago.

**Regla**

Debe ser timestamptz para conservar trazabilidad y orden real.

**metodo_pago**

Forma de pago utilizada.

**Valores recomendados**

- efectivo

- transferencia

- tarjeta

- deposito

- otro

**idempotency_key**

Llave única para evitar capturas duplicadas.

**Regla**

No debe ser nullable en el flujo operativo real.

**estado_registro**

Define si el movimiento sigue vigente o fue anulado.

**7. Estados del movimiento**

**Campo**

estado_registro

**Estados válidos**

  ------------------------------------
  **Estado**   **Significado**
  ------------ -----------------------
  registrado   Movimiento válido y
               operativo

  anulado      Movimiento invalidado
               lógicamente
  ------------------------------------

**8. Máquina de estados**

  ---------------------------------------------------
  **Estado        **Evento**             **Nuevo
  Actual**                               estado**
  --------------- ---------------------- ------------
  nuevo /         inserción              registrado
  creación válida transaccional          

  registrado      anulación con          anulado
                  reversión completa     

  anulado         terminal               anulado
  ---------------------------------------------------

**9. Estados derivados útiles**

Aunque el movimiento solo tenga registrado o anulado, para UI y lógica
puede derivarse:

  ----------------------------------------------------------
  **Derivado**            **Condición**
  ----------------------- ----------------------------------
  sin_aplicar             monto_disponible = monto_total

  parcialmente_aplicado   0 \< monto_disponible \<
                          monto_total

  aplicado_total          monto_disponible = 0 y
                          estado_registro = registrado
  ----------------------------------------------------------

**10. Restricciones a nivel de base de datos**

**monto_total**

CHECK (monto_total \> 0)

**monto_disponible**

CHECK (monto_disponible \>= 0)

CHECK (monto_disponible \<= monto_total)

**estado_registro**

CHECK (\
estado_registro IN (\
\'registrado\',\
\'anulado\'\
)\
)

**metodo_pago**

CHECK (\
metodo_pago IN (\
\'efectivo\',\
\'transferencia\',\
\'tarjeta\',\
\'deposito\',\
\'otro\'\
)\
)

**idempotency_key**

UNIQUE (academia_id, idempotency_key)

**11. Índices recomendados**

CREATE INDEX idx_movimiento_academia_persona\
ON movimiento (academia_id, persona_id);

CREATE INDEX idx_movimiento_fecha\
ON movimiento (academia_id, fecha_pago);

CREATE INDEX idx_movimiento_estado\
ON movimiento (academia_id, estado_registro);

CREATE INDEX idx_movimiento_disponible\
ON movimiento (academia_id, monto_disponible)\
WHERE monto_disponible \> 0;

CREATE UNIQUE INDEX idx_movimiento_idempotency\
ON movimiento (academia_id, idempotency_key);

**12. Reglas multi-tenant**

**Regla absoluta**

Todo movimiento pertenece explícitamente a una academia.

**Campos obligatorios**

- academia_id

- persona_id

**Validación**

La persona debe pertenecer a la misma academia del movimiento.

**13. Seguridad / RLS**

**Activación**

ALTER TABLE movimiento ENABLE ROW LEVEL SECURITY;

**Política conceptual de lectura**

Un usuario solo puede leer movimientos de su academia.

**Política conceptual de escritura**

Un usuario solo puede mutar movimientos si:

- pertenece al tenant,

- la academia está activa,

- tiene permisos operativos suficientes.

**Política sugerida**

WITH CHECK (\
can_write_tenant_data(movimiento.academia_id)\
)

**DELETE público**

Prohibido.

USING (false)

**14. Estado de academia suspendida**

Si academia.estado = \'suspendida\':

- no se permiten INSERT operativos,

- no se permiten UPDATE operativos,

- no se registran nuevos movimientos,

- no se aplican pagos,

- no se procesan mutaciones financieras.

La lectura puede seguir permitiéndose si así lo decides para modo solo
lectura.

**15. Relación con Cargo**

movimiento no se aplica directamente a un solo cargo.

La relación correcta es:

movimiento -\> aplicacion_movimiento -\> cargo

**Regla**

Un movimiento puede:

- aplicarse a uno o varios cargos,

- dejar saldo a favor,

- quedar parcialmente aplicado.

**16. Relación con saldo a favor**

Si un movimiento tiene más dinero que el necesario para cubrir los
cargos aplicados:

- el remanente permanece en monto_disponible,

- ese remanente puede aplicarse después a nuevos cargos.

**Importante**

El saldo a favor NO vive en cargo.\
Vive en movimiento.monto_disponible.

**17. Reglas de anulación**

**Regla oficial**

Un movimiento no se elimina físicamente.

Si hubo error:

- se anula lógicamente.

**Condición obligatoria**

Si el movimiento ya tiene aplicaciones:

- primero deben revertirse esas aplicaciones,

- luego puede marcarse como anulado.

**Importante**

No se debe editar el monto total original para "arreglar" un error.

**18. Reglas backend / RPC**

**registrar_movimiento o registrar_abono**

Debe:

- validar tenant,

- validar persona,

- validar idempotency_key,

- crear movimiento,

- crear aplicaciones,

- actualizar cargos,

- actualizar saldo disponible,

- insertar timeline.

**anular_movimiento**

Debe:

- validar que las aplicaciones estén reversibles,

- revertir aplicaciones,

- dejar monto_disponible = monto_total mientras se revierte,

- cambiar estado a anulado,

- después dejar el estado final consistente,

- registrar evento histórico.

**aplicar_movimiento**

Debe:

- repartir el dinero entre uno o varios cargos,

- no permitir sobreaplicación,

- actualizar monto_disponible,

- recalcular estados de cargos.

**19. Reglas de consistencia crítica**

- Nunca permitir monto_total \<= 0.

- Nunca permitir monto_disponible \< 0.

- Nunca permitir monto_disponible \> monto_total.

- Nunca editar manualmente monto_total después de creado.

- Nunca borrar físicamente.

- Nunca aplicar pagos entre tenants distintos.

- Nunca procesar un movimiento duplicado por falta de idempotencia.

- Nunca mutar si la academia está suspendida.

**20. Integración con Timeline**

Todo evento importante debe reflejarse en evento_timeline:

- movimiento registrado,

- abono aplicado,

- saldo a favor generado,

- movimiento anulado,

- ajuste operativo,

- pago conciliado.

El timeline es memoria histórica, no fuente monetaria.

**21. Fuente de verdad**

  ---------------------------------------------
  **Concepto**    **Fuente de verdad**
  --------------- -----------------------------
  dinero recibido movimiento.monto_total

  dinero aún no   movimiento.monto_disponible
  aplicado        

  estado del      movimiento.estado_registro
  movimiento      

  reparto del     aplicacion_movimiento
  dinero          

  deuda pendiente cargo.saldo_pendiente

  estado del      cargo.estado_financiero
  cargo           

  memoria         evento_timeline
  histórica       
  ---------------------------------------------

**22. Reglas arquitectónicas congeladas**

✅ Movimiento = dinero real recibido\
✅ No existe cargo directo dentro del ledger\
✅ monto_total inmutable\
✅ monto_disponible persistente\
✅ idempotency_key obligatoria en flujo operativo\
✅ Sin DELETE físico\
✅ anulado como estado terminal\
✅ academia_id obligatorio\
✅ RLS obligatorio\
✅ Readonly mode real vía BD\
✅ Timeline solo registra hechos\
✅ PostgreSQL-first architecture

**23. Resumen conceptual final**

La entidad movimiento es:

**el registro del dinero que realmente entró a SIPRA.**

No es una deuda, no es una aplicación y no es un estado visual.

Es el ledger monetario base sobre el que se distribuyen pagos, se
calcula saldo a favor y se preserva trazabilidad financiera.

Si seguimos, el siguiente paso natural es definir
**aplicacion_movimiento**, porque ahí queda cerrada la lógica completa
de reparto del dinero.
