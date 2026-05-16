**ESPECIFICACIÓN DE ENTIDAD: evento_timeline**

**SIPRA V1 --- Memoria Operativa / Historial Relacional / Timeline de
Seguimiento**

**1. Objetivo de la entidad**

evento_timeline representa la memoria histórica operativa y relacional
de SIPRA.

Su función es proyectar, en una narrativa legible para humanos, los
hechos relevantes que ocurrieron sobre una persona, su cobranza, sus
acuerdos, sus comunicaciones y su contexto operativo.

Es la fuente de verdad para:

- la pantalla **Seguimiento**,

- la transparencia operativa,

- el soporte,

- la auditoría humana,

- y la explicación histórica de "qué pasó".

No es fuente de verdad para:

- saldos,

- deuda,

- dinero disponible,

- ni estados financieros.

**2. Filosofía de dominio**

evento_timeline es una tabla **append-only** en sentido funcional.

Eso significa:

- los eventos históricos no se reescriben,

- no se borran físicamente,

- no se usan para recalcular el ledger,

- y cualquier corrección debe registrarse como un nuevo evento.

**Excepción controlada**

Solo los eventos de categoría contexto pueden ocultarse visualmente
mediante soft-hide, pero:

- el registro sigue existiendo,

- no se borra,

- no se reescribe su significado histórico.

**3. Principios arquitectónicos**

**Principio 1 --- Timeline ≠ Ledger**

La entidad no calcula:

- saldo pendiente,

- saldo disponible,

- deuda original,

- ni aplicación monetaria.

Eso vive en:

- cargo

- movimiento

- aplicacion_movimiento

**Principio 2 --- Narrativa humana**

Cada evento debe poder leerse sin joins complejos.

El backend debe entregar:

- titulo,

- descripcion,

- metadata enriquecida,

- y tipo/categoría ya resueltos.

**Principio 3 --- Snapshot histórico**

El evento debe guardar una "foto" del estado relevante en el momento en
que ocurrió.

Si después cambia el cargo, el movimiento o la promesa, el Timeline
conserva el contexto original.

**Principio 4 --- Seguridad por categoría**

Los eventos financieros relevantes deben quedar registrados de forma
transaccional o en el mismo flujo ACID que originó el cambio.

Los eventos de comunicación o sistema pueden ser más desacoplados, pero
sin romper trazabilidad.

**4. Nombre físico de tabla**

evento_timeline

**5. Estructura física de campos**

  -------------------------------------------------------------------------------------
  **Campo**          **Tipo**       **Reglas y            **Propósito**
                                    restricciones**       
  ------------------ -------------- --------------------- -----------------------------
  id                 uuid           PK, DEFAULT           Identificador único del
                                    gen_random_uuid()     evento

  academia_id        uuid           FK, NOT NULL,         Tenant isolation
                                    indexado              

  persona_id         uuid           FK, NOT NULL,         Persona a la que pertenece la
                                    indexado              historia

  created_by         uuid           FK usuario, NULLABLE  Quién ejecutó la acción; NULL
                                                          si fue automático

  categoria          varchar(30)    NOT NULL              Categoría semántica del
                                                          evento

  tipo               varchar(50)    NOT NULL              Tipo específico del evento

  titulo             varchar(150)   NOT NULL              Resumen rápido visible

  descripcion        text           NULLABLE              Detalle humano expandible

  metadata           jsonb          NOT NULL DEFAULT      Snapshot estructurado del
                                    \'{}\'                evento

  origen_entidad     varchar(50)    NULLABLE              Entidad que originó el evento

  origen_id          uuid           NULLABLE              ID de la entidad de origen

  prioridad_visual   varchar(20)    NOT NULL DEFAULT      Intensidad visual
                                    \'normal\'            

  visibilidad        varchar(20)    NOT NULL DEFAULT      interna / publica
                                    \'interna\'           

  visible            boolean        NOT NULL DEFAULT true Soft hide visual controlado

  ocultado_by        uuid           NULLABLE FK usuario   Quién ocultó el evento

  ocultado_at        timestamptz    NULLABLE              Cuándo fue ocultado

  ocultado_motivo    text           NULLABLE              Razón del ocultamiento

  fecha_evento       timestamptz    NOT NULL DEFAULT      Momento semántico del suceso
                                    now()                 

  created_at         timestamptz    NOT NULL DEFAULT      Auditoría de inserción
                                    now()                 

  updated_at         timestamptz    NOT NULL DEFAULT      Auditoría técnica
                                    now()                 
  -------------------------------------------------------------------------------------

**6. Semántica de campos críticos**

**categoria**

Agrupación semántica principal para la UI.

**Valores permitidos**

- financiero

- comunicacion

- acuerdo

- operativo

- contexto

- sistema

**tipo**

Tipo específico del evento dentro de la categoría.

**Ejemplos**

- cargo_creado

