**ESTRATEGIA: JWT Claims (El Pasaporte Distribuido)**

**1. Filosofía de la Estrategia**

El JWT (JSON Web Token) en SIPRA actúa como una **Caché de Identidad
Estática y Mínima**. Su función es proveer el contexto necesario para
que el **RLS (Row Level Security)** aísle los datos con un rendimiento
\$O(1)\$ y el frontend adapte su interfaz sin latencia de red.

**Principio Rector:** El JWT es una herramienta de **aislamiento y
jerarquía**, no una fuente de verdad para estados críticos (como
suspensiones o pagos), los cuales siempre se validan en la base de datos
en tiempo real.

**2. Estructura Oficial del Payload (app_metadata)**

Para optimizar el ancho de banda y la velocidad de procesamiento, el
payload se mantiene minimalista. Los datos viven dentro de la reserva
app_metadata de Supabase para evitar manipulaciones por parte del
cliente.

  -----------------------------------------------------------------------------------
  **Claim**         **Tipo**   **Fuente de Verdad**   **Propósito**
  ----------------- ---------- ---------------------- -------------------------------
  **academia_id**   UUID       public.usuario         Ancla de aislamiento
                                                      multi-tenant (RLS).

  **rol**           String     public.usuario         Hint de jerarquía: owner,
                                                      admin, staff.

  **plan_nivel**    String     suscripcion_academia   **UX Hint:** Badges y
                                                      visibilidad de módulos.

  **cv**            Integer    Sistema                **Claims Version:** Para
                                                      migraciones de seguridad.
  -----------------------------------------------------------------------------------

**Nota:** La identidad del usuario (usuario_id) no se duplica en los
claims, ya que se utiliza el campo estándar sub del JWT mediante la
función auth.uid().

**3. Sincronización y \"Stale Data\"**

Dado que el JWT tiene un tiempo de vida (TTL), el sistema asume una
**consistencia eventual** para la lectura, pero aplica **rigor
absoluto** para la escritura.

**Flujo de Sincronización (Decoupled)**

1.  **Evento:** Cambio de rol o academia en public.usuario.

2.  **Acción:** El backend (Edge Function / RPC) invoca la **Admin API**
    de Supabase: supabase.auth.admin.updateUserById().

3.  **Persistencia:** Los metadatos se guardan en auth.users, listos
    para el próximo refresco de sesión.

**4. Matriz de Refresco de Sesión (Optimización de Red)**

No todos los cambios requieren un nuevo JWT. Centralizamos la
inteligencia para evitar peticiones de red innecesarias.

  ------------------------------------------------
  **Cambio       **¿Requiere     **Acción del
  Realizado**    Nuevo JWT?**    Backend**
  -------------- --------------- -----------------
  **Cambio de    **SÍ**          Devuelve
  Rol / cv**                     needs_refresh:
                                 true

  **Cambio de    **SÍ**          Devuelve
  Academia**                     force_logout:
                                 true

  **Nombre /     **NO**          Devuelve success:
  Avatar**                       true

  **Metadata UI  **NO**          Devuelve success:
  / Tema**                       true
  ------------------------------------------------

**5. El Modelo de Confianza Dual (Read vs. Write)**

Para maximizar el rendimiento sin arriesgar la seguridad ante \"JWTs
viejos\", SIPRA divide el acceso en dos dominios:

**A. Dominio de Lectura (Fast Path)**

- **Confianza:** Total en el JWT.

- **Mecánica:** El RLS filtra tablas usando security.get_my_tenant_id().

- **Resultado:** Velocidad extrema en SELECT.

**B. Dominio de Escritura (Secure Path)**

- **Confianza:** Base de Datos en Tiempo Real.

- **Mecánica:** La función security.can_write_to_academia() ignora el
  JWT y consulta el estado actual del usuario y la suscripción en la DB.

- **Resultado:** Seguridad absoluta contra usuarios suspendidos o
  deudores, incluso si su JWT sigue activo.

**6. Reglas Arquitectónicas Congeladas (V1)**

1.  **JWT Ligero:** No se inyectan permisos granulares (ACL),
    configuraciones de academia o estados comerciales. Solo identidad y
    rol.

2.  **Aislamiento Inmutable:** En V1, un usuario pertenece a **una sola
    academia**. Cambiar de academia requiere una nueva identidad para
    preservar la integridad forense.

3.  **Interceptor Global:** El frontend debe implementar un interceptor
    que escuche la bandera needs_refresh en las respuestas del backend
    para ejecutar supabase.auth.refreshSession() de forma transparente.

4.  **Claims Versioning:** Todo token debe incluir cv. Si el sistema
    detecta un cv obsoleto, forzará un refresco para aplicar nuevas
    estructuras de seguridad.

5.  **TTL (Time To Live):** Se recomienda configurar el vencimiento del
    JWT en Supabase a **60 minutos**. Es el equilibrio ideal entre
    seguridad (ventana de stale data) y rendimiento (frecuencia de
    refresco).
