**ESPECIFICACIÓN DE ENTIDAD: cargo**

**SIPRA V1 --- Núcleo Financiero / Cargo Vivo**

**1. Objetivo de la entidad**

cargo representa una obligación financiera individual asignada a una
persona dentro de una academia.

Es el núcleo de:

- cobranza,

- saldos,

- vencimientos,

- automatización,

- listas de pendientes,

- y disparo de sugerencias de WhatsApp.

**2. Filosofía de dominio**

cargo NO es una factura fiscal ni una cuenta contable formal.

Es:

**una deuda operativa viva.**

Su comportamiento clave es:

- el monto original es inmutable,

- el saldo pendiente se actualiza transaccionalmente,

- el estado financiero es derivado/caché,

- la promesa solo frena automatización,

- la anulación es lógica, no física.

**3. Nombre físico de tabla**

cargo

**4. Estructura física de campos**

  -------------------------------------------------------------------------------------
  **Campo**           **Tipo**        **Reglas y            **Propósito**
                                      restricciones**       
  ------------------- --------------- --------------------- ---------------------------
  id                  uuid            PK, DEFAULT           Identificador único del
                                      gen_random_uuid()     cargo

  academia_id         uuid            FK, NOT NULL,         Tenant isolation
                                      indexado              

  persona_id          uuid            FK, NOT NULL,         Persona responsable del
                                      indexado              adeudo

  grupo_origen_id     uuid            FK, NULLABLE,         Trazabilidad del origen
                                      indexado              grupal

  concepto            varchar(150)    NOT NULL              Nombre operativo del cargo

  descripcion         text            NULLABLE              Contexto adicional

  monto_original      numeric(12,2)   NOT NULL, \> 0        Monto inicial inmutable

  saldo_pendiente     numeric(12,2)   NOT NULL              Caché operativo del saldo
                                                            actual

  fecha_creacion      timestamptz     NOT NULL, DEFAULT     Momento en que se creó
                                      now()                 

  fecha_vencimiento   date            NOT NULL, indexado    Fecha a partir de la cual
                                                            se considera vencido

  fecha_promesa       date            NULLABLE, indexado    Interruptor relacional para
                                                            automatización

  estado_financiero   varchar(20)     NOT NULL, indexado    Estado derivado/caché

  origen              varchar(20)     NOT NULL, DEFAULT     Procedencia del cargo
                                      \'manual\'            

  metadata            jsonb           NOT NULL, DEFAULT     Flexibilidad futura
                                      \'{}\'                

  created_by          uuid            FK usuario, NULLABLE  Auditoría operativa

  created_at          timestamptz     NOT NULL, DEFAULT     Auditoría
                                      now()                 

  updated_at          timestamptz     NOT NULL, DEFAULT     Auditoría
                                      now()                 
  -------------------------------------------------------------------------------------

**5. Semántica de campos críticos**

**monto_original**

Es el precio inicial del cargo.

**Regla**

Inmutable.

Si hubo error:

- no se edita,

- se anula el cargo,

- se crea otro correcto.

**saldo_pendiente**

Es el saldo vivo del cargo.

**Regla**

Persistente y mutable, pero solo por backend/RPC dentro de transacciones
atómicas.

**Fórmula lógica**

saldo_pendiente = monto_original - suma(aplicaciones)

**Importante**

La suma NO debe calcularse en tiempo real para la UI.\
Debe mantenerse físicamente en la tabla.

**fecha_vencimiento**

Define desde cuándo un cargo se considera moroso.

**Regla**

El cron nocturno usa esta fecha y la zona horaria de la academia para
decidir si el cargo pasa a vencido.

**fecha_promesa**

Es un interruptor relacional.

**Regla**

Si existe una promesa futura activa:

- se pausa o suaviza la automatización,

- pero la matemática del cargo no cambia.

**Importante**

Un cargo con promesa puede seguir estando:

- pendiente,

- parcial,

- o vencido.

La promesa no altera la deuda; solo afecta Envíos.

**estado_financiero**

Es el estado derivado/caché del cargo.