- abono_registrado

- cargo_liquidado

- cargo_anulado

- promesa_pago

- whatsapp_enviado

- nota_manual

- autodescarte_envio

**metadata**

Payload estructurado para que la UI pueda pintar el evento sin joins
pesados.

**Ejemplo**

{\
\"monto\": 500,\
\"saldo_restante\": 200,\
\"cargo_id\": \"uuid\",\
\"movimiento_id\": \"uuid\",\
\"concepto\": \"Mensualidad Junio\"\
}

**Regla**

Debe funcionar como snapshot defensivo:

- si el cargo cambia después,

- el evento conserva la foto del momento.

**origen_entidad**

Entidad raíz que detonó el evento.

**Valores permitidos recomendados**

- cargo

- movimiento

- aplicacion_movimiento

- envio_sugerido

- grupo

- persona

- academia

- sistema

**origen_id**

ID de la entidad origen.

**prioridad_visual**

Define el peso visual del evento en la pantalla.

**Valores**

- baja

- normal

- alta

- critica

**visible**

Soft hide controlado.

**Regla**

Solo eventos de categoría contexto pueden ocultarse.

**visibilidad**

Define si el evento es solo interno o potencialmente visible en un
portal futuro de padres.

**Valores**

- interna

- publica

**Recomendación V1**

Usar principalmente interna.

**7. Taxonomía de eventos V1**

**Categorías y tipos sugeridos**

**A. Categoría financiero**

Eventos de dinero y deuda.

**Tipos**

- cargo_creado

- abono_registrado

- cargo_liquidado

- cargo_anulado

- ajuste_administrativo

**B. Categoría comunicacion**

Eventos de mensajes y recordatorios.

**Tipos**

- whatsapp_enviado

- recordatorio_sugerido

- envio_descartado

**C. Categoría acuerdo**

Eventos de compromisos y pausas relacionales.

**Tipos**

- promesa_pago

- promesa_expirada

- seguimiento_pausado

**D. Categoría operativo**

Eventos de coordinación ligera.

**Tipos**

- evento_grupal

- ensayo

- juego

- reunion

**E. Categoría contexto**

Notas humanas y observaciones sensibles.

**Tipos**

- nota_manual

- caso_sensible

**F. Categoría sistema**

Eventos automáticos o internos.

**Tipos**

- estado_recalculado

- autodescarte_envio

- reconciliacion_financiera

- validacion_nocturna

**8. Restricciones a nivel de base de datos**

**Categoría válida**

CHECK (\
categoria IN (\
\'financiero\',\
\'comunicacion\',\
\'acuerdo\',\
\'operativo\',\
\'contexto\',\
\'sistema\'\
)\
)

**Título obligatorio no vacío**

CHECK (char_length(trim(titulo)) \> 0)

**Prioridad válida**

CHECK (\
prioridad_visual IN (\'baja\', \'normal\', \'alta\', \'critica\')\
)

**Visibilidad válida**

CHECK (\
visibilidad IN (\'interna\', \'publica\')\
)

**visible y categoría**

Regla recomendada a nivel backend:

- visible=false solo permitido si categoria=\'contexto\'.

Esto puede reforzarse por trigger o por validación en backend/RPC.

**9. Índices recomendados**

CREATE INDEX idx_timeline_persona_fecha\
ON evento_timeline (\
academia_id,\
persona_id,\
fecha_evento DESC\
);

CREATE INDEX idx_timeline_categoria_fecha\
ON evento_timeline (\
academia_id,\
categoria,\
fecha_evento DESC\
);

CREATE INDEX idx_timeline_tipo_fecha\
ON evento_timeline (\
academia_id,\
tipo,\
fecha_evento DESC\
);

CREATE INDEX idx_timeline_origen\
ON evento_timeline (\
academia_id,\
origen_entidad,\
origen_id\
);

CREATE INDEX idx_timeline_visible\
ON evento_timeline (\
academia_id,\
persona_id,\
visible\
);

**10. Reglas multi-tenant**

**Regla absoluta**

Todo evento pertenece explícitamente a una academia.

**Validación crítica**

La:

- persona,

- entidad de origen,

- y evento

deben pertenecer al mismo tenant.

**11. Seguridad / RLS**

**Activación**

ALTER TABLE evento_timeline ENABLE ROW LEVEL SECURITY;

**Política conceptual de lectura**

Solo usuarios del tenant pueden leer los eventos de su academia.

**Política conceptual de inserción**

Solo usuarios autorizados o procesos backend pueden insertar eventos de
la academia correspondiente.

**Política conceptual de mutación**

UPDATE y DELETE operativos están prohibidos como regla general.

**DELETE público**

Prohibido.

USING (false)

**12. Reglas de edición y ocultamiento**

**Regla oficial**

La historia no se reescribe.

Si un evento fue incorrecto:

- no se modifica su significado,

- se inserta un nuevo evento de corrección.

**Soft hide permitido solo para contexto**

Eventos de tipo contexto pueden ocultarse de la UI.

**Ejemplos**

- nota escrita por error,

- comentario sensible,

- observación que el profesor decide ocultar después.

**Prohibido ocultar**

- financieros,

- comunicación,

- acuerdos,

- sistema.

**13. Reglas de atomicidad por categoría**

**Eventos financieros**

Deben registrarse dentro de la misma transacción lógica o ACID que
originó el cambio financiero.

**Ejemplos**

- abono_registrado

- cargo_liquidado

- cargo_anulado

- ajuste_administrativo

- promesa_pago

**Eventos no financieros**

Pueden ser más desacoplados:

- whatsapp_enviado

- recordatorio_sugerido

- autodescarte_envio

- algunos eventos del sistema

**Regla práctica**

Si el evento afecta la narrativa del cobro de forma crítica, debe ser lo
más atómico posible respecto a la operación que lo originó.

**14. Reglas backend / RPC**

**Inserción controlada**

El frontend no debe insertar eventos arbitrarios.

Toda inserción debe venir de:

- RPC,

- backend,

- automatización,

- o flujo autorizado.

**registrar_evento_timeline**

Debe:

- validar tenant,

- validar persona,

- validar origen si existe,

- construir titulo y descripcion,

- guardar snapshot en metadata,

- insertar el evento.

**ocultar_evento**

Solo permitido para:

- categoría contexto

Debe:

- poner visible=false,

- registrar ocultado_by,

- registrar ocultado_at,

- registrar motivo.

**corregir_evento**

No modifica el evento original; inserta uno nuevo de corrección.

Ejemplos:

- "Pago revertido"

- "Mensaje no enviado"

- "Nota corregida"

**15. Integración con otras entidades**

**Desde cargo**

Genera eventos como:

- cargo_creado

- cargo_liquidado

- cargo_anulado

**Desde movimiento**

Genera eventos como:

- abono_registrado

- movimiento_anulado

**Desde aplicacion_movimiento**

Genera eventos como:

- abono_aplicado

- abono_parcial

- liquidacion_parcial

**Desde envio_sugerido**

Genera eventos como:

- whatsapp_enviado

- envio_descartado

- autodescarte_envio

**Desde grupo**

Genera eventos como:

- evento_grupal

- ensayo

- juego

- reunion

**16. Consistencia crítica**

- Nunca usar el timeline como ledger.

- Nunca borrar historia financiera.

- Nunca ocultar eventos financieros.

- Nunca depender del timeline para saldos.

- Nunca romper el snapshot en metadata.

- Nunca dejar categoria libre sin catálogo.

- Nunca permitir UPDATE/DELETE operativos sin control.

- Nunca perder el contexto de un evento si cambian las tablas origen.

**17. Vista auditora relacionada**

evento_timeline no reemplaza la vista auditora financiera.

**Auditoría financiera**

Se encarga de verificar:

- conservación de masa,

- consistencia entre cargo, movimiento y aplicaciones,

- anomalías matemáticas.

**Timeline**

Se encarga de:

- contar la historia,

- dar contexto,

- y explicar al humano lo ocurrido.

**18. Escenarios de uso**

**Caso 1 --- Cobro exitoso**

Timeline muestra:

- cargo creado

- recordatorio enviado

- abono registrado

- cargo liquidado

**Caso 2 --- Reclamo del padre**

Timeline muestra:

- fecha exacta del mensaje,

- preview del texto,

- promesa previa,

- nota de contexto.

**Caso 3 --- Caso sensible**

Timeline muestra:

- observación humana,

- promesa,

- pausa de seguimiento,

- sin ensuciar el ledger.

**19. Reglas de crecimiento futuro**

Esta estructura soporta:

- portal para padres,

- auditoría avanzada,

- IA contextual,

- scoring de cobranza,

- búsquedas semánticas,

- historial omnicanal,

- y monitoreo de soporte.

Sin rediseñar el núcleo financiero.

**20. Reglas arquitectónicas congeladas**

✅ Append-only en lo sustancial\
✅ Timeline no es ledger\
✅ Snapshot en metadata\
✅ Categorías y tipos catálogados\
✅ created_by en vez de usuario_id\
✅ visible solo para contexto\
✅ Soft hide restringido\
✅ RLS obligatorio\
✅ Tenant isolation obligatorio\
✅ Frontend no inserta eventos arbitrarios\
✅ Finanzas atómicas, comunicación/sistema más desacoplables\
✅ PostgreSQL-first architecture

**21. Resumen conceptual final**

evento_timeline es la memoria operativa y relacional de SIPRA.

No administra dinero:

**administra contexto.**

Es la capa que convierte a SIPRA en:

- un sistema de cobranza,

- y al mismo tiempo,

- un asistente contextual, trazable y humano.
