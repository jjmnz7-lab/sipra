**ESPECIFICACIÓN DE ENTIDAD: AplicacionMovimiento (El Reparto /
Ledger)**

**1. Filosofía de la Entidad**

Esta tabla es el **Paso Atómico y de Trazabilidad**. Representa el acto
contable histórico de aplicar una porción de dinero existente
(Movimiento) a una deuda existente (Cargo). Una aplicación jamás crea
dinero nuevo ni deudas nuevas; solo redistribuye el saldo disponible
garantizando la **Ley de Conservación de Masa Financiera**.

**Nombre de Tabla:** aplicacion_movimiento

**2. Estructura de Campos (Esquema Físico)**

  --------------------------------------------------------------------------------------
  **Campo**         **Tipo**        **Reglas y          **Propósito**
                                    Restricciones**     
  ----------------- --------------- ------------------- --------------------------------
  id                UUID            **PK**, DEFAULT     Identificador único del acto de
                                    gen_random_uuid()   reparto.

  academia_id       UUID            **FK, NOT NULL**,   **Tenant isolation.** Límite de
                                    Indexado            seguridad.

  movimiento_id     UUID            **FK, NOT NULL**,   Origen de los fondos (De dónde
                                    Indexado            sale).

  cargo_id          UUID            **FK, NOT NULL**,   Destino financiero (Qué deuda
                                    Indexado            cubre).

  monto_aplicado    Numeric(12,2)   **NOT NULL**, \> 0  **Inmutable.** Cantidad exacta
                                                        trasladada.

  estado            Varchar(20)     **NOT NULL**,       Estado contable (aplicada,
                                    DEFAULT             revertida).
                                    \'aplicada\'        

  notas             Text            NULLABLE            Contexto operativo adicional.

  created_by        UUID            **FK, NOT NULL**    Auditoría: Usuario/sistema que
                                                        ejecutó el reparto.

  reverted_by       UUID            **FK**, NULLABLE    Auditoría: Usuario que deshizo
                                                        este reparto.

  reverted_at       Timestamptz     NULLABLE            Momento exacto en que se ejecutó
                                                        la reversión.

  reversal_reason   Text            NULLABLE            Justificación operativa de la
                                                        reversión/error.

  created_at        Timestamptz     DEFAULT now()       Timestamp exacto de la
                                                        conciliación.

  updated_at        Timestamptz     DEFAULT now()       Auditoría de registro (Trigger).
  --------------------------------------------------------------------------------------

**3. Restricciones a Nivel Motor (Constraints & Índices)**

El motor de la base de datos asegura que la \"tubería\" conecte
correctamente, pero permite flexibilidad operativa.

- **Llaves Foráneas:** Relaciones obligatorias con academia, movimiento,
  cargo y usuario.

- **Ausencia Intencional de Unique Compuesto:** Se omite explícitamente
  el UNIQUE(movimiento_id, cargo_id) para permitir *Aplicaciones
  Progresivas* (ej. usar \$100 de un saldo a favor el lunes, y otros
  \$50 del mismo saldo a favor el miércoles hacia la misma colegiatura).

- **Índices de Trazabilidad y Rendimiento:**

  - CREATE INDEX idx_app_movimiento_academia ON aplicacion_movimiento
    (academia_id);

  - CREATE INDEX idx_app_movimiento_movimiento ON aplicacion_movimiento
    (movimiento_id); *(Para saber en qué se gastó un pago).*

  - CREATE INDEX idx_app_movimiento_cargo ON aplicacion_movimiento
    (cargo_id); *(Para saber con qué pagos se cubrió una deuda).*

- **Reglas Lógicas y Matemáticas (CHECKs):**

  - CHECK (monto_aplicado \> 0) *(No existen aplicaciones en ceros o
    negativas).*

  - CHECK (estado IN (\'aplicada\', \'revertida\'))

**4. Reglas Lógicas Obligatorias (Backend / Transacciones Atómicas)**

Esta tabla **NUNCA** se manipula mediante peticiones de frontend
aisladas. Toda inserción o actualización aquí ocurre obligatoriamente
dentro de una **Transacción Atómica (ACID)** en la API de NestJS o una
RPC de Supabase, que **DEBE** incluir un bloqueo de filas (SELECT \...
FOR UPDATE) para evitar condiciones de carrera (*doble gasto*).

Antes de cualquier INSERT, la transacción debe validar:

1.  **Regla de Fondos:** monto_aplicado \<= movimiento.monto_disponible
    (No sobregirar el billete).

2.  **Regla de Deuda:** monto_aplicado \<= cargo.saldo_pendiente (No
    sobrepagar la deuda).

3.  **Aislamiento Multi-Tenant:** movimiento.academia_id ==
    cargo.academia_id (Cruzar dinero entre tenants dispara un error
    crítico).

4.  **Viabilidad de Destino:** cargo.estado_financiero != \'anulado\'

5.  **Viabilidad de Origen:** movimiento.estado != \'anulado\'

**5. Máquina de Estados y Proceso de Reversión**

Las aplicaciones no se borran físicamente (DELETE). Si hubo un error en
el reparto o el movimiento original debe anularse, la aplicación sufre
una reversión lógica y atómica:

- **Trigger del Evento:** Una petición de reversión en el Backend.

- **Mutación de la Aplicación:**

  - estado pasa a \'revertida\'.

  - reverted_by, reverted_at, y reversal_reason son obligatorios para
    cerrar la auditoría.

- **Devolución al Origen:** Sumar el monto_aplicado de vuelta al
  movimiento.monto_disponible.

- **Devolución de la Deuda:** Sumar el monto_aplicado de vuelta al
  cargo.saldo_pendiente.

- **Recálculo Colateral:** Reevaluar el estado_financiero del cargo
  (transita de liquidado de regreso a parcial o vencido según la fecha).

**6. Seguridad y Row Level Security (RLS)**

Aprovechando las funciones helper (STABLE) para mantener coherencia en
todo el modelo financiero:

- **Activación:** ALTER TABLE aplicacion_movimiento ENABLE ROW LEVEL
  SECURITY;

- **Política de Lectura (SELECT):**

> SQL
>
> USING (is_auth_user_for_tenant(academia_id));

- **Política de Escritura (INSERT, UPDATE):**

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
