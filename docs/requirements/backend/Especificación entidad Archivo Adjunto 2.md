**ESPECIFICACIÓN: Entidad archivo_adjunto (V1)**

**1. Filosofía de la Entidad**

El almacenamiento físico (bytes) se delega a **Supabase Storage** en
buckets privados, mientras que la base de datos (metadatos) gestiona el
significado, la propiedad (Tenancy) y la seguridad. El modelo es
**Híbrido**: utiliza llaves foráneas (FK) explícitas para integridad,
combinadas con etiquetas de contexto para flexibilidad en la interfaz.

**Nombre de Tabla:** archivo_adjunto

**2. Estructura de Datos (Esquema Físico)**

  ---------------------------------------------------------------------------------------------
  **Campo**                **Tipo**       **Restricciones**   **Propósito**
  ------------------------ -------------- ------------------- ---------------------------------
  **id**                   UUID           PK, DEFAULT         Identificador único y nombre del
                                          gen_random_uuid()   archivo en Storage.

  **academia_id**          UUID           FK, **NOT NULL**,   Aislamiento Multi-tenant.
                                          Indexado            

  **persona_id**           UUID           FK, NULLABLE,       Vínculo directo al expediente del
                                          Indexado            alumno.

  **movimiento_id**        UUID           FK, NULLABLE,       Vínculo a la transacción
                                          Indexado            financiera.

  **evento_timeline_id**   UUID           FK, NULLABLE,       Vínculo a la narrativa
                                          Indexado            operativa/auditoría.

  **contexto**             VARCHAR(30)    **NOT NULL**, Check Etiqueta de uso (ej. comprobante,
                                          Enum                identificacion).

  **storage_path**         TEXT           **NOT NULL**,       Ruta jerárquica:
                                          UNIQUE              tenant/contexto/sub/YYYY_MM/id.

  **original_filename**    TEXT           **NOT NULL**        Nombre original para la descarga
                                                              en el cliente.

  **mime_type**            VARCHAR(120)   **NOT NULL**        Whitelist: application/pdf,
                                                              image/jpeg, image/png.

  **file_size_bytes**      BIGINT         **NOT NULL**        Control de cuotas y validación de
                                                              integridad.

  **estado**               VARCHAR(20)    **NOT NULL**, Check pending_upload, activo,
                                          Enum                eliminado_logico, corrupto.

  **metadata**             JSONB          DEFAULT \'{}\'      Dimensiones de imagen, checksum
                                                              SHA256, etc.

  **uploaded_by**          UUID           FK usuario.id,      Auditoría de autoría.
                                          **NOT NULL**        

  **uploaded_at**          TIMESTAMPTZ    NULLABLE            Confirmación de la subida física
                                                              exitosa.
  ---------------------------------------------------------------------------------------------

**3. El Ciclo de Vida de Subida (Zero Trust)**

Para evitar archivos huérfanos y asegurar que lo que está en la base de
datos existe físicamente, se implementa un flujo de **Verificación en
Dos Fases**:

1.  **Fase de Intención (RPC solicitar_subida):**

    - La base de datos crea el registro con estado = \'pending_upload\'.

    - Se retorna un **Presigned URL** de subida con TTL de 5 minutos.

2.  **Fase de Confirmación (RPC confirmar_subida):**

    - El frontend notifica la finalización.

    - El servidor verifica mediante API (server-to-server) que el
      archivo existe en Storage, coincide el tamaño y el MIME type.

    - El estado cambia a activo.

**4. Estrategia de Almacenamiento y Rutas**

Las rutas son deterministas para facilitar la limpieza masiva y el
cumplimiento de políticas de retención.

**Patrón de Ruta:**

{academia_id} / {contexto} / {parent_id_prefix} / {YYYY_MM} / {id}.{ext}

- **Ejemplo Comprobante:** acc-1/movimiento/m-123/2026_05/uuid.pdf

- **Ejemplo Perfil:** acc-1/persona/p-456/2026_05/uuid.jpg

**5. Seguridad y Acceso (RLS)**

El acceso se rige por el principio de \"Privacidad por Defecto\".

- **Buckets:** Privados (No públicos).

- **Acceso en UI:** El frontend solicita **Signed URLs temporales** (TTL
  de 1 a 5 minutos) bajo demanda (*Lazy Loading*).

- **Políticas RLS:**

  - **Lectura:** Solo personal de la academia con estado activo.

  - **Escritura:** Solo si la academia tiene suscripción vigente
    (can_write_to_academia).

  - **Eliminación:** Solo eliminado_logico. El borrado físico lo realiza
    un Worker asíncrono tras validar la inexistencia de vínculos
    financieros críticos.

**6. Reglas Arquitectónicas Congeladas (Archivos)**

1.  **Integridad Referencial:** Se utilizan llaves foráneas reales. Si
    un archivo es evidencia de un pago (movimiento_id), la base de datos
    protege el vínculo.

2.  **MIME Whitelist Estricta:** Se prohíben ejecutables, scripts o
    documentos con macros. Solo se permiten formatos de imagen estándar
    y PDFs.

3.  **Auditoría en Timeline:** Toda subida confirmada debe generar
    automáticamente un evento en el evento_timeline vinculado al
    parent_id (ej: *\"Comprobante de pago adjuntado por
    Administrador\"*).

4.  **Reconciliación Automática:** Un Worker nocturno (\"The Reaper\")
    busca registros en pending_upload de más de 24 horas y los purga de
    la DB y del Storage para mantener la higiene del sistema.

5.  **Cuotas de Almacenamiento:** El campo file_size_bytes es
    obligatorio para permitir el cálculo en tiempo real del espacio
    consumido por cada academia (SUM por academia_id).
