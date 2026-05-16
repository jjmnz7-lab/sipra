**ESPECIFICACIONES: Ecosistema de Gestión de Archivos (V1)**

**1. El Protocolo de Subida (RPCs Transaccionales)**

Para garantizar la integridad y el aislamiento, el frontend nunca
interactúa con la tabla de archivos de forma directa. Se utiliza un
flujo de **Verificación Server-Side**.

**A. solicitar_subida_archivo_v1**

Inicia la intención de subida y asegura el *ownership* del registro
padre.

- **Validaciones (Capa 2):**

  - **Cross-check de Tenancy:** Verifica que el parent_id (ej.
    persona_id) pertenezca efectivamente al academia_id de la sesión.

  - **Cuota:** Llama a security.can_upload_archivo() para verificar
    espacio disponible.

  - **MIME Whitelist:** Valida que el formato esté permitido.

- **Acción:** Crea el registro en archivo_adjunto con estado =
  \'pending_upload\'.

- **Retorno:** Objeto de control con upload_url (Signed PUT URL),
  expires_at (TTL 5 min) y max_size_bytes.

**B. confirmar_subida_archivo_v1**

Valida la existencia física y activa el registro para su uso operativo.

- **Validación Server-Side (Capa 5):** Invoca un chequeo hacia Supabase
  Storage para confirmar que el objeto existe, el tamaño coincide y el
  hash es íntegro.

- **Acción:**

  - Cambia estado a activo.

  - Actualiza academia.storage_used_bytes (Accounting en tiempo real).

  - Inserta registro en evento_timeline vinculado al padre (Narrativa de
    evidencia).

**2. Capa de Seguridad y Autorización (Helpers RLS)**

Se han añadido funciones al esquema security para centralizar la lógica
de permisos sobre objetos binarios.

- **security.can_access_archivo(p_id)**:

  - **Staff:** Solo accede si estado = \'activo\'.

  - **Admin/Owner:** Accede a activo, archivado y pending_upload.

  - **System:** Acceso total para mantenimiento.

- **security.can_upload_archivo(p_tenant_id)**: Valida que la academia
  no haya excedido su storage_limit_bytes y que el estado comercial sea
  apto para escritura.

- **security.can_delete_archivo(p_id)**: Restringe el inicio del flujo
  de borrado a roles con privilegios de gestión.

**3. Automatización y Mantenimiento (Workers & Crons)**

Garantizan la higiene del almacenamiento y la consistencia de las cuotas
SaaS.

**A. nightly_storage_reaper (El Segador Forense)**

- **Misión:** Buscar registros en pending_upload con más de 24 horas.

- **Acción:** Intenta borrar el objeto físico en Storage. En la base de
  datos, marca el registro como fallido o expirado (en lugar de
  borrarlo) para mantener la trazabilidad de qué usuario intentó subir
  qué archivo y por qué falló.

**B. weekly_storage_reconciler (El Auditor)**

- **Misión:** Corregir el \"drift\" o desfase entre la base de datos y
  el proveedor de almacenamiento.

- **Acción:** Compara SUM(file_size_bytes) contra el reporte del bucket.
  Aplica una tolerancia del ±1% para considerar metadatos ocultos.
  Actualiza el valor maestro en la tabla academia.

**4. Actualización de Entidades Core**

La incorporación de archivos requiere estos ajustes en las tablas base
para soportar la nueva funcionalidad:

  ----------------------------------------------------------------------------------
  **Tabla**                  **Cambio Realizado**     **Propósito**
  -------------------------- ------------------------ ------------------------------
  **academia**               storage_used_bytes       Caché de uso de disco para
                             (BIGINT)                 validación rápida.

  **suscripcion_academia**   storage_limit_bytes      Límite de cuota según el plan
                             (BIGINT)                 contratado.

  **persona**                foto_perfil_archivo_id   Vínculo directo para
                             (FK)                     visualización de avatares.

  **evento_timeline**        Categoría                Soporte para la narrativa de
                             archivo_adjunto          evidencias.
  ----------------------------------------------------------------------------------

**5. Políticas de Almacenamiento (Storage RLS)**

El bucket sipra-private-evidence se protege con políticas que
\"escuchan\" a la base de datos.

- **Política de Lectura:** El objeto es accesible vía *Signed URL* solo
  si existe un registro en public.archivo_adjunto con el mismo
  storage_path y el usuario actual pertenece al mismo tenant_id.

- **Estructura de Rutas (Hierarchy):**

> {tenant_id} / {contexto} / {subcontexto_id} / {YYYY_MM} / {id}.{ext}
>
> *(Facilita el borrado por prefijo y las políticas de retención
> futuras).*

**6. Reglas de Idempotencia y Resiliencia**

- **Deduplicación Local:** Si la RPC detecta que se intenta subir el
  mismo checksum_sha256 para el mismo parent_id en menos de 1 hora,
  devuelve el registro existente en lugar de crear uno nuevo.

- **Rollback de Error:** Si la confirmación de subida falla tras tres
  reintentos, el sistema marca el archivo como corrupto y genera una
  alerta en el Timeline para revisión administrativa.
