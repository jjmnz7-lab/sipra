**ESPECIFICACIÓN DE ENTIDAD: Cargo (El Contenedor Vivo)**

**1. Filosofía de la Entidad**

El Cargo representa una obligación financiera individual asignada a una
persona. **No es una factura formal ni una póliza contable SAT; es un
contenedor financiero vivo.** Su regla arquitectónica fundamental es la
separación entre la verdad inmutable (monto_original) y el caché
operativo (saldo_pendiente y estado_financiero). Toda la experiencia de
SIPRA (Pendientes, Envíos, Automatización y Timeline) depende
directamente de esta entidad.

**Nombre de Tabla:** cargo

**2. Estructura de Campos (Esquema Físico)**

  ---------------------------------------------------------------------------------------
  **Campo**           **Tipo**        **Reglas y          **Propósito**
                                      Restricciones**     
  ------------------- --------------- ------------------- -------------------------------
  id                  UUID            **PK**, DEFAULT     Identificador único del cargo.
                                      gen_random_uuid()   

  academia_id         UUID            **FK, NOT NULL**    **Tenant isolation.** Límite de
                                                          seguridad.

  persona_id          UUID            **FK, NOT NULL**,   Cliente/alumno responsable del
                                      Indexado            adeudo.

  grupo_id_origen     UUID            **FK**, NULLABLE    Trazabilidad del origen grupal
                                                          (UI/Analytics).

  concepto            Varchar(150)    **NOT NULL**        Nombre operativo (Ej.
                                                          \"Mensualidad Junio\").

  descripcion         Text            NULLABLE            Contexto adicional interno.

  monto_original      Numeric(12,2)   **NOT NULL**, \> 0  **Inmutable.** Monto
                                                          inicialmente cobrado.

  saldo_pendiente     Numeric(12,2)   **NOT NULL**        **Caché Operativo.** Cuánto
                                                          falta por pagar.

  fecha_creacion      Timestamptz     **NOT NULL**,       Auditoría de creación.
                                      DEFAULT now()       

  fecha_vencimiento   Date            **NOT NULL**,       Fecha a partir de la cual se
                                      Indexado            considera vencido.

  fecha_promesa       Date            NULLABLE            **Interruptor relacional:**
                                                          Pausa automatización.

  estado_financiero   Varchar(20)     **NOT NULL**,       **Caché Derivado.** (pendiente,
                                      Indexado            vencido, etc.)

  origen              Varchar(20)     **NOT NULL**,       manual, grupal, automatico,
                                      DEFAULT \'manual\'  ajuste.

  metadata            JSONB           DEFAULT \'{}\'      Flexibilidad futura.

  created_by          UUID            **FK**, NULLABLE    Auditoría: Qué usuario (staff)
                                                          emitió el cobro.

  created_at          Timestamptz     DEFAULT now()       Auditoría de registro.

  updated_at          Timestamptz     DEFAULT now()       Última mutación de saldo o
                                                          estado (vía Trigger).
  ---------------------------------------------------------------------------------------

**3. Restricciones a Nivel Motor (Constraints & Índices)**

El motor de Postgres actúa como el auditor insobornable del sistema:

- **Primary Key & Foreign Keys:** id (PK), relaciones con academia,
  persona, grupo y usuario.

- **Índices Estratégicos (Rendimiento):**

  - CREATE INDEX idx_cargo_academia_estado ON cargo (academia_id,
    estado_financiero);

  - CREATE INDEX idx_cargo_persona ON cargo (persona_id);

  - CREATE INDEX idx_cargo_vencimiento ON cargo (academia_id,
    fecha_vencimiento);

  - CREATE INDEX idx_cargo_promesa ON cargo (academia_id,
    fecha_promesa);

  - **El Índice Operativo (Para el Cron Job y Envíos):** CREATE INDEX
    idx_cargo_operativo ON cargo (academia_id, estado_financiero,
    fecha_vencimiento);

- **Reglas Lógicas y Matemáticas (CHECKs):**

  - CHECK (monto_original \> 0) *(No existen cargos gratuitos).*

  - CHECK (saldo_pendiente \>= 0) *(Nunca permitir saldos negativos. El
    remanente vive en Movimiento).*

  - **\[CRÍTICO\]** CHECK (saldo_pendiente \<= monto_original)
    *(Protección anti-bugs: Un saldo nunca puede inflarse por encima de
    su costo original).*

  - CHECK (estado_financiero IN (\'pendiente\', \'parcial\',
    \'vencido\', \'liquidado\', \'anulado\'))

  - CHECK (origen IN (\'manual\', \'grupal\', \'automatico\',
    \'ajuste\'))

  - CHECK (char_length(trim(concepto)) \> 0)

**4. Seguridad y Row Level Security (RLS)**

Usando nuestras funciones helper centralizadas para garantizar
aislamiento y el modo \"Read-Only\" para academias morosas:

- **Activación:** ALTER TABLE cargo ENABLE ROW LEVEL SECURITY;

- **Política de Lectura (SELECT):**

> SQL
>
> USING (is_auth_user_for_tenant(academia_id));

- **Política de Mutación (INSERT, UPDATE):**

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

- **Política de Borrado (DELETE):**

> SQL
>
> USING (false); \-- Prohibido vía API pública.

**5. Máquina de Estados (estado_financiero)**

El estado **nunca** se edita manualmente en el frontend. Es el resultado
de eventos transaccionales en el backend:

  ------------------------------------------------------------
  **Evento /      **Condición Lógica**             **Nuevo
  Trigger**                                        Estado**
  --------------- -------------------------------- -----------
  **Creación**    fecha_vencimiento \>= (hoy       pendiente
                  local)                           

  **Creación**    fecha_vencimiento \< (hoy local) vencido

  **Paso del      Cargo abierto AND                vencido
  tiempo** (Cron) fecha_vencimiento \< (hoy local) 

  **Abono         saldo_pendiente \> 0 AND         parcial
  Parcial**       fecha_vencimiento \>= (hoy       
                  local)                           

  **Abono         saldo_pendiente \> 0 AND         vencido
  Parcial**       fecha_vencimiento \< (hoy local) 

  **Abono Total** saldo_pendiente = 0              liquidado

  **Anulación**   Reversión financiera completa    anulado
                  previa                           
  ------------------------------------------------------------

**6. Reglas de Negocio para la API (Backend / RPC)**

Estas son las leyes de la física que el desarrollador de NestJS / RPCs
debe obedecer:

1.  **Idempotencia de Creación:** Para proteger contra el \"doble tap\"
    en móviles con mala conexión, la RPC de crear_cargo debe verificar
    si ya existe un cargo idéntico (mismo persona_id, concepto,
    monto_original) creado en los últimos N minutos por el mismo
    usuario. Si existe, retorna el registro existente en lugar de
    duplicarlo.

2.  **La Anulación es Lógica, No Física:** Si el profesor se equivocó,
    el cargo pasa a \'anulado\'.

    - *Proceso:* El backend debe primero revertir las aplicaciones
      previas (si las hay) borrando o invalidando los registros en
      AplicacionMovimiento y devolviendo ese dinero a monto_disponible
      en la tabla Movimiento. Una vez que el saldo_pendiente vuelve a
      ser igual al monto_original, se fuerza a 0 y el estado pasa a
      \'anulado\'.

3.  **Comportamiento del Interruptor fecha_promesa:** Actualizar esta
    fecha genera un evento en el Timeline, pero **NO altera la
    matemática ni el estado financiero del cargo**. Su único propósito
    es indicarle al *Cron Job* nocturno que no genere una sugerencia de
    WhatsApp para este cargo si fecha_promesa \> HOY.

4.  **Transaccionalidad Estricta:** Cualquier actualización a
    saldo_pendiente y estado_financiero derivada de un pago debe ocurrir
    dentro de una misma transacción atómica (usando BEGIN, COMMIT y
    bloqueo de filas FOR UPDATE).