**Regla**

No debe editarse libremente desde frontend.

**grupo_origen_id**

Sirve solo como trazabilidad.

**Regla**

NO crea deuda grupal.\
Solo indica de dónde nació el cargo.

**6. Estados financieros**

**Campo**

estado_financiero

**Estados válidos**

  --------------------------------
  **Estado**   **Significado**
  ------------ -------------------
  pendiente    Tiene saldo y aún
               no vence

  parcial      Tiene abonos, pero
               aún debe

  vencido      Tiene saldo y ya
               venció

  liquidado    Saldo pendiente = 0

  anulado      Cargo invalidado
               lógicamente
  --------------------------------

**7. Máquina de estados**

  ------------------------------------------------------------
  **Evento**   **Condición**               **Nuevo estado**
  ------------ --------------------------- -------------------
  creación     fecha_vencimiento \>= hoy   pendiente
               local del tenant            

  creación     fecha_vencimiento \< hoy    vencido
               local del tenant            

  paso del     cargo abierto y vencido en  vencido
  tiempo       cron nocturno               

  abono        saldo_pendiente \> 0        parcial o vencido
  parcial                                  según fecha

  abono total  saldo_pendiente = 0         liquidado

  anulación    reversión financiera        anulado
               completa previa             
  ------------------------------------------------------------

**8. Restricciones a nivel de base de datos**

**monto_original**

CHECK (monto_original \> 0)

**saldo_pendiente**

CHECK (saldo_pendiente \>= 0)

CHECK (saldo_pendiente \<= monto_original)

**estado_financiero**

