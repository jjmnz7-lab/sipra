**ESPECIFICACIÓN COMPLETA Y ACTUALIZADA --- ENTIDAD: archivo_adjunto**

**1. Filosofía de la Entidad**

archivo_adjunto representa:

**el metadato oficial de un objeto binario almacenado externamente.**

El archivo físico vive en:

**Supabase Storage.**

La tabla:

**administra ownership, seguridad, lifecycle, auditoría y relaciones
operativas.**

**Filosofía Oficial**

Storage guarda bytes.\
PostgreSQL guarda significado.

**El archivo:**

**NO es fuente de verdad financiera.**

Aunque un comprobante apoye un pago:\
la verdad contable sigue siendo:

✅ movimiento\
✅ aplicacion_movimiento\
✅ cargo

**2. Objetivos Oficiales**

La entidad permite:

✅ comprobantes de pago\
✅ justificantes médicos\
✅ screenshots\
✅ documentos PDF\
✅ logos academia\
✅ archivos comunicación\
✅ evidencia operativa\
✅ soporte auditoría

**3. Nombre Oficial**

archivo_adjunto

**4. Arquitectura Oficial**

**A. Storage**

Los bytes viven en:

**Supabase Storage.**

**B. PostgreSQL**

La tabla guarda:

✅ metadata\
✅ ownership\
✅ relaciones\
✅ lifecycle\
✅ MIME\
✅ tamaño\
✅ auditoría\
✅ integridad tenant

**5. Estructura Física Oficial**

  --------------------------------------------------------------------------------
  **Campo**              **Tipo**       **Restricciones**         **Propósito**
  ---------------------- -------------- ------------------------- ----------------
  id                     UUID           PK DEFAULT                ID archivo
                                        gen_random_uuid()         

  academia_id            UUID           FK NOT NULL INDEX         tenant owner

  persona_id             UUID           FK NULLABLE INDEX         relación persona

  movimiento_id          UUID           FK NULLABLE INDEX         comprobante
                                                                  financiero

  evento_timeline_id     UUID           FK NULLABLE INDEX         narrativa
                                                                  timeline

  created_by             UUID           FK usuario.id NOT NULL    auditoría

  contexto               VARCHAR(30)    NOT NULL                  clasificación
                                                                  lógica

  estado                 VARCHAR(30)    NOT NULL DEFAULT          lifecycle
                                        \'pendiente_subida\'      

  bucket_name            VARCHAR(100)   NOT NULL                  bucket storage

  storage_path           TEXT           NOT NULL UNIQUE           ruta física

  original_filename      VARCHAR(255)   NOT NULL                  nombre original

  extension              VARCHAR(20)    NOT NULL                  extensión

  mime_type              VARCHAR(120)   NOT NULL                  MIME

  file_size_bytes        BIGINT         NULLABLE                  tamaño real

  checksum_sha256        VARCHAR(64)    NULLABLE                  integridad

  visible_para_cliente   BOOLEAN        DEFAULT false             portal futuro

  metadata               JSONB          NOT NULL DEFAULT \'{}\'   datos extra

  uploaded_at            TIMESTAMPTZ    NULLABLE                  upload
                                                                  confirmado

  archived_at            TIMESTAMPTZ    NULLABLE                  archivado

  deleted_at             TIMESTAMPTZ    NULLABLE                  soft delete

  created_at             TIMESTAMPTZ    DEFAULT now()             auditoría

  updated_at             TIMESTAMPTZ    DEFAULT now()             auditoría
  --------------------------------------------------------------------------------

**6. Filosofía Relaciones**

**Decisión Oficial**

Se usan:

**Foreign Keys explícitas nullable.**

**NO:**

parent_type + parent_id

**Porque PostgreSQL gana muchísimo con:**

✅ FK reales\
✅ índices reales\
✅ integrity real\
✅ joins baratos\
✅ tooling mejor\
✅ cascades futuros

**Relaciones oficiales V1**

  -----------------------------------
  **Relación**         **Uso**
  -------------------- --------------
  persona_id           expedientes

  movimiento_id        comprobantes

  evento_timeline_id   narrativa
  -----------------------------------

