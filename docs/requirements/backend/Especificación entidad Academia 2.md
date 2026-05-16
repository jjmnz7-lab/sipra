**ESPECIFICACIÓN DE ENTIDAD: Academia (Tenant Raíz)**

**1. Filosofía de la Entidad**

La tabla Academia es el **límite físico, lógico y de seguridad** (Tenant
Boundary) de todo el sistema SIPRA. Ninguna entidad operativa (Persona,
Cargo, Movimiento, etc.) puede existir sin pertenecer explícitamente a
una academia. Además, centraliza la configuración operativa y de
localización para que el motor de base de datos pueda ejecutar *Cron
Jobs* de forma precisa y localizada.

**Nombre de Tabla:** academia

**2. Esquema Físico (Estructura de Campos)**

  ----------------------------------------------------------------------------------------------
  **Campo**               **Tipo**       **Reglas y             **Propósito**
                                         Restricciones**        
  ----------------------- -------------- ---------------------- --------------------------------
  id                      UUID           **PK**, DEFAULT        Identificador absoluto del
                                         gen_random_uuid()      Tenant.

  nombre                  Varchar(150)   **NOT NULL**           Nombre comercial (Ej. \"Escuela
                                                                de Fútbol\").

  slug                    Varchar(80)    **UNIQUE, NOT NULL**   Identificador URL-safe para
                                                                futuras integraciones.
                                                                *Inmutable una vez creado.*

  telefono_contacto       Varchar(20)    NULLABLE               Teléfono administrativo del
                                                                negocio.

  whatsapp_contacto       Varchar(20)    NULLABLE               **Canal Operativo:** Número
                                                                emisor para automatización.

  email_contacto          Varchar(150)   NULLABLE               Contacto principal para
                                                                facturación SIPRA.

  estado                  Varchar(20)    **NOT NULL**, DEFAULT  Control operativo del Tenant
                                         \'activa\'             (activa, suspendida, cancelada).

  timezone                Varchar(80)    **NOT NULL**, DEFAULT  **Crítico:** Base para *Cron
                                         \'America/Mazatlan\'   Jobs* nocturnos y vencimientos.

  moneda                  Varchar(10)    **NOT NULL**, DEFAULT  Moneda operativa para UI,
                                         \'MXN\'                cálculos y reportes.

  config_cobro            JSONB          **NOT NULL**, DEFAULT  Reglas flexibles de la ventana
                                         \'{}\'                 de cobranza.

  config_mensajes         JSONB          **NOT NULL**, DEFAULT  Reglas de comunicación y
                                         \'{}\'                 plantillas.

  fecha_inicio_servicio   Timestamptz    DEFAULT now()          Antigüedad del tenant en SIPRA.

  fecha_suspension        Timestamptz    NULLABLE               Trazabilidad de bloqueos
                                                                temporales.

  created_at              Timestamptz    **NOT NULL**, DEFAULT  Auditoría de creación.
                                         now()                  

  updated_at              Timestamptz    **NOT NULL**, DEFAULT  Auditoría de modificación
                                         now()                  (Actualizado por Trigger).
  ----------------------------------------------------------------------------------------------

**3. Restricciones a Nivel Motor (Constraints & Índices)**

Para garantizar la integridad y velocidad en Postgres:

- **Primary Key:** PRIMARY KEY (id)

- **Índice Único (Case-Insensitive):** CREATE UNIQUE INDEX
  idx_academia_slug_lower ON academia (LOWER(slug));

- **Índice de Búsqueda:** CREATE INDEX idx_academia_estado ON academia
  (estado);

- **Reglas de Dominio (CHECKs):**

  - CHECK (estado IN (\'activa\', \'suspendida\', \'cancelada\'))

  - CHECK (length(trim(nombre)) \> 0)

  - CHECK (slug \~ \'\^\[a-z0-9-\]+\$\')

  - CHECK (moneda IN (\'MXN\')) *(Extensible en V2)*

**4. Estructuras Estándar JSONB (Configuración V1)**

Al separar la configuración en dominios, facilitamos la validación en el
Backend (NestJS) y evitamos objetos gigantes.

**Estructura esperada para config_cobro:**

JSON

{

\"ventana_cobro\": {

\"dia_inicio\": 1,

\"dia_fin\": 10

},

\"automatizacion\": {

\"modo\": \"asistido\",

\"pausar_por_promesa\": true

}

}

**Estructura esperada para config_mensajes:**

JSON

{

\"firma_responsable\": \"Profe Juan\",

\"template_recordatorio\": \"Hola {nombre}, te recordamos tu pago\...\"

}

**5. Máquina de Estados y Regla de Soft-Delete**

**Regla Oficial del Sistema:** NINGUNA tabla *core* permite el comando
DELETE desde la API pública o el cliente. Todo se maneja mediante estado
lógico.

- **activa:** Operación normal.

- **suspendida:**

  - *Trigger Operativo:* Impago a SIPRA o decisión del owner.

  - *Efecto:* La app entra en modo *Read-Only*. RLS y API bloquean
    mutaciones (creación de cargos, envíos, movimientos).

- **cancelada:**

  - *Trigger Operativo:* Baja definitiva (Soft Delete).

  - *Efecto:* Se revoca todo acceso al tenant.

**6. Seguridad y Row Level Security (RLS) Híbrido**

Esta es la pieza arquitectónica más importante para el multitenant.
Usamos el JWT como contexto, pero la tabla usuario como la **Única
Fuente de Verdad** viva.

- **Activación:** ALTER TABLE academia ENABLE ROW LEVEL SECURITY;

- **Política de Aislamiento Total (SELECT, UPDATE):**

> SQL
>
> CREATE POLICY \"Aislamiento Estricto de Tenant\" ON academia
>
> FOR ALL
>
> USING (
>
> EXISTS (
>
> SELECT 1
>
> FROM usuario u
>
> WHERE u.auth_user_id = auth.uid()
>
> AND u.academia_id = academia.id
>
> AND u.estado = \'activo\'
>
> )
>
> )
>
> WITH CHECK (
>
> EXISTS (
>
> SELECT 1
>
> FROM usuario u
>
> WHERE u.auth_user_id = auth.uid()
>
> AND u.academia_id = academia.id
>
> AND u.estado = \'activo\'
>
> )
>
> );

**7. Instrucciones Estrictas para IA / Backend Developers**

1.  **El timezone es funcional, no visual:** Todo Cron Job que evalúe
    vencimientos debe hacer un casting dinámico: (now() AT TIME ZONE
    academia.timezone)::date.

2.  **Validación de Tenant en Mutaciones:** Aunque RLS proteja la base
    de datos, el Backend (NestJS) DEBE interceptar cada petición y
    validar que el academia_id inyectado en el JWT coincide con la
    academia sobre la que se intenta operar.

3.  **Bloqueo del Rol de Servicio:** Queda estrictamente prohibido usar
    la service_role de Supabase/Postgres en endpoints que manejen datos
    de los tenants, ya que esto ignora las políticas RLS y rompe el
    aislamiento.
