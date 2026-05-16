**ESPECIFICACIÓN DE ENTIDAD: aplicacion_movimiento**

**SIPRA V1 --- Distribución Monetaria / Trazabilidad de Reparto**

**1. Objetivo de la entidad**

aplicacion_movimiento representa la porción exacta de un movimiento que
fue aplicada a un cargo.

Es la tabla que responde con precisión a:

**"¿Qué dinero pagó qué deuda?"**

Sin esta entidad no existe:

- abono parcial limpio,

- pago distribuido entre varios cargos,

- saldo a favor consistente,

- trazabilidad exacta,

- ni una conservación financiera confiable.

**2. Filosofía de dominio**

Esta entidad NO crea dinero ni crea deuda.

Solo registra:

- cómo se repartió un dinero ya recibido,

- a qué cargo se aplicó,

- y qué parte del movimiento sigue disponible o ya fue usada.

Su principio clave es:

**inmutabilidad del importe aplicado vs. reversión lógica del hecho**

Si hubo error:

- no se edita el monto,

- no se borra físicamente,

- se revierte la aplicación.

**3. Nombre físico de tabla**

aplicacion_movimiento

**4. Rol dentro del modelo financiero**

Relaciones principales:

- movimiento = dinero recibido

- cargo = deuda

- aplicacion_movimiento = reparto del dinero entre deuda y dinero
  disponible

**5. Estructura física de campos**

  ----------------------------------------------------------------------------
  **Campo**          **Tipo**        **Reglas y            **Propósito**
                                     restricciones**       
  ------------------ --------------- --------------------- -------------------
  id                 uuid            PK, DEFAULT           Identificador único
                                     gen_random_uuid()     

  academia_id        uuid            FK, NOT NULL,         Tenant isolation
                                     indexado              

  movimiento_id      uuid            FK, NOT NULL,         Movimiento origen
                                     indexado              

  cargo_id           uuid            FK, NOT NULL,         Cargo destino
                                     indexado              

  monto_aplicado     numeric(12,2)   NOT NULL, \> 0        Cantidad exacta
                                                           trasladada

  estado             varchar(20)     NOT NULL, DEFAULT     Estado lógico de la
                                     \'aplicada\'          aplicación

  fecha_aplicacion   timestamptz     NOT NULL, DEFAULT     Momento exacto del
                                     now()                 reparto

  notas              text            NULLABLE              Contexto opcional

  created_by         uuid            FK usuario, NOT NULL  Auditoría operativa

  revertido_by       uuid            FK usuario, NULLABLE  Quién revirtió

  revertido_at       timestamptz     NULLABLE              Cuándo se revirtió

  reversal_reason    text            NULLABLE              Razón de reversión

  created_at         timestamptz     NOT NULL, DEFAULT     Auditoría
                                     now()                 

  updated_at         timestamptz     NOT NULL, DEFAULT     Auditoría
                                     now()                 
  ----------------------------------------------------------------------------

**6. Semántica de campos críticos**

**movimiento_id**

Indica de qué bolsa de dinero salió la porción aplicada.

**cargo_id**

Indica a qué deuda entró esa porción.

**monto_aplicado**

Cantidad exacta que se trasladó.

**Regla**

No puede ser cero ni negativa.\
No puede exceder:

- el saldo disponible del movimiento,

- ni el saldo pendiente del cargo.

**estado**

Define si la aplicación sigue vigente o fue revertida.

**7. Estados válidos**

  --------------------------------------
  **Estado**   **Significado**
  ------------ -------------------------
  aplicada     La aplicación es válida y
               vigente

  revertida    La aplicación fue
               revertida lógicamente
  --------------------------------------

**8. Máquina de estados**

  ---------------------------------------
  **Estado    **Evento**      **Nuevo
  Actual**                    estado**
  ----------- --------------- -----------
  creación    inserción       aplicada
  válida      transaccional   

  aplicada    reversión       revertida
              completa        

  revertida   terminal        revertida
  ---------------------------------------

**9. Restricciones a nivel de base de datos**

**monto_aplicado**

CHECK (monto_aplicado \> 0)

**estado**

