**ESPECIFICACIÓN DE ENTIDAD: persona (El Sujeto Operativo)**

**1. Filosofía de la Entidad**

La persona es la unidad base de contacto, cobranza y trazabilidad. En
esta V1, SIPRA no modela árboles genealógicos complejos; modela al
**\"Responsable Operativo\"**. Si un tutor tiene tres hijos en la
academia, existirán tres registros de persona distintos (mismo contacto,
diferente referencia). Esto garantiza que cada alumno tenga su propio
Ledger financiero y su propio Timeline de forma aislada, manteniendo el
sistema rápido y predecible.

**Nombre de Tabla:** persona

**2. Estructura de Campos (Esquema Físico)**

  ----------------------------------------------------------------------------------------------
  **Campo**                   **Tipo**       **Reglas y          **Propósito**
                                             Restricciones**     
  --------------------------- -------------- ------------------- -------------------------------
  id                          UUID           **PK**, DEFAULT     Identificador único.
                                             gen_random_uuid()   

  academia_id                 UUID           **FK, NOT NULL**,   **Tenant isolation.**
                                             Indexado            

  nombre_contacto             Varchar(150)   **NOT NULL**        El tutor o quien paga (Dueño
                                                                 del WhatsApp).

  nombre_referencia           Varchar(150)   **NOT NULL**        El alumno que recibe el
                                                                 servicio.

  telefono_whatsapp           Varchar(20)    NULLABLE, Indexado  Canal de comunicación.
                                                                 **Siempre normalizado
                                                                 (E.164)**.

  email                       Varchar(150)   NULLABLE            Contacto secundario o para
                                                                 futuras facturas.

  estado_global               Varchar(20)    **NOT NULL**,       **Caché Operativo:** vencido,
                                             DEFAULT             pausado, pendiente,
                                             \'al_corriente\'    al_corriente.

  estado_registro             Varchar(20)    **NOT NULL**,       Ciclo de vida: activo,
                                             DEFAULT \'activo\'  inactivo, archivado.

  notas_snapshot              Varchar(255)   NULLABLE            Contexto breve visible en
                                                                 listas (Ej. \"Familia
                                                                 becada\").

  etiqueta                    Varchar(50)    NULLABLE            Organización visual/UX (Ej.
                                                                 \"Equipo representativo\").

  search_text                 Text           NULLABLE            **Campo Denormalizado** para
                                                                 búsquedas ultrarrápidas GIN.

  metadata                    JSONB          **NOT NULL**,       Datos no transaccionales (fecha
                                             DEFAULT \'{}\'      de nacimiento, talla,
                                                                 alergias).

  **ultima_interaccion_at**   Timestamptz    NULLABLE            Actualizado **explícitamente**
                                                                 solo por acciones humanas.

  created_at                  Timestamptz    DEFAULT now()       Auditoría de creación.

  updated_at                  Timestamptz    DEFAULT now()       Auditoría (Actualizado por
                                                                 Trigger).
  ----------------------------------------------------------------------------------------------

**3. Estrategia de Rendimiento: search_text y GIN Index**

Para que la búsqueda desde la aplicación móvil sea instantánea sin
saturar el CPU con múltiples sentencias LIKE o expresiones regulares, se
utiliza un campo concatenado.

- **Construcción en BD (Vía Trigger simple BEFORE INSERT/UPDATE):**

> Se concatena en minúsculas y sin acentos: nombre_contacto +
> nombre_referencia + telefono_whatsapp.
>
> *(Ejemplo: \"maria lopez carlitos 526691234567\")*

- **Indexación:**

> SQL
>
> CREATE EXTENSION IF NOT EXISTS pg_trgm;
>
> CREATE INDEX idx_persona_search_trgm ON persona USING gin (search_text
> gin_trgm_ops);

**4. Restricciones a Nivel Motor (Constraints & Índices)**

- **Índices Operativos:**

  - CREATE INDEX idx_persona_estado ON persona (academia_id,
    estado_global); *(Para tableros y KPIs rápidos).*

  - CREATE INDEX idx_persona_whatsapp ON persona (academia_id,
    telefono_whatsapp);

- **Reglas Lógicas y de Dominio (CHECKs):**

  - CHECK (estado_global IN (\'al_corriente\', \'pendiente\',
    \'vencido\', \'pausado\', \'archivado\'))

  - CHECK (estado_registro IN (\'activo\', \'inactivo\', \'archivado\'))

  - CHECK (char_length(trim(nombre_contacto)) \> 0 AND
    char_length(trim(nombre_referencia)) \> 0)

- **Permisividad de Diseño:**

  - **NO EXISTE** restricción UNIQUE para el teléfono. Se permite
    duplicidad por diseño para el manejo de hermanos.

**5. Reglas Arquitectónicas Congeladas (Backend / RPC)**

**Regla 1: Higiene de Contacto (E.164)**

El frontend puede permitir al usuario capturar \"sucio\" (ej. (669)
123-4567), pero el backend o la función RPC **debe** aplicar una
sanitización obligatoria (solo números y código de país) antes de
guardar. Un registro sin teléfono es válido, pero el sistema de
envio_sugerido lo ignorará por completo.

**Regla 2: La Dominancia del Estado Global**

El campo estado_global es un caché de lectura. Su recálculo ocurre vía
RPC/Edge Function cada vez que el Ledger sufre una mutación, siguiendo
estrictamente este orden de prioridad:

1.  **vencido**: Gana sobre todo. (Debe algo cuya fecha de vencimiento
    ya pasó).

2.  **pausado**: (Deuda activa, pero amparada por una fecha_promesa
    futura).

3.  **pendiente**: (Debe dinero, pero aún está a tiempo de pagar).

4.  **al_corriente**: (Saldo pendiente total = \$0).

**Regla 3: Protección contra \"Write Amplification\"**

El campo ultima_interaccion_at **NO se actualiza mediante triggers
universales**. Solo debe ser actualizado de manera explícita por el
backend cuando ocurre una interacción humana significativa (ej. el
profesor registra un pago manual, envía un mensaje de WhatsApp o deja
una nota operativa). Las validaciones del sistema o las acciones de los
*workers* nocturnos lo ignoran para evitar bloqueos de fila (row locks).

**6. Seguridad y Row Level Security (RLS)**

Aprovechando las funciones helper del JWT:

- **Activación:** ALTER TABLE persona ENABLE ROW LEVEL SECURITY;

- **Lectura (SELECT):**

> SQL
>
> USING (is_auth_user_for_tenant(academia_id));

- **Escritura (INSERT, UPDATE):**

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

- **Borrado Físico (DELETE):**

> SQL
>
> USING (false);
>
> *Cualquier baja se gestiona cambiando estado_registro a \'archivado\'.
> El registro, sus finanzas y su historia le pertenecen al sistema a
> perpetuidad.*
