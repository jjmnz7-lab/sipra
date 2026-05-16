**ESPECIFICACIÓN DE ENTIDAD: usuario (El Puente de Identidad)**

**1. Filosofía de la Entidad**

El usuario representa al **operador humano autenticado** (Staff) dentro
de una academia. SIPRA delega la gestión de credenciales, contraseñas y
sesiones a **Supabase Auth** (auth.users), mientras que la tabla
public.usuario gestiona la jerarquía operativa (rol), la pertenencia al
tenant (academia_id) y la auditoría de acciones. El diseño es
estrictamente B2B: los usuarios no se registran libremente, son
invitados a un tenant específico.

**Nombre de Tabla:** usuario

**2. Estructura de Campos (Esquema Físico)**

  ----------------------------------------------------------------------------------------
  **Campo**              **Tipo**       **Reglas y         **Propósito**
                                        Restricciones**    
  ---------------------- -------------- ------------------ -------------------------------
  **id**                 UUID           **PK**, FK         Identidad 1:1 con el proveedor
                                        auth.users(id)     de Auth.

  **academia_id**        UUID           FK, **NOT NULL**,  **Tenant isolation.** Límite de
                                        Indexado           seguridad.

  **nombre**             Varchar(100)   **NOT NULL**       Nombre operativo para auditoría
                                                           y UX.

  **apellido**           Varchar(100)   NULLABLE           Apellidos para listados
                                                           internos.

  **email**              Varchar(150)   **NOT NULL**,      **Snapshot** del email de Auth
                                        Indexado           (Desacoplamiento).

  **rol**                Varchar(20)    **NOT NULL**,      RBAC: owner, admin, staff.
                                        DEFAULT \'staff\'  

  **estado**             Varchar(20)    **NOT NULL**,      invitado, activo, suspendido,
                                        DEFAULT            archivado.
                                        \'invitado\'       

  **metadata**           JSONB          **NOT NULL**,      Preferencias UI y overrides de
                                        DEFAULT \'{}\'     permisos.

  **ultimo_acceso_at**   Timestamptz    NULLABLE           Actualizado **solo** en login o
                                                           refresh de sesión.

  **invitado_por**       UUID           FK usuario.id,     Trazabilidad del onboarding
                                        NULLABLE           interno.

  **created_at**         Timestamptz    DEFAULT now()      Auditoría de creación.

  **updated_at**         Timestamptz    DEFAULT now()      Auditoría de actualización.
  ----------------------------------------------------------------------------------------

**3. Jerarquía de Roles y Seguridad (RBAC)**

El sistema utiliza un modelo de **Seguridad en la Base de Datos
(Zero-Trust)**. El frontend solo refleja lo que el motor de base de
datos permite.

- **owner**: Único rol con control total sobre la configuración de la
  academia, gestión de usuarios y acceso a la suscripción de SIPRA.

- **admin**: Coordinador con permisos para gestionar alumnos, grupos,
  finanzas y automatización. No puede degradar al owner.

- **staff**: Operador básico para registro de pagos y comunicación. No
  puede realizar anulaciones financieras ni cambios en la configuración.

**Estrategia de JWT Claims**

Para maximizar el rendimiento del **RLS (Row Level Security)**, el
academia_id y el rol deben inyectarse en los metadatos del token de
Supabase (app_metadata). Esto permite validaciones instantáneas sin
realizar JOINs adicionales.

**4. Restricciones a Nivel Motor (Constraints & Índices)**

- **Regla del \"Dueño Único\" (Blindaje Operativo):**

> Garantiza que no existan ambigüedades de autoridad en la academia.
>
> SQL
>
> CREATE UNIQUE INDEX uq_owner_activo
>
> ON usuario (academia_id)
>
> WHERE rol = \'owner\' AND estado = \'activo\';

- **Regla del \"Último Superviviente\":**

> El sistema rechazará (vía Trigger o RPC) cualquier actualización que
> intente suspender, archivar o degradar al último owner activo de una
> academia para evitar cuentas huérfanas.

- **Índices de Lectura:**

  - CREATE INDEX idx_usuario_tenant_lookup ON usuario (academia_id, rol,
    estado);

- **Reglas Lógicas (CHECKs):**

  - CHECK (rol IN (\'owner\', \'admin\', \'staff\'))

  - CHECK (estado IN (\'invitado\', \'activo\', \'suspendido\',
    \'archivado\'))

**5. Flujo de Onboarding y Sincronización (Atomicidad)**

Para evitar usuarios \"huérfanos\" o inconsistencias multi-tenant, se
sigue un flujo de invitación estricto:

1.  **Invitación:** Un owner o admin invita a un nuevo miembro mediante
    el Backend.

2.  **Inyección de Metadatos:** Se llama a la API de Supabase
    inviteUserByEmail pasando el academia_id y el rol dentro de data.

3.  **Trigger de Sincronización:** Un trigger AFTER INSERT en la tabla
    auth.users lee los metadatos e inserta automáticamente la fila en
    public.usuario.

    - Esto garantiza que el perfil operativo nazca vinculado al tenant
      correcto desde el primer segundo.

4.  **Activación:** El estado pasa de invitado a activo cuando el
    usuario completa su primer inicio de sesión.

**6. Políticas de RLS (Resumen)**

- **Lectura (SELECT):** Permitida para cualquier usuario autenticado
  cuyo academia_id coincida con el del registro.

- **Escritura (INSERT, UPDATE):**

  - Solo owner y admin pueden crear o modificar otros usuarios.

  - Un usuario puede editar su propio nombre y metadata.

- **Borrado Físico (DELETE):** **PROHIBIDO** (USING false). Las bajas
  son lógicas (archivado) para preservar el rastro de created_by en todo
  el Ledger.