**7. Contextos Oficiales**

**Campo**

contexto

**Valores oficiales**

  --------------------------------------
  **Contexto**          **Uso**
  --------------------- ----------------
  comprobante_pago      transferencias

  justificante          incapacidad

  evidencia_operativa   fotos

  screenshot            capturas

  documento             PDFs

  logo_academia         branding

  comunicacion          archivos
                        enviados

  contrato              documentos

  otro                  fallback
  --------------------------------------

**Constraint oficial**

CHECK (\
contexto IN (\
\'comprobante_pago\',\
\'justificante\',\
\'evidencia_operativa\',\
\'screenshot\',\
\'documento\',\
\'logo_academia\',\
\'comunicacion\',\
\'contrato\',\
\'otro\'\
)\
)

**8. Estados Oficiales Lifecycle**

**Filosofía**

Uploads:

**NO son instantáneamente válidos.**

**State Machine oficial**

  ------------------------------------
  **Estado**         **Significado**
  ------------------ -----------------
  pendiente_subida   metadata creada

  activo             upload confirmado

  fallido            upload roto

  archivado          oculto operativo

  eliminado_logico   soft delete

  deleting           cleanup activo

  corrupto           checksum mismatch
  ------------------------------------

**Constraint oficial**

CHECK (\
estado IN (\
\'pendiente_subida\',\
\'activo\',\
\'fallido\',\
\'archivado\',\
\'eliminado_logico\',\
\'deleting\',\
\'corrupto\'\
)\
)

**9. Flujo Oficial Upload**

**Paso 1**

RPC:\
crea registro:

estado = pendiente_subida

**Paso 2**

Backend:\
genera signed upload URL.

**Paso 3**

Frontend:\
sube archivo directamente a Storage.

**Paso 4**

Frontend llama:

confirmar_subida()

**Paso 5**

RPC valida:

✅ archivo existe\
✅ tamaño coincide\
✅ MIME coincide

**Paso 6**

Estado:

activo

**Beneficio**

Evita:

**archivos fantasma.**

**10. Cleanup Oficial Huérfanos**

**Problema**

Usuario:\
cierra pestaña antes confirmación.

**Solución Oficial**

Worker nocturno:

WHERE estado = \'pendiente_subida\'\
AND created_at \< now() - interval \'24 hours\'

**Acción**

✅ borrar storage object\
✅ borrar metadata\
✅ registrar cleanup opcional

**11. Estrategia Oficial Storage Paths**

**Filosofía**

Paths:

**determinísticos y tenant-scoped.**

**Estructura oficial**

tenant_id/contexto/subcontexto/YYYY_MM/file_uuid.ext

**Ejemplos**

**Persona**

acc-1/persona/p-44/2026_05/file.pdf

**Academia**

acc-1/global/2026_05/logo.png

**Beneficios**

✅ limpieza\
✅ lifecycle\
✅ debugging\
✅ retention\
✅ exports\
✅ cold storage futuro

**12. Buckets Oficiales**

**Regla Oficial**

Buckets:

**privados obligatoriamente.**

**Nunca:**

public bucket

**Recomendado**

sipra-private

**13. Acceso Oficial Archivos**

**Regla Oficial**

Acceso:

**signed URLs temporales.**

**Duración recomendada**

1-5 minutos

**Nunca:**

URLs permanentes.

**Beneficios**

✅ privacidad\
✅ expiración\
✅ anti hotlink\
✅ tenant isolation

**14. Signed URL Strategy**

**Problema**

Expedientes:\
20+ archivos.

**Solución Oficial**

Usar:

createSignedUrls()

en batch.

**Frontend**

✅ cache TTL-aware\
✅ lazy loading\
✅ preview on demand

**Beneficios**

✅ menos roundtrips\
✅ mejor UX\
✅ menos render blocking

**15. MIME Types Permitidos**

**Whitelist Oficial**

  ----------------------------
  **Tipo**   **MIME**
  ---------- -----------------
  PDF        application/pdf

  JPG        image/jpeg

  PNG        image/png

  WEBP       image/webp
  ----------------------------

**Prohibidos V1**

❌ executables\
❌ ZIP\
❌ macros\
❌ JS\
❌ HTML\
❌ SVG inline

**16. Límites Oficiales Tamaño**

  -----------------------
  **Tipo**   **Máximo**
  ---------- ------------
  imágenes   10 MB

  PDF        20 MB
  -----------------------

**Validación**

✅ frontend\
✅ backend\
✅ storage policy

**17. checksum_sha256 Oficial**

**Uso**

✅ integridad\
✅ auditoría\
✅ anti corrupción\
✅ deduplicación futura

**Recomendado:**

**sí congelarlo.**

**18. Soft Delete Oficial**

**Regla Oficial**

NO borrar inmediatamente.

**Flujo**

estado = eliminado_logico

**Worker async posterior:**

cleanup físico.

**Beneficios**

✅ auditoría\
✅ reversión\
✅ consistencia

**19. Seguridad RLS Oficial**

**Activación**

ALTER TABLE archivo_adjunto ENABLE ROW LEVEL SECURITY;

**SELECT**

USING (\
security.is_auth_user_for_tenant(academia_id)\
)

**INSERT**

WITH CHECK (\
security.can_write_to_academia(academia_id)\
)

**UPDATE**

Permitido solo:

✅ lifecycle\
✅ metadata segura\
✅ archivado

**DELETE**

USING (false)

**Prohibido físicamente.**

**20. Integración Timeline Oficial**

**Regla Oficial**

Uploads relevantes:

**generan timeline.**

**Ejemplos**

  ---------------------------------------
  **Evento**     **Timeline**
  -------------- ------------------------
  comprobante    archivo_subido
  pago           

  justificante   justificante_adjuntado

  screenshot     evidencia_adjuntada
  ---------------------------------------

**Beneficio**

Timeline:

**narrativa completa.**

**21. Worker Reconciliation Oficial**

**Problema**

Posibles inconsistencias:

- DB sin storage,

- storage sin DB,

- tamaños distintos.

**Worker oficial futuro**

storage_reconciliation

**Funciones**

✅ detectar huérfanos\
✅ detectar corrupción\
✅ validar tamaños\
✅ validar checksums

**22. Índices Oficiales**

**Persona**

CREATE INDEX idx_archivo_persona\
ON archivo_adjunto (\
academia_id,\
persona_id\
);

**Movimiento**

CREATE INDEX idx_archivo_movimiento\
ON archivo_adjunto (\
movimiento_id\
);

**Timeline**

CREATE INDEX idx_archivo_timeline\
ON archivo_adjunto (\
evento_timeline_id\
);

**Estado**

CREATE INDEX idx_archivo_estado\
ON archivo_adjunto (\
academia_id,\
estado\
);

**Uploads recientes**

CREATE INDEX idx_archivo_uploaded_at\
ON archivo_adjunto (\
uploaded_at DESC\
);

**23. Reglas Arquitectónicas Congeladas**

**Regla 1**

Storage:

**separado DB.**

**Regla 2**

DB:

**owner lifecycle oficial.**

**Regla 3**

Buckets:

**privados obligatorios.**

**Regla 4**

Acceso:

**signed URLs cortas.**

**Regla 5**

Uploads:

**state machine obligatoria.**

**Regla 6**

Evitar:

**archivos fantasma.**

**Regla 7**

Cleanup:

**async worker.**

**Regla 8**

Archivos:

**inmutables.**

**Regla 9**

Timeline:

**integra narrativa.**

**Regla 10**

Archivo:

**NO es ledger.**

**Regla 11**

MIME:

**whitelist estricta.**

**Regla 12**

Storage:

**tenant-scoped siempre.**

**Regla 13**

Frontend:

**lazy loading previews.**

**Regla 14**

Signed URLs:

**batching + cache TTL-aware.**

**Regla 15**

Worker reconciliation:

**roadmap oficial.**
