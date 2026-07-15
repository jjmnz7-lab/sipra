# Auditoría Técnica de SIPRA - Fase 0: Mapeo de Estado Actual

Este documento presenta una auditoría técnica completa del estado actual del sistema SIPRA (Sistema de Pagos y Registro de Academias), enfocada en los mecanismos de onboarding, esquema de base de datos, políticas de Row Level Security (RLS), autenticación y configuración del entorno. 

Esta auditoría sirve como base y mapa de referencia para la integración de SIPRA con la nueva plataforma interna **SIPRA HQ**.

---

## 1. Wizard de Onboarding Existente

El wizard de registro y configuración inicial es el flujo por el cual un nuevo dueño de academia da de alta su cuenta y su establecimiento en el sistema.

### 1.1. Rutas y Estado de Visibilidad
* **Ruta del archivo de la página (Ruta de Next.js):** [app/(auth)/registro/page.tsx](file:///c:/Users/juan_/Desktop/SIPRA/app/(auth)/registro/page.tsx)
* **Ruta del componente lógico:** [components/domain/auth/onboarding-wizard.tsx](file:///c:/Users/juan_/Desktop/SIPRA/components/domain/auth/onboarding-wizard.tsx)
* **Server Action principal:** [app/(auth)/registro/actions.ts](file:///c:/Users/juan_/Desktop/SIPRA/app/(auth)/registro/actions.ts)
* **URL de acceso:** `/registro`

**¿Por qué está oculto hoy?**
1. **Ausencia de enlaces en la UI:** No existe ningún botón, hipervínculo ni redirección en la pantalla de inicio de sesión (`/login`) ni en la barra de navegación del sitio público que apunte a la ruta `/registro`.
2. **Acceso directo permitido:** Aunque la ruta está expuesta a nivel de URL, el usuario promedio no tiene manera de descubrirla de forma visual. El middleware (`lib/supabase/middleware.ts`) la tiene declarada explícitamente en la lista de excepciones públicas y de autenticación (`isAuthRoute`), por lo que no redirige a `/login` si un usuario sin sesión intenta ingresar directamente escribiendo la URL `/registro`.

---

### 1.2. Pasos del Wizard y Datos Capturados
El wizard consta de un paso preliminar y cuatro pasos de configuración principales:

| Paso | Nombre en Interfaz | Campos Capturados | Tipo de Campo / Restricciones |
| :--- | :--- | :--- | :--- |
| **0 (Preliminar)** | Crea tu cuenta | - Nombre (`nombreOwner`) <br>- Apellido (`apellidoOwner`) <br>- Correo electrónico (`email`) <br>- Contraseña (`password`) | - Texto (mínimo 2 caracteres)<br>- Texto (opcional)<br>- Correo con formato válido<br>- Contraseña (mínimo 6 caracteres) |
| **1** | Identidad de la Academia | - Logotipo (`logoFile`) <br>- Nombre academia (`nombreAcademia`) <br>- Teléfono (`telefono`) | - Imagen (opcional, redimensionada a 128px y guardada como `.webp`) <br>- Texto (mínimo 3 caracteres)<br>- Teléfono (10 dígitos, opcional) |
| **2** | Tu Primer Plan Mensual | - Nombre del plan (`planNombre`) <br>- Monto mensual (`planMonto`) <br>- Meses de cobro (`mesesSinCobro`) | - Texto (def. `'Mensualidad Regular'`) <br>- Numérico entero no negativo (def. `300`) <br>- Lista interactiva de los 12 meses. Almacena en JSON los meses exentos de cobro |
| **3** | Recargos y Excepciones | - Estatus crítico (`criticoActivo`) <br>- Día crítico (`criticoDia`) <br>- Ingreso a mitad de mes (`regimenAlta`) | - Switch booleano (def. `false`) <br>- Numérico (entre 6 y 25, def. `10`) <br>- Opciones excluyentes: `completo`, `proporcional`, `no_cobrar` (def. `completo`) |
| **4** | Políticas de Caja | - Permite pagos parciales (`allowPartial`) <br>- Permite saldo a favor (`allowOverpayment`) | - Switch booleano (def. `true`) <br>- Switch booleano (def. `true`) |

---

### 1.3. Mecanismo de Autenticación y Flujo Atómico
Al enviar el formulario en el paso final, se desencadena la server action `registroAction` en `app/(auth)/registro/actions.ts`:
1. **Creación en Auth:** Llama a la API de Supabase Auth utilizando:
   ```typescript
   const { data: authData, error: authError } = await supabase.auth.signUp({
     email: data.email,
     password: data.password,
   });
   ```
   *Cita exacta:* [registro/actions.ts:L83-L86](file:///c:/Users/juan_/Desktop/SIPRA/app/(auth)/registro/actions.ts#L83-L86)
2. **Ejecución Transaccional SQL:** Inmediatamente después de la creación en Auth, llama a la función de base de datos `registrar_owner_v3` pasándole toda la configuración recolectada.
3. **Refresco de Sesión:** Ejecuta `await supabase.auth.refreshSession()` para forzar la actualización del JWT del usuario con los claims del nuevo tenant (`academia_id` y `rol`).

---

### 1.4. Escrituras en Base de Datos
La función SQL `registrar_owner_v3` (definida en el archivo de migración `20260709120000_registrar_owner_v3.sql`) realiza las siguientes escrituras dentro de una única transacción:

1. **Tabla `public.academia`:**
   - Genera una fila con un UUID aleatorio (`id`).
   - `nombre` $\leftarrow$ `p_nombre_academia`.
   - `estado_tenant` $\leftarrow$ `'activa'`.
   - `multi_plan_enabled` $\leftarrow$ `true`.
   - `allow_partial_payments` $\leftarrow$ `p_allow_partial`.
   - `allow_overpayment` $\leftarrow$ `p_allow_overpayment`.
   - `config_cobro` (JSONB) $\leftarrow$ Contiene las claves de prorrata, régimen de alta y meses sin cobro:
     ```json
     {
       "regimen_alta": "regimen_de_alta_seleccionado",
       "proporcional_redondeo": "1",
       "modo_prorrateo": "completo | proporcional",
       "meses_sin_cobro": [1, 2, 12],
       "dias_generacion": [1],
       "horas_minimas_recordatorio": 48
     }
     ```
   - `config_recargos` (JSONB) $\leftarrow$ Contiene el umbral y switch del estatus crítico:
     ```json
     {
       "marcar_critico": { "activo": true_o_false, "dia_umbral": dia_seleccionado },
       "aplicar_recargos": false,
       "reglas": []
     }
     ```
   - `metadata` (JSONB) $\leftarrow$ Guarda el teléfono si fue proporcionado: `{"telefono": "1234567890"}`.

2. **Tabla `public.suscripcion_academia`:**
   - Registra una suscripción en estado de prueba (Trial de 14 días):
     - `academia_id` $\leftarrow$ `v_academia_id` (F.K.).
     - `plan_codigo` $\leftarrow$ `'trial'`.
     - `estado` $\leftarrow$ `'trial'`.
     - `is_current` $\leftarrow$ `true`.
     - `precio_mensual` $\leftarrow$ `0`.
     - `fecha_inicio` $\leftarrow$ `now()`.
     - `fecha_fin` y `trial_ends_at` $\leftarrow$ `now() + interval '14 days'`.

3. **Tabla `public.usuario`:**
   - Vincula al usuario de Auth como el dueño administrativo de la academia en el esquema público:
     - `id` $\leftarrow$ `v_user_id` (F.K. hacia `auth.users(id)`).
     - `academia_id` $\leftarrow$ `v_academia_id`.
     - `nombre` $\leftarrow$ `p_nombre_owner`.
     - `apellido` $\leftarrow$ `p_apellido_owner`.
     - `email_snapshot` $\leftarrow$ Correo extraído del JWT.
     - `rol` $\leftarrow$ `'owner'`.
     - `estado` $\leftarrow$ `'activo'`.

4. **Tabla `auth.users` (Actualización):**
   - Inyecta metadatos personalizados para RLS dentro de la columna `raw_app_meta_data`:
     ```sql
     UPDATE auth.users
     SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
       || jsonb_build_object('academia_id', v_academia_id, 'rol', 'owner', 'claims_version', 1)
     WHERE id = v_user_id;
     ```

5. **Tabla `public.planes_cobro`:**
   - Genera el primer plan recurrente si los datos de cobro son válidos:
     - `academia_id` $\leftarrow$ `v_academia_id`.
     - `nombre` $\leftarrow$ `p_plan_nombre`.
     - `monto` $\leftarrow$ `p_plan_monto`.
     - `frecuencia` $\leftarrow$ `'mensual'`.

**¿Crea también datos de ejemplo (seed)?**
**No**. La función se limita a crear la configuración básica e indispensable. No se generan alumnos (`persona`), grupos (`grupo`), movimientos de caja o cobros preestablecidos adicionales en este paso.

---

## 2. Esquema Actual de la Tabla de Academias

### 2.1. Estructura de `public.academia`
Basado en las migraciones acumuladas y los tipos generados (`lib/types/database.types.ts`), la estructura real y completa de la tabla de academias es:

```sql
CREATE TABLE public.academia (
  id                          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                      VARCHAR(150) NOT NULL,
  estado_tenant               VARCHAR(20)  NOT NULL DEFAULT 'activa',
  timezone                    VARCHAR(50)  NOT NULL DEFAULT 'America/Mexico_City',
  config_cobro                JSONB        NOT NULL DEFAULT '{"dias_generacion": [1], "horas_minimas_recordatorio": 48}',
  metadata                    JSONB        NOT NULL DEFAULT '{}',
  next_run_utc                TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  config_recargos             JSONB        NOT NULL DEFAULT '{"activo": false, "escalones": []}',
  multi_plan_enabled          BOOLEAN      NOT NULL DEFAULT true,
  allow_partial_payments      BOOLEAN      NOT NULL DEFAULT true,
  cobrar_inscripcion_default  BOOLEAN      NOT NULL DEFAULT false,
  monto_inscripcion_default   NUMERIC(12,2)NOT NULL DEFAULT 0,
  automatizacion_recurrente   BOOLEAN      NOT NULL DEFAULT true,
  allow_overpayment           BOOLEAN      NOT NULL DEFAULT true,

  -- Restricciones (Constraints)
  CONSTRAINT chk_academia_estado CHECK (estado_tenant IN ('activa', 'suspendida', 'archivada')),
  CONSTRAINT chk_academia_nombre CHECK (char_length(trim(nombre)) > 0)
);
```

### 2.2. Noción de "Plan" o "Tier" de la Academia
La noción de plan operativo y comercial para cada academia no reside directamente en la tabla `academia`, sino en la tabla relacionada **`public.suscripcion_academia`**:
* **Relación:** Se asocia a través de la columna `suscripcion_academia.academia_id` que actúa como llave foránea hacia `public.academia(id)`.
* **Llave de Plan:** La columna `plan_codigo` (VARCHAR) almacena el tier actual de la academia. Tiene una restricción que valida sus opciones:
  ```sql
  CONSTRAINT chk_sub_plan CHECK (plan_codigo IN ('trial', 'basico', 'pro', 'personalizado'))
  ```
* **Límites de Uso:** Cada plan define dinámicamente límites en la suscripción:
  - `max_personas` (Límite de alumnos en la academia, por defecto 30).
  - `max_usuarios` (Límite de accesos administrativos, por defecto 2).
  - `max_grupos` (Límite de clases o grupos).

### 2.3. Campo de Estado / Status
Existe el campo **`estado_tenant`** en `public.academia` con valores restringidos a `'activa'`, `'suspendida'`, y `'archivada'`. Aunque actualmente el sistema arranca siempre con la academia activa, el campo está definido y listo para ser explotado comercial o administrativamente.

---

## 3. Políticas Row Level Security (RLS)

A continuación, se listan y transcriben las condiciones exactas de las políticas de RLS asociadas a la tabla de academias, usuarios y todas aquellas relacionadas directamente con el acceso de alumnos y pagos (ledger financiero).

### 3.1. Transcripción de Políticas Activas

#### Tabla: `public.academia`
* **`academia_select_policy` (FOR SELECT):**
  ```sql
  USING (id = sipra_auth.get_my_tenant_id())
  ```
* **`academia_update_policy` (FOR UPDATE):**
  ```sql
  USING (id = sipra_auth.get_my_tenant_id())
  WITH CHECK (
    id = sipra_auth.get_my_tenant_id() 
    AND sipra_auth.get_my_role() = 'owner'
  )
  ```

#### Tabla: `public.suscripcion_academia`
* **`suscripcion_select_policy` (FOR SELECT):**
  ```sql
  USING (sipra_auth.is_auth_user_for_tenant(academia_id))
  ```
* **`suscripcion_update_policy` (FOR UPDATE):**
  ```sql
  USING (false) WITH CHECK (false)
  ```
* **`suscripcion_insert_policy` (FOR INSERT):**
  ```sql
  WITH CHECK (false)
  ```

#### Tabla: `public.usuario`
* **`usuario_select_policy` (FOR SELECT):**
  ```sql
  USING (sipra_auth.is_auth_user_for_tenant(academia_id))
  ```
* **`usuario_insert_policy` (FOR INSERT):**
  ```sql
  WITH CHECK (sipra_auth.is_admin_of_tenant(academia_id))
  ```
* **`usuario_update_policy` (FOR UPDATE):**
  ```sql
  USING (sipra_auth.is_auth_user_for_tenant(academia_id))
  WITH CHECK (sipra_auth.is_admin_of_tenant(academia_id))
  ```

#### Tabla: `public.persona` (Alumnos y Tutores)
* **`persona_select_policy` (FOR SELECT):**
  ```sql
  USING (sipra_auth.is_auth_user_for_tenant(academia_id))
  ```
* **`persona_insert_policy` (FOR INSERT):**
  ```sql
  WITH CHECK (
    sipra_auth.is_admin_of_tenant(academia_id)
    AND sipra_auth.can_write_to_academia(academia_id)
  )
  ```
* **`persona_update_policy` (FOR UPDATE):**
  ```sql
  USING (sipra_auth.is_auth_user_for_tenant(academia_id))
  WITH CHECK (sipra_auth.can_write_to_academia(academia_id))
  ```
* **`persona_delete_policy` (FOR DELETE):**
  ```sql
  USING (false)
  ```

#### Tabla: `public.cargo` (Cargos / Cuentas por cobrar)
* **`cargo_select_policy` (FOR SELECT):**
  ```sql
  USING (sipra_auth.is_auth_user_for_tenant(academia_id))
  ```
* **`cargo_insert_policy` (FOR INSERT):**
  ```sql
  WITH CHECK (
    sipra_auth.is_admin_of_tenant(academia_id)
    AND sipra_auth.can_write_to_academia(academia_id)
  )
  ```
* **`cargo_update_policy` (FOR UPDATE):**
  ```sql
  USING (sipra_auth.is_auth_user_for_tenant(academia_id))
  WITH CHECK (sipra_auth.can_write_to_academia(academia_id))
  ```
* **`cargo_delete_policy` (FOR DELETE):**
  ```sql
  USING (false)
  ```

#### Tabla: `public.movimiento` (Pagos e ingresos de caja)
* **`movimiento_select_policy` (FOR SELECT):**
  ```sql
  USING (sipra_auth.is_auth_user_for_tenant(academia_id))
  ```
* **`movimiento_insert_policy` (FOR INSERT):**
  ```sql
  WITH CHECK (
    sipra_auth.is_auth_user_for_tenant(academia_id)
    AND sipra_auth.can_write_to_academia(academia_id)
  )
  ```
* **`movimiento_update_policy` (FOR UPDATE):**
  ```sql
  USING (sipra_auth.is_auth_user_for_tenant(academia_id))
  WITH CHECK (sipra_auth.can_write_to_academia(academia_id))
  ```
* **`movimiento_delete_policy` (FOR DELETE):**
  ```sql
  USING (false)
  ```

#### Tabla: `public.aplicacion_movimiento` (Cruces de cargos y pagos)
* **`app_mov_select_policy` (FOR SELECT):**
  ```sql
  USING (sipra_auth.is_auth_user_for_tenant(academia_id))
  ```
* **`app_mov_insert_policy` (FOR INSERT):**
  ```sql
  WITH CHECK (
    sipra_auth.is_auth_user_for_tenant(academia_id)
    AND sipra_auth.can_write_to_academia(academia_id)
  )
  ```
* **`app_mov_update_policy` (FOR UPDATE):**
  ```sql
  USING (sipra_auth.is_auth_user_for_tenant(academia_id))
  WITH CHECK (sipra_auth.can_write_to_academia(academia_id))
  ```
* **`app_mov_delete_policy` (FOR DELETE):**
  ```sql
  USING (false)
  ```

#### Tabla: `public.planes_cobro` (Planes de cobro recurrente)
* **`planes_cobro_select_policy` (FOR SELECT):**
  ```sql
  USING (sipra_auth.is_auth_user_for_tenant(academia_id))
  ```
* **`planes_cobro_insert_policy` (FOR INSERT):**
  ```sql
  WITH CHECK (
    sipra_auth.is_admin_of_tenant(academia_id)
    AND sipra_auth.can_write_to_academia(academia_id)
  )
  ```
* **`planes_cobro_update_policy` (FOR UPDATE):**
  ```sql
  USING (sipra_auth.is_auth_user_for_tenant(academia_id))
  WITH CHECK (sipra_auth.can_write_to_academia(academia_id))
  ```
* **`planes_cobro_delete_policy` (FOR DELETE):**
  ```sql
  USING (sipra_auth.is_admin_of_tenant(academia_id))
  ```

#### Tabla: `public.alumno_planes` (Asignación M2M alumno-plan)
* **`alumno_planes_select_policy` (FOR SELECT):**
  ```sql
  USING (sipra_auth.is_auth_user_for_tenant(academia_id))
  ```
* **`alumno_planes_insert_policy` (FOR INSERT):**
  ```sql
  WITH CHECK (
    sipra_auth.is_admin_of_tenant(academia_id)
    AND sipra_auth.can_write_to_academia(academia_id)
  )
  ```
* **`alumno_planes_update_policy` (FOR UPDATE):**
  ```sql
  USING (sipra_auth.is_auth_user_for_tenant(academia_id))
  WITH CHECK (sipra_auth.can_write_to_academia(academia_id));
  ```
* **`alumno_planes_delete_policy` (FOR DELETE):**
  ```sql
  USING (sipra_auth.is_admin_of_tenant(academia_id))
  ```

---

### 3.2. Impacto de una Academia Suspendida en RLS
**¿Reaccionarían las políticas actuales si se marcara una academia como "suspendida"?**
**Sí, reaccionarían inmediatamente bloqueando todas las operaciones de escritura (INSERT y UPDATE).**

* **El mecanismo:**
  La gran mayoría de las políticas de inserción y modificación de tablas relacionadas con alumnos, grupos, cargos y pagos comprueban la condición `sipra_auth.can_write_to_academia(academia_id)`.
* **Implementación del Helper:**
  El helper de seguridad SQL (`sipra_auth.can_write_to_academia`) hace una consulta explícita a la tabla `public.academia` buscando que el registro del tenant tenga el estado `'activa'`:
  ```sql
  -- Academia suspendida
  IF NOT EXISTS (
    SELECT 1 FROM public.academia a
    WHERE a.id = tenant_id
    AND a.estado_tenant = 'activa'
  ) THEN
    RETURN false;
  END IF;
  ```
* **El resultado:**
  Si cambiamos el campo `estado_tenant` de `'activa'` a `'suspendida'`, cualquier consulta de escritura realizada por un usuario del tenant fallará a nivel de RLS por denegación de acceso. 
  Las lecturas (SELECT) seguirán funcionando normalmente ya que utilizan `sipra_auth.is_auth_user_for_tenant`, que sólo compara el ID del tenant contra el claim del token JWT sin consultar la tabla `public.academia`.

---

## 4. Autenticación General

### 4.1. Flujo de Login de Dueños de Academia
* **Método de login:** Inician sesión únicamente utilizando **correo electrónico y contraseña**.
* **Llamado API:** La server action `loginAction` en [app/(auth)/login/actions.ts](file:///c:/Users/juan_/Desktop/SIPRA/app/(auth)/login/actions.ts) valida los datos y ejecuta el flujo de Supabase Auth:
  ```typescript
  const { error } = await supabase.auth.signInWithPassword({
    email: validatedFields.data.email,
    password: validatedFields.data.password,
  });
  ```
* No se cuenta actualmente con inicio de sesión por Magic Link, OTP por SMS/WhatsApp, o proveedores de identidad OAuth.

### 4.2. Separación entre Propietarios y Alumnos
Existe una **separación estructural absoluta** entre el personal administrador y los alumnos:
1. **Usuarios Dashboard (Dueños, Administradores, Staff):**
   - Tienen un registro de autenticación real en la tabla del sistema **`auth.users`**.
   - Mapean de forma estricta (1:1) contra la tabla operativa **`public.usuario`**, donde la columna `id` es una llave foránea (`usuario.id REFERENCES auth.users(id)`).
   - Poseen metadatos de RLS en el JWT (`academia_id`, `rol` $\in$ `{'owner', 'admin', 'staff'}`) para gestionar el sistema.
2. **Alumnos (`persona`):**
   - Son registros meramente operativos que viven dentro de la tabla **`public.persona`** (con la etiqueta `'alumno'`).
   - **No poseen cuenta ni acceso en `auth.users`**.
   - No tienen credenciales de acceso, no pueden iniciar sesión y no cuentan con pantallas o portales orientados al estudiante en el front-end actual. Sus registros los crea exclusivamente el staff desde el dashboard.

---

## 5. Variables de Entorno y Convenciones del Proyecto

### 5.1. Variables de Entorno de Supabase
El proyecto requiere y expone las siguientes variables en el archivo [.env.local](file:///c:/Users/juan_/Desktop/SIPRA/.env.local):
* `NEXT_PUBLIC_SUPABASE_URL` (URL pública del cliente Supabase/API Gateway)
* `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Token de acceso público y anónimo para peticiones del cliente)
* `SUPABASE_SERVICE_ROLE_KEY` (Llave de bypass RLS con privilegios totales, de uso exclusivo en backend y scripts locales)

### 5.2. Convenciones Tecnológicas
* **Gestor de paquetes:** `pnpm` (versión exacta definida en `"packageManager"`: `pnpm@11.1.2`).
* **Versión de Next.js:** `16.3.0-canary.32` (App Router).
* **Versión de Tailwind CSS:** **v4** (importación en CSS, sin archivo de configuración `tailwind.config.js`).

---

## Resumen Ejecutivo de la Fase de Auditoría

1. **Estado por academia (Existente):** Ya está implementado. El campo `public.academia.estado_tenant` (con check `'activa'`, `'suspendida'`, `'archivada'`) y el helper `sipra_auth.can_write_to_academia` están totalmente integrados y funcionales. Si desde SIPRA HQ marcamos a una academia como suspendida, el sistema bloqueará sus modificaciones instantáneamente.
2. **Capacidades por plan (Existente pero básico):** La tabla `suscripcion_academia` ya maneja `plan_codigo` ('trial', 'basico', 'pro', 'personalizado') y define límites de entidades (`max_personas`, `max_usuarios`, `max_grupos`). No obstante, estos límites se verifican de forma manual y aislada en algunas RPCs; haría falta implementar una validación robusta y uniforme en todo el sistema.
3. **Invitaciones con token (Por construir):** Aunque la tabla `public.usuario` incluye un campo `estado = 'invitado'`, el sistema actual no posee un mecanismo de invitaciones seguro mediante tokens de corta duración o integraciones de email automatizadas para nuevos usuarios o personal de la academia. Esto deberá construirse en las siguientes etapas.
4. **Separación de roles (Estructura sólida):** El aislamiento multi-tenant a través de los claims del JWT de Supabase es robusto, reduciendo el riesgo de accesos no autorizados en la integración con SIPRA HQ.
