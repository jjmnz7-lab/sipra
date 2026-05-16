**ESPECIFICACIÓN DE ENTIDAD: Grupo (El Organizador Táctico)**

**1. Filosofía de la Entidad**

El Grupo es una abstracción flexible (un contenedor o etiqueta) que
permite organizar a las personas según criterios operativos (ej.
\"Categoría 2015\", \"Clase de Jazz\", \"Selección Varonil\"). Su
propósito fundamental es servir como **disparador de acciones masivas**:
creación de cargos para todos los miembros o envío de mensajes grupales.
El grupo **no es dueño de la deuda**; la deuda siempre nace y muere en
la persona.

**Nombre de Tabla:** grupo

**2. Estructura de Campos (Esquema Físico)**

  ----------------------------------------------------------------------------------
  **Campo**     **Tipo**       **Reglas y          **Propósito**
                               Restricciones**     
  ------------- -------------- ------------------- ---------------------------------
  id            UUID           **PK**, DEFAULT     Identificador único del grupo.
                               gen_random_uuid()   

  academia_id   UUID           **FK, NOT NULL**    **Tenant isolation.** Límite de
                                                   seguridad multi-tenant.

  nombre        Varchar(100)   **NOT NULL**        Nombre operativo (Ej.
                                                   \"Intermedios B\").

  descripcion   Text           NULLABLE            Notas o contexto interno para el
                                                   administrador.

  estado        Varchar(20)    **NOT NULL**,       Control de visibilidad operativa.
                               DEFAULT \'activo\'  

  created_at    Timestamptz    **NOT NULL**,       Auditoría de creación.
                               DEFAULT now()       

  updated_at    Timestamptz    **NOT NULL**,       Auditoría de modificación (vía
                               DEFAULT now()       Trigger).
  ----------------------------------------------------------------------------------

**3. Restricciones a Nivel Motor (Constraints & Índices)**

- **Primary Key:** PRIMARY KEY (id)

- **Aislamiento de Nombre:** CREATE UNIQUE INDEX
  idx_grupo_nombre_unique_per_tenant ON grupo (academia_id,
  LOWER(nombre));

  - *Razón:* Evita que una misma academia tenga dos grupos llamados
    igual, pero permite que diferentes academias usen el mismo nombre.

- **Índices de Rendimiento:**

  - CREATE INDEX idx_grupo_academia ON grupo (academia_id);

  - CREATE INDEX idx_grupo_estado ON grupo (estado);

- **Reglas de Dominio (CHECKs):**

  - CHECK (estado IN (\'activo\', \'archivado\'))

  - CHECK (char_length(trim(nombre)) \> 0)

**4. Máquina de Estados (estado)**

Siguiendo la política de **Cero Delete Físico**, los grupos se gestionan
mediante visibilidad:

- **activo (Default):** El grupo es visible en los selectores de cobro
  grupal, envío de mensajes y gestión de alumnos.

- **archivado:**

  - *Efecto:* El grupo se oculta de la operación diaria (UI).

  - *Preservación:* Se mantiene toda la relación histórica de quién
    perteneció a este grupo en la tabla persona_grupo.

  - *Restricción:* No se pueden crear nuevos cargos masivos apuntando a
    un grupo archivado.

**5. Seguridad y Row Level Security (RLS)**

La seguridad se delega en las funciones guardianas centralizadas,
garantizando que el acceso sea siempre restringido al tenant activo.

- **Activación:** ALTER TABLE grupo ENABLE ROW LEVEL SECURITY;

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

**6. Regla de Oro Operativa: \"La Ilusión del Cobro Grupal\"**

Esta es la instrucción crítica para cualquier analista o IA que
desarrolle la lógica de negocio en la API (RPC o Server Action):

1.  **La Acción:** Cuando el usuario solicita un \"Cobro Grupal\" (ej.
    Cobrar \$500 al \"Grupo A\").

2.  **El Proceso:**

    - El sistema consulta los miembros del grupo que tengan estado =
      \'activo\' en la tabla persona_grupo.

    - El sistema itera sobre esa lista y ejecuta un **Batch Insert** en
      la tabla cargo.

    - Cada cargo generado es **individual e independiente**.

3.  **La Consecuencia:** Si un alumno es movido de grupo o el grupo es
    archivado después del cobro, **la deuda no se afecta**. El grupo
    solo sirvió como una herramienta de selección masiva en el momento
    de la creación.

**7. Auditoría y Trazabilidad**

- Toda modificación en el nombre o descripción del grupo debe actualizar
  el campo updated_at.

- Cualquier cambio de estado (activo -\> archivado) debe quedar
  registrado como un evento operativo en los logs del sistema, aunque no
  necesariamente en el Timeline individual de los alumnos, a menos que
  afecte su estado de pertenencia.
