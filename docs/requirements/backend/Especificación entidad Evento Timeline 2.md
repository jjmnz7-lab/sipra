**ESPECIFICACIÓN DE ENTIDAD: evento_timeline (La Memoria Histórica)**

**1. Filosofía de la Entidad**

El evento_timeline NO es el ledger financiero ni calcula dinero; es la
**Caja Negra y narrativa histórica** de SIPRA. Es una tabla
*Append-Only* diseñada para lectura humana rápida. Su propósito
principal es dotar al profesor del contexto exacto de cobranza,
reduciendo la fricción social y eliminando el *\"usted no me avisó\"*.

**Nombre de Tabla:** evento_timeline

**2. Estructura de Campos (Esquema Físico)**

  -----------------------------------------------------------------------------------------
  **Campo**          **Tipo**       **Reglas y          **Propósito**
                                    Restricciones**     
  ------------------ -------------- ------------------- -----------------------------------
  id                 UUID           **PK**, DEFAULT     Identificador único del evento.
                                    gen_random_uuid()   

  academia_id        UUID           **FK, NOT NULL**,   **Tenant isolation.** Límite de
                                    Indexado            seguridad.

  persona_id         UUID           **FK, NOT NULL**,   Dueño de la narrativa
                                    Indexado            (Alumno/Tutor).

  categoria          Varchar(30)    **NOT NULL**        Taxonomía principal (financiero,
                                                        comunicacion, etc.).

  tipo_evento        Varchar(50)    **NOT NULL**        Evento específico (ej.
                                                        abono_aplicado,
                                                        recordatorio_enviado).

  titulo             Varchar(200)   **NOT NULL**        Resumen pre-masticado para lectura
                                                        rápida UI.

  cuerpo             Text           NULLABLE            Detalle largo, log de envío o
                                                        mensaje enviado.

  metadata           JSONB          **NOT NULL**,       **Snapshot Defensivo:** Variables
                                    DEFAULT \'{}\'      nominales del momento histórico.

  origen_entidad     Varchar(50)    NULLABLE            Entidad que disparó el evento (ej.
                                                        cargo, movimiento).

  origen_id          UUID           NULLABLE            ID de la entidad origen para
                                                        trazabilidad.

  prioridad_visual   Varchar(20)    **DEFAULT           Renderizado UI (baja, normal, alta,
                                    \'normal\'**        critica).

  visible            Boolean        **DEFAULT true**    Control de visibilidad (Soft Hide).

  created_by         UUID           **FK**, NULLABLE    Autoría: Quién lo generó (Null =
                                                        Automático/Sistema).

  hidden_by          UUID           **FK**, NULLABLE    Auditoría: Quién ocultó el evento.

  hidden_at          Timestamptz    NULLABLE            Auditoría: Cuándo se ocultó.

  fecha_evento       Timestamptz    **NOT NULL**,       **Fecha semántica:** Cuándo pasó
                                    DEFAULT now()       realmente en el dominio.

  created_at         Timestamptz    DEFAULT now()       Auditoría de inserción en BD.

  updated_at         Timestamptz    DEFAULT now()       Auditoría (solo útil si cambia
                                                        visibilidad).
  -----------------------------------------------------------------------------------------

**3. Taxonomía Estricta (Categorías Válidas)**

- **financiero**: Cargos creados, abonos aplicados, liquidaciones,
  anulaciones, ajustes administrativos.

- **comunicacion**: Salida de WhatsApp, recordatorios
  generados/descartados.

- **acuerdo**: Promesas de pago, prórrogas, pausas de seguimiento.

- **operativo**: Asistencias, ensayos, cambios de grupo.

- **contexto**: Notas humanas, casos sensibles o comentarios privados
  del staff.

- **sistema**: Automatizaciones invisibles, recálculos.

**4. Restricciones a Nivel Motor (Constraints & Índices)**

- **Índices de Rendimiento UI (Vitales):**

  - CREATE INDEX idx_timeline_persona_fecha ON evento_timeline
    (academia_id, persona_id, fecha_evento DESC); *(El motor de la
    pantalla \"Seguimiento\").*

  - CREATE INDEX idx_timeline_categoria ON evento_timeline (academia_id,
    categoria, fecha_evento DESC);

  - CREATE INDEX idx_timeline_origen ON evento_timeline (academia_id,
    origen_entidad, origen_id);

- **Reglas Lógicas y Semánticas (CHECKs):**

  - CHECK (categoria IN (\'financiero\', \'comunicacion\', \'acuerdo\',
    \'operativo\', \'contexto\', \'sistema\'))

  - CHECK (prioridad_visual IN (\'baja\', \'normal\', \'alta\',
    \'critica\'))

  - CHECK (origen_entidad IN (\'cargo\', \'movimiento\',
    \'aplicacion_movimiento\', \'envio_sugerido\', \'grupo\',
    \'persona\', \'sistema\') OR origen_entidad IS NULL)

  - CHECK (char_length(trim(titulo)) \> 0)

**5. Reglas Arquitectónicas y Lógicas (Backend / RPC)**

Estas leyes rigen la programación de la API y no pueden romperse bajo
ninguna circunstancia:

**Regla 1: El Snapshot Defensivo (metadata)**

El objeto metadata **debe almacenar los datos nominales renderizados**,
no solo identificadores.

- *Motivo:* Si un cargo cambia de nombre o se anula el año que viene, el
  Timeline debe preservar la historia intacta.

- *Ejemplo de Payload:* {\"monto_abono\": 500, \"concepto_cargo\":
  \"Uniforme\", \"saldo_restante_historico\": 200, \"metodo_pago\":
  \"transferencia\"}. El frontend lee directamente de aquí, sin hacer
  JOINs.

**Regla 2: Soft Hide Restringido (El Triángulo de Auditoría)**

Ocultar historia financiera es un vector de fraude. El Backend **debe
rechazar** cualquier intento de actualización de visible = false a menos
que se cumplan estas condiciones:

- categoria == \'contexto\' (Solo las notas manuales o privadas se
  pueden ocultar).

- Se inyecte obligatoriamente el hidden_by (UUID del usuario que ejecuta
  la acción) y el hidden_at (now()).

**Regla 3: Jerarquía de Inserción (Atómico vs. Asíncrono)**

- **Eventos Críticos (financiero, acuerdo):** Se insertan
  obligatoriamente en la **misma transacción atómica** de base de datos
  que el movimiento de dinero o la mutación de la deuda. Si el evento no
  se puede escribir, la transacción entera hace ROLLBACK.

- **Eventos Secundarios (comunicacion, sistema):** Pueden insertarse de
  forma asíncrona o mediante un worker secundario (ej. un webhook que
  avisa que WhatsApp entregó el mensaje).

**Regla 4: Append-Only Estricto**

Los eventos **NO se sobrescriben** operativamente ni se eliminan (DELETE
prohibido). Si ocurre un error, se inserta un nuevo evento compensatorio
(ej. ajuste_administrativo o anulacion).

**6. Seguridad y Row Level Security (RLS)**

- **Política de Lectura (SELECT):**

> SQL
>
> USING (is_auth_user_for_tenant(academia_id));

- **Política de Escritura (INSERT):**

> SQL
>
> WITH CHECK (
>
> is_auth_user_for_tenant(academia_id)
>
> AND
>
> can_write_to_academia(academia_id)
>
> );

- **Política de Modificación (UPDATE):**

> SQL
>
> \-- SOLO permitido para ocultar notas de contexto.
>
> WITH CHECK (
>
> categoria = \'contexto\'
>
> AND is_auth_user_for_tenant(academia_id)
>
> );

- **Política de Borrado (DELETE):** USING (false);
