**ESPECIFICACIÓN DE ENTIDAD: Movimiento (Entrada de Dinero)**

**1. Filosofía de la Entidad**

El Movimiento es el registro inmutable de una entrada real de capital.
Representa el **\"Hecho Monetario\"**. Su propósito es capturar el valor
físico/digital recibido *antes* de decidir cómo se va a repartir. La
dualidad entre el dinero que entró (monto_total) y la bolsa de dinero
que sobra (monto_disponible) es el diseño nativo que permite gestionar
pagos parciales y saldos a favor de forma elegante.

**Nombre de Tabla:** movimiento

**2. Estructura de Campos (Esquema Físico)**

  ---------------------------------------------------------------------------------------
  **Campo**          **Tipo**        **Reglas y          **Propósito**
                                     Restricciones**     
  ------------------ --------------- ------------------- --------------------------------
  id                 UUID            **PK**, DEFAULT     Identificador único del
                                     gen_random_uuid()   movimiento.

  academia_id        UUID            **FK, NOT NULL**    **Tenant isolation.** Límite de
                                                         seguridad.

  persona_id         UUID            **FK, NOT NULL**,   Persona responsable de entregar
                                     Indexado            el dinero.

  monto_total        Numeric(12,2)   **NOT NULL**, \> 0  **Inmutable.** Dinero real
                                                         recibido en la transacción.

  monto_disponible   Numeric(12,2)   **NOT NULL**        **Caché Operativo.** Saldo
                                                         remanente aún no aplicado.

  fecha_pago         Timestamptz     **NOT NULL**,       **Orden cronológico real** para
                                     DEFAULT now()       el Timeline y auditoría.

  metodo_pago        Varchar(30)     **NOT NULL**        Catálogo cerrado para evitar
                                                         basura en reportes.

  referencia         Varchar(100)    NULLABLE            Folio, ID de transferencia o
                                                         nota de quien recibe.

  estado             Varchar(20)     **NOT NULL**,       Estado contable del hecho
                                     DEFAULT             monetario.
                                     \'registrado\'      

  idempotency_key    Varchar(100)    **NOT NULL**,       Protección estricta contra
                                     Indexado            duplicados (doble tap).

  created_by         UUID            **FK, NOT NULL**    Auditoría: Usuario (o sistema)
                                                         que capturó el pago.

  anulado_by         UUID            **FK**, NULLABLE    Auditoría: Usuario que ejecutó
                                                         la reversión.

  anulado_motivo     Text            NULLABLE            Justificación operativa del
                                                         error.

  created_at         Timestamptz     DEFAULT now()       Auditoría de creación en base de
                                                         datos.

  updated_at         Timestamptz     DEFAULT now()       Auditoría de modificación
                                                         (Actualizado por Trigger).
  ---------------------------------------------------------------------------------------

**3. Restricciones a Nivel Motor (Constraints & Índices)**

Postgres es el guardián de la integridad de los datos financieros:

- **Llave Primaria y Foráneas:** id (PK), relaciones estrictas con
  academia, persona y usuario.

- **Protección Idempotente Multi-Tenant:** UNIQUE (academia_id,
  idempotency_key)

  - *Razón:* Evita colisiones si por milagro dos academias generan el
    mismo hash, y asegura que un cliente móvil no pueda registrar dos
    veces el mismo pago por mala conexión.

- **Índices de Rendimiento:**

  - CREATE INDEX idx_movimiento_academia_persona ON movimiento
    (academia_id, persona_id);

  - CREATE INDEX idx_movimiento_fecha ON movimiento (academia_id,
    fecha_pago);

- **Reglas Lógicas y Matemáticas (CHECKs):**

  - CHECK (monto_total \> 0) *(No existen pagos gratuitos o negativos).*

  - CHECK (monto_disponible \>= 0) *(El saldo a favor nunca puede ser
    menor a 0).*

  - **\[CRÍTICO\]** CHECK (monto_disponible \<= monto_total) *(No puedes
    aplicar menos de lo que entró, ni inventar dinero de la nada).*

  - CHECK (estado IN (\'registrado\', \'anulado\'))

  - CHECK (metodo_pago IN (\'efectivo\', \'transferencia\', \'tarjeta\',
    \'deposito\', \'otro\'))

**4. Seguridad y Row Level Security (RLS)**

Aprovechando nuestras funciones *helper* (STABLE) para un RLS rápido y
seguro:

- **Activación:** ALTER TABLE movimiento ENABLE ROW LEVEL SECURITY;

- **Política de Lectura (SELECT):**

> SQL
>
> USING (is_auth_user_for_tenant(academia_id));

- **Política de Escritura / Mutación (INSERT, UPDATE):**

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
> USING (false); \-- Borrado físico estrictamente prohibido.

**5. Reglas Arquitectónicas y Flujos RPC (Backend)**

Estas son las instrucciones de dominio inquebrantables para quien
programe la API en NestJS:

1.  **Idempotencia Dura:** La API debe requerir un UUID o hash único
    generado desde el Frontend (idempotency_key) en el payload de
    creación. Si ocurre un conflicto de unicidad en BD, la API retorna
    un 200 OK (silencioso) o devuelve el registro original, pero **nunca
    suma el dinero dos veces**.

2.  **Inmutabilidad del Monto Total:** Una vez hecho el INSERT, el campo
    monto_total queda bloqueado por dominio. Si la secretaria capturó
    \$1,000 en lugar de \$10,000, no se edita la fila. Se anula por
    completo y se genera una nueva.

3.  **El Saldo a Favor Natural:** Si la API reparte el dinero en varios
    cargos y al final la resta deja monto_disponible \> 0, el backend
    simplemente termina la transacción. Ese dinero \"sobrante\"
    permanece ahí y el Frontend lo consultará para ofrecerlo como método
    de pago en futuras deudas.

4.  **Anulación por Reversión Atómica:** Un movimiento SÍ puede anularse
    aunque ya se haya gastado, siempre y cuando el backend logre
    ejecutar esta transacción atómica:

    - *Paso A:* Buscar todas las AplicacionMovimiento activas vinculadas
      a este movimiento.id.

    - *Paso B:* Revertir los montos (sumar el dinero de vuelta al
      saldo_pendiente de sus respectivos cargos y recalcular el
      estado_financiero de dichos cargos).

    - *Paso C:* Marcar las AplicacionMovimiento como revertidas.

    - *Paso D:* Fijar monto_disponible = 0 y estado = \'anulado\' en el
      Movimiento.

    - *Paso E:* Generar el registro en el Timeline.

    - *Si algún cargo ya no existe o la matemática falla, se hace
      ROLLBACK completo de la transacción.*
