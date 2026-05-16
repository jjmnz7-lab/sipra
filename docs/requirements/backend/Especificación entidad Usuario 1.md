**ESPECIFICACIÓN COMPLETA Y ACTUALIZADA --- ENTIDAD: usuario**

**1. Filosofía de la Entidad**

La entidad usuario representa:

**al operador autenticado del sistema SIPRA.**

Es decir:

- dueños,

- administradores,

- asistentes,

- cajeros,

- profesores,

- staff operativo.

**NO representa**

❌ alumnos\
❌ tutores\
❌ clientes

Eso pertenece exclusivamente a:

persona

**Objetivo arquitectónico**

usuario existe para:

✅ Role-Based Access Control (RBAC)\
✅ auditoría operativa\
✅ ownership del tenant\
✅ trazabilidad de acciones\
✅ integración con JWT/RLS\
✅ seguridad multitenant\
✅ control operacional

**2. Arquitectura de Identidad (MUY IMPORTANTE)**

SIPRA utiliza:

Supabase Auth

como proveedor oficial de autenticación.

**Separación oficial**

  --------------------------------------
  **Capa**         **Responsabilidad**
  ---------------- ---------------------
  auth.users       autenticación real

  public.usuario   autorización y
                   operación
  --------------------------------------

**auth.users maneja**

✅ passwords\
✅ sesiones\
✅ refresh tokens\
✅ OAuth\
✅ MFA\
✅ identities

**public.usuario maneja**

✅ roles\
✅ tenant\
✅ estado operativo\
✅ auditoría\
✅ ownership\
✅ permisos de negocio

**3. Nombre Físico de Tabla**

usuario

**4. Estructura de Campos (Esquema Físico)**

  --------------------------------------------------------------------------
  **Campo**          **Tipo**       **Reglas y          **Propósito**
                                    Restricciones**     
  ------------------ -------------- ------------------- --------------------
  id                 UUID           PK, FK →            Identidad
                                    auth.users.id       autenticada

  academia_id        UUID           FK, NOT NULL, INDEX Tenant isolation

  nombre             VARCHAR(100)   NOT NULL            Nombre operativo

  apellido           VARCHAR(100)   NULLABLE            Ordenamiento y
                                                        visualización

  email_snapshot     VARCHAR(150)   NOT NULL            Snapshot operacional
                                                        del email

  telefono           VARCHAR(20)    NULLABLE            Contacto interno

  rol                VARCHAR(20)    NOT NULL DEFAULT    RBAC
                                    \'staff\'           

  estado             VARCHAR(20)    NOT NULL DEFAULT    Estado operativo
                                    \'invitado\'        

  metadata           JSONB          NOT NULL DEFAULT    Preferencias
                                    \'{}\'              extensibles

  ultimo_acceso_at   TIMESTAMPTZ    NULLABLE            Observabilidad

  invitado_por       UUID           FK usuario.id,      Auditoría onboarding
                                    NULLABLE            

  created_at         TIMESTAMPTZ    NOT NULL DEFAULT    Auditoría
                                    now()               

  updated_at         TIMESTAMPTZ    NOT NULL DEFAULT    Auditoría
                                    now()               
  --------------------------------------------------------------------------

**5. Relaciones Oficiales**

  ----------------------------------------
  **Relación**          **Cardinalidad**
  --------------------- ------------------
  academia → usuario    1:N

  usuario → usuario     1:N
  (invitado_por)        

  auth.users → usuario  1:1
  ----------------------------------------

**6. Filosofía del id**

id UUID PRIMARY KEY\
REFERENCES auth.users(id)\
ON DELETE RESTRICT

**Regla congelada**

El UUID:

**NO se genera en SIPRA.**

Debe reutilizar:

auth.users.id

**Beneficios**

✅ identidad consistente\
✅ JWT limpio\
✅ menos joins\
✅ menos sincronización\
✅ menos race conditions\
✅ RLS más rápido

**7. Roles Oficiales V1 (RBAC)**

  ---------------------------
  **Rol**   **Descripción**
  --------- -----------------
  owner     Dueño del tenant

  admin     Operación
            administrativa

  staff     Operación
            limitada
  ---------------------------

**owner**

Puede:

- gestionar usuarios,

- configuración,

- facturación,

- exportaciones,

- automatizaciones.

**admin**

Puede:

- personas,

- grupos,

- cargos,

- movimientos,

- envíos.

NO puede:

- eliminar owner,

- facturación SaaS,

- ownership tenant.

**staff**

Puede:

- registrar pagos,

- consultar timelines,

- enviar WhatsApps,

- operar parcialmente.

NO puede:

- anular movimientos,

- modificar configuración crítica,

- gestionar usuarios.

**8. Estados Oficiales**

  ------------------------------
  **Estado**   **Significado**
  ------------ -----------------
  invitado     Aún no acepta
               acceso

  activo       Operación normal

  suspendido   Bloqueo temporal

  archivado    Baja lógica
               definitiva
  ------------------------------

**Filosofía**

Nunca:

DELETE físico

**9. Restricciones a Nivel Motor (CHECK Constraints)**

**Rol válido**