CHECK (\
estado IN (\
\'aplicada\',\
\'revertida\'\
)\
)

**10. Reglas financieras obligatorias**

Estas reglas deben validarse en backend/RPC, no solo en frontend.

**Regla 1 --- No sobregirar el movimiento**

monto_aplicado \<= movimiento.monto_disponible

**Regla 2 --- No sobrepagar el cargo**

monto_aplicado \<= cargo.saldo_pendiente

**Regla 3 --- Mismo tenant**

movimiento.academia_id == cargo.academia_id ==
aplicacion_movimiento.academia_id

**Regla 4 --- No aplicar sobre cargo anulado**

cargo.estado_financiero != \'anulado\'

**Regla 5 --- No aplicar desde movimiento anulado**

movimiento.estado_registro != \'anulado\'

**11. Índices recomendados**

CREATE INDEX idx_apmov_academia_movimiento\
ON aplicacion_movimiento (academia_id, movimiento_id);

CREATE INDEX idx_apmov_academia_cargo\
ON aplicacion_movimiento (academia_id, cargo_id);

CREATE INDEX idx_apmov_fecha\
ON aplicacion_movimiento (academia_id, fecha_aplicacion);

CREATE INDEX idx_apmov_estado\
ON aplicacion_movimiento (academia_id, estado);

**12. Reglas multi-tenant**

**Regla absoluta**

Toda aplicación pertenece explícitamente a una academia.

**Validación crítica**

El:

- movimiento,

- cargo,

- y aplicación

deben pertenecer al mismo tenant.

**13. Seguridad / RLS**

**Activación**

ALTER TABLE aplicacion_movimiento ENABLE ROW LEVEL SECURITY;

**Política conceptual de lectura**

Un usuario solo puede leer aplicaciones de su academia.

**Política conceptual de escritura**

Un usuario solo puede crear o revertir aplicaciones si:

- pertenece al tenant,

- la academia está activa,

- tiene permisos operativos suficientes.

**Política sugerida**

WITH CHECK (\
can_write_tenant_data(aplicacion_movimiento.academia_id)\
)

**DELETE público**

Prohibido.

USING (false)

**14. Estado de academia suspendida**

Si academia.estado = \'suspendida\':

- no se permiten nuevas aplicaciones,

- no se permiten reversiones,

- no se permiten mutaciones financieras.

La lectura puede seguir permitiéndose si así se define el modo solo
lectura.

**15. Flujo operacional correcto**

**Ejemplo**

Movimiento:

- \$1000

Cargos:

- Cargo A: \$800

- Cargo B: \$200

**Resultado**

Se crean dos aplicaciones:

- una de \$800 hacia Cargo A

- una de \$200 hacia Cargo B

**16. Reglas backend / RPC**

**aplicar_movimiento**

Debe ejecutarse dentro de una transacción atómica.

**Flujo mínimo**

1.  Validar tenant.

2.  Bloquear filas necesarias con FOR UPDATE.

3.  Validar saldo disponible del movimiento.

4.  Validar saldo pendiente del cargo.

5.  Crear la aplicación.

6.  Actualizar movimiento.monto_disponible.

7.  Actualizar cargo.saldo_pendiente.

8.  Recalcular cargo.estado_financiero.

9.  Insertar evento en evento_timeline.

10. Commit.

**revertir_aplicacion**

Debe:

1.  Marcar la aplicación como revertida.

2.  Regresar el monto al movimiento.monto_disponible.

3.  Regresar el monto al cargo.saldo_pendiente.

4.  Recalcular el estado del cargo.

5.  Registrar evento histórico.

6.  Commit.

**17. Reglas de consistencia crítica**

- Nunca aplicar montos negativos.

- Nunca aplicar más de lo disponible.

- Nunca aplicar más de lo que el cargo debe.

- Nunca mezclar tenants.

- Nunca aplicar sobre cargos anulados.

- Nunca aplicar desde movimientos anulados.

- Nunca borrar aplicaciones físicamente.

- Nunca mutar si la academia está suspendida.

- Nunca ejecutar este flujo fuera de transacción atómica.

- Nunca confiar solo en frontend para validar límites.

**18. Integración con Timeline**

Toda aplicación importante debe generar un evento en evento_timeline:

- pago aplicado,

- abono parcial,

- liquidación de cargo,

- reversión,

- ajuste financiero.

El timeline es memoria histórica, no fuente contable.

**19. Reglas de auditoría y saneamiento**

Esta entidad también debe ser monitoreada por la vista auditora
financiera.

La conciliación matemática debe poder verificar que:

movimiento.monto_total =\
movimiento.monto_disponible +\
SUM(aplicacion_movimiento.monto_aplicado_activo)

y que:

cargo.monto_original =\
cargo.saldo_pendiente +\
SUM(aplicacion_movimiento.monto_aplicado_activo)

Si cualquiera de estas relaciones no se cumple, hay corrupción contable
o un bug transaccional.

**20. Fuente de verdad**

  --------------------------------------------
  **Concepto**   **Fuente de verdad**
  -------------- -----------------------------
  dinero         movimiento
  recibido       

  deuda original cargo

  reparto del    aplicacion_movimiento
  dinero         

  saldo          movimiento.monto_disponible
  disponible     

  saldo          cargo.saldo_pendiente
  pendiente      

  historial UI   evento_timeline
  --------------------------------------------

**21. Reglas arquitectónicas congeladas**

✅ Aplicación = distribución de dinero\
✅ Nunca crea dinero\
✅ Nunca crea deuda\
✅ monto_aplicado inmutable\
✅ Reversión lógica en vez de borrado\
✅ Tenant isolation obligatorio\
✅ RLS obligatorio\
✅ PostgreSQL-first architecture\
✅ Timeline separado del ledger\
✅ Soporta pagos múltiples y parciales\
✅ Soporta saldo a favor\
✅ Compatible con auditoría y soporte\
✅ Compatible con locking pesimista (FOR UPDATE)\
✅ Monitoreable con vista auditora financiera

**22. Resumen conceptual final**

La entidad aplicacion_movimiento es la pieza que conecta el dinero real
con la deuda real.

Sin esta tabla:

- no existirían pagos parciales limpios,

- no existiría saldo a favor nativo,

- y el sistema terminaría falsificando movimientos o duplicando pagos.

Es la capa que une el dinero con la deuda sin romper la trazabilidad.