CHECK (\
estado_financiero IN (\
\'pendiente\',\
\'parcial\',\
\'vencido\',\
\'liquidado\',\
\'anulado\'\
)\
)

**concepto**

CHECK (char_length(trim(concepto)) \> 0)

**origen**

CHECK (\
origen IN (\'manual\', \'grupal\', \'automatico\', \'ajuste\')\
)

**9. Índices recomendados**

CREATE INDEX idx_cargo_academia_estado\
ON cargo (academia_id, estado_financiero);

CREATE INDEX idx_cargo_persona\
ON cargo (persona_id);

CREATE INDEX idx_cargo_vencimiento\
ON cargo (academia_id, fecha_vencimiento);

CREATE INDEX idx_cargo_promesa\
ON cargo (academia_id, fecha_promesa);

CREATE INDEX idx_cargo_operativo\
ON cargo (academia_id, estado_financiero, fecha_vencimiento);

Este último es clave para:

- Pendientes,

- cron nocturno,

- Envíos,

- filtros rápidos.

**10. Reglas multi-tenant**

**Regla absoluta**

Todo cargo pertenece explícitamente a una academia.

**Campos obligatorios**

- academia_id

- persona_id

**Validación**

La persona debe pertenecer a la misma academia del cargo.

**11. Seguridad / RLS**

**Activación**

ALTER TABLE cargo ENABLE ROW LEVEL SECURITY;

**Política conceptual de lectura**

Un usuario solo puede leer cargos de su academia.

**Política conceptual de escritura**

Un usuario solo puede mutar cargos si:

- pertenece al tenant,

- la academia está activa,

- tiene permisos operativos suficientes.

**Política sugerida**

WITH CHECK (\
can_write_tenant_data(cargo.academia_id)\
)

**DELETE público**

Prohibido.

USING (false)

**12. Estado de academia suspendida**

Si la academia está en estado suspendida:

- no se permiten INSERT operativos,

- no se permiten UPDATE operativos,

- no se generan cargos,

- no se generan sugerencias,

- no se procesan mutaciones financieras.

La lectura puede seguir permitiéndose si así se decide para modo solo
lectura.

Esto debe hacerse como regla de BD, no solo frontend.

**13. Relación con dinero real**

cargo NO guarda pagos directamente.

El dinero entra en:

- movimiento

La distribución del dinero vive en:

- aplicacion_movimiento

El cargo solo refleja:

- cuánto se debía,

- cuánto queda,

- y cuál es su estado.

**14. Reglas de anulación**

**Regla oficial**

Un cargo nunca se elimina físicamente.

Si el cargo fue creado por error:

- debe pasar a anulado.

**Condición obligatoria**

Si el cargo ya tenía aplicaciones de pago:

- primero deben revertirse las aplicaciones asociadas,

- después puede anularse el cargo.

**Importante**

No se "borra" el movimiento original.\
Se revierten sus aplicaciones y se conserva el historial.

**15. Promesa**

La promesa:

- no modifica la matemática del cargo,

- no cambia el saldo,

- no cambia la verdad financiera,

- solo modifica la automatización y la UX.

**Regla**

Si fecha_promesa es futura:

- el motor de Envíos no debe sugerir recordatorios para ese cargo.

**16. Reglas backend / RPC**

**crear_cargo**

Debe:

- validar tenant,

- validar persona,

- validar que la persona pertenezca a la misma academia,

- calcular fecha_vencimiento si aplica,

- inicializar saldo_pendiente = monto_original,

- inicializar estado_financiero,

- insertar evento en timeline.

**crear_cargo_grupal**

Debe:

- consultar miembros activos del grupo,

- excluir alumnos desmarcados,

- crear N cargos individuales,

- registrar los eventos necesarios.

**registrar_promesa**

Debe:

- actualizar fecha_promesa,

- insertar evento en timeline,

- no tocar la matemática del cargo.

**anular_cargo**

Debe:

- revertir aplicaciones previas,

- liberar el dinero correspondiente en movimiento,

- dejar el cargo en estado anulado,

- poner saldo_pendiente = 0,

- generar evento histórico.

**17. Reglas para cron job nocturno**

El cron nocturno debe:

- revisar cargos abiertos,

- comparar fecha_vencimiento con la fecha local del tenant,

- pasar a vencido los cargos que correspondan,

- generar o invalidar sugerencias de envío según aplique,

- respetar fecha_promesa.

**18. Reglas de consistencia crítica**

- Nunca permitir saldo_pendiente \< 0.

- Nunca permitir saldo_pendiente \> monto_original.

- Nunca editar manualmente estado_financiero desde frontend.

- Nunca borrar físicamente.

- Nunca depender del timeline para calcular saldos.

- Nunca generar sugerencia si hay promesa futura activa.

- Nunca mutar si la academia está suspendida.

**19. Integración con Timeline**

Toda mutación importante debe reflejarse en evento_timeline:

- cargo creado,

- abono aplicado,

- cargo liquidado,

- promesa registrada,

- cargo anulado,

- recordatorio enviado.

El timeline es memoria histórica, no fuente financiera.

**20. Fuente de verdad**

  --------------------------------------
  **Concepto**   **Fuente de verdad**
  -------------- -----------------------
  deuda original monto_original

  saldo actual   saldo_pendiente

  estado         estado_financiero
  financiero     

  interruptor    fecha_promesa
  relacional     

  memoria        evento_timeline
  histórica      

  dinero real    movimiento
  recibido       

  reparto del    aplicacion_movimiento
  dinero         
  --------------------------------------

**21. Reglas arquitectónicas congeladas**

✅ Cargo = deuda individual\
✅ Cobro grupal = múltiples cargos individuales\
✅ monto_original inmutable\
✅ saldo_pendiente persistente\
✅ estado_financiero derivado/caché\
✅ fecha_promesa solo frena automatización\
✅ Sin DELETE físico\
✅ anulado como estado terminal\
✅ academia_id obligatorio\
✅ RLS obligatorio\
✅ Readonly mode real vía BD\
✅ Timeline solo registra hechos\
✅ PostgreSQL-first architecture

**22. Resumen conceptual final**

La entidad cargo es:

**el núcleo financiero operativo de SIPRA.**

No es una factura formal ni una cuenta bancaria.\
Es una deuda viva, contextual, automatizable, parcialmente pagable y
relacional.

Toda la experiencia de:

- Pendientes,

- Seguimiento,

- Envíos,

- Automatización,

- Cron,

- y KPI operativos

depende de esta entidad.