CHECK (\
rol IN (\
\'owner\',\
\'admin\',\
\'staff\'\
)\
)

**Estado válido**

CHECK (\
estado IN (\
\'invitado\',\
\'activo\',\
\'suspendido\',\
\'archivado\'\
)\
)

**Nombre válido**

CHECK (\
char_length(trim(nombre)) \> 0\
)

**Email válido básico**

CHECK (\
position(\'@\' in email_snapshot) \> 1\
)

**10. Restricciones Operativas Críticas**

**Regla 1 --- Owner único activo por tenant**

En V1:

**solo puede existir UN owner activo por academia.**

**Implementación sugerida**

CREATE UNIQUE INDEX uq_owner_activo\
ON usuario (academia_id)\
WHERE (\
rol = \'owner\'\
AND estado = \'activo\'\
);

**Regla 2 --- Nunca dejar tenant sin owner**

El backend/RPC debe rechazar:

❌ downgrade owner → admin\
❌ suspender owner\
❌ archivar owner

SI:

es el último owner activo

**Regla 3 --- Usuarios archivados no autentican**

Aunque exista:

auth.users

el backend debe bloquear operación si:

usuario.estado != \'activo\'

**11. Índices Recomendados**

**Tenant lookup**

CREATE INDEX idx_usuario_academia\
ON usuario (\
academia_id,\
estado\
);

**Roles**

CREATE INDEX idx_usuario_roles\
ON usuario (\
academia_id,\
rol\
);

**Email snapshot**

CREATE INDEX idx_usuario_email\
ON usuario (\
email_snapshot\
);

**Último acceso**

CREATE INDEX idx_usuario_last_access\
ON usuario (\
academia_id,\
ultimo_acceso_at DESC\
);

**12. Seguridad y RLS**

**Activación**

ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;

**SELECT**

USING (\
is_auth_user_for_tenant(academia_id)\
)

**INSERT / UPDATE**

WITH CHECK (\
is_auth_user_for_tenant(academia_id)\
AND can_write_to_academia(academia_id)\
)

**DELETE**

USING (false)

**Regla importante**

La lógica fina de permisos:

**NO debe vivir solo en RLS.**

Debe reforzarse en:

- RPC,

- backend,

- services.

**Ejemplo**

La RPC:

anular_movimiento()

debe validar:

rol IN (\'owner\',\'admin\')

**13. JWT Claims Oficiales**

**Objetivo**

Evitar joins constantes hacia:

public.usuario

durante RLS.

**Claims requeridos**

{\
\"app_metadata\": {\
\"academia_id\": \"uuid\",\
\"rol\": \"admin\"\
}\
}

**Beneficios**

✅ RLS ultrarrápido\
✅ menos queries\
✅ menos latencia\
✅ menos complejidad

**14. Flujo Oficial de Invitación (Congelado)**

**PASO 1**

Owner/Admin ejecuta:

supabase.auth.admin.inviteUserByEmail()

incluyendo:

{\
\"academia_id\": \"\...\",\
\"rol\": \"staff\"\
}

en:

app_metadata

**PASO 2**

Supabase:

- crea auth.users,

- envía invitación,

- genera identity.

**PASO 3**

Trigger PostgreSQL:

AFTER INSERT ON auth.users

crea automáticamente:

public.usuario

**PASO 4**

Usuario acepta invitación.

**PASO 5**

Sistema actualiza:

estado = \'activo\'

**15. Trigger Recomendado**

**updated_at automático**

BEFORE UPDATE\
SET updated_at = now()

**16. Observabilidad**

**ultimo_acceso_at**

NO debe actualizarse:

- en cada request,

- polling,

- fetch.

**Solo actualizar en:**

✅ login\
✅ refresh importante\
✅ acción significativa

**17. Integración con el Ecosistema**

**Timeline**

Todas las acciones humanas deben poder snapshotear:

{\
\"usuario_nombre\": \"Juan Pérez\",\
\"usuario_rol\": \"admin\"\
}

**Auditoría**

Todas las tablas operativas deben soportar:

created_by\
updated_by\
revertido_by

referenciando:

usuario.id

**Academia suspendida**

Si:

academia.estado = \'suspendido\'

entonces:

**incluso owner entra en modo read-only.**

**18. Metadata JSONB (Uso Oficial)**

**Permitido**

✅ avatar\
✅ preferencias UI\
✅ dark mode\
✅ idioma\
✅ flags experimentales

**NO permitido**

❌ permisos críticos\
❌ seguridad\
❌ tenant\
❌ ownership

Eso debe vivir en columnas físicas.

**19. Reglas Arquitectónicas Congeladas**

**Regla 1**

Usuario ≠ Persona.

**Regla 2**

Passwords jamás viven en SIPRA.

**Regla 3**

JWT debe contener:

- tenant,

- rol.

**Regla 4**

Nunca DELETE físico.

**Regla 5**

Siempre debe existir:

1 owner activo

**Regla 6**

Frontend NO es seguridad.

**Regla 7**

RLS protege tenant.\
RPC protege reglas de negocio.

**20. Estado de Madurez Arquitectónica**

Con esta entidad:

**la capa completa de identidad, autorización y ownership SaaS de SIPRA
queda consolidada.**

Ya existe:

✅ multitenancy seguro\
✅ separación Auth/Dominio\
✅ RBAC V1\
✅ ownership tenant\
✅ JWT optimizado\
✅ RLS performante\
✅ auditoría humana\
✅ onboarding controlado\
✅ seguridad operacional\
✅ soft delete\
✅ soporte SaaS-ready
