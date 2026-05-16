**ESPECIFICACIONES COMPLETAS Y ACTUALIZADAS**

**NUEVAS PIEZAS AÑADIDAS POR archivo_adjunto**

La incorporación de archivo_adjunto convierte el sistema documental de
SIPRA en:

**un subsistema operativo independiente.**

Esto obliga a extender formalmente:

✅ RPCs\
✅ Workers\
✅ Crons\
✅ Helpers RLS\
✅ Storage Policies\
✅ Timeline\
✅ Job Execution\
✅ Estrategia de Cuotas

**1. NUEVAS RPCs OFICIALES**

**RPC 1:**

**solicitar_subida_v1**

**Filosofía**

Inicia formalmente el lifecycle del archivo.

El frontend:

**jamás escribe directamente metadata sensible.**

**Responsabilidades**

**Capa 1 --- Seguridad**

Validar:

✅ tenant\
✅ rol\
✅ suscripción\
✅ límites storage

**Capa 2 --- Integridad**

Validar:

✅ parent existe\
✅ pertenece al tenant\
✅ contexto permitido\
✅ MIME permitido\
✅ tamaño permitido

**Capa 3 --- Lifecycle**

Crear:

estado = pendiente_subida

**Capa 4 --- Storage**

Generar:

✅ signed upload URL\
✅ path deterministic\
✅ expiración corta

**Input Oficial**

  --------------------------------
  **Campo**             **Tipo**
  --------------------- ----------
  contexto              varchar

  parent references     uuid
                        nullable

  mime_type             varchar

  extension             varchar

  original_filename     varchar

  expected_size_bytes   bigint

  checksum_sha256       varchar
                        nullable
  --------------------------------

**Output Oficial**

{\
\"archivo_id\": \"uuid\",\
\"upload_url\": \"\...\",\
\"storage_path\": \"\...\",\
\"expires_at\": \"\...\",\
\"max_size_bytes\": 10485760\
}

**Reglas Congeladas**

✅ metadata-first\
✅ frontend nunca genera paths\
✅ upload URL corta\
✅ tenant validation obligatoria\
✅ checksum opcional V1\
✅ signed upload constrained

**RPC 2:**

**confirmar_subida_v1**

**Filosofía**

Confirma:

**que el archivo físico realmente existe.**

**Responsabilidades**

**Validación lifecycle**

El archivo:\
debe estar en:

pendiente_subida

**Verificación Storage**

Validar server-side:

✅ objeto existe\
✅ MIME coincide\
✅ tamaño coincide\
✅ path coincide\
✅ tenant coincide

**Confirmación**

Actualizar:

estado = activo\
uploaded_at = now()

**Timeline**

Insertar evento automático.

**Output**

{\
\"success\": true,\
\"archivo_id\": \"\...\",\
\"estado\": \"activo\"\
}

**Reglas Congeladas**

✅ jamás confiar frontend\
✅ confirmación server-side obligatoria\
✅ timeline solo tras activo\
✅ validación cruzada obligatoria

**RPC 3:**

**eliminar_archivo_v1**

**Filosofía**

Nunca:

**delete inmediato.**

**Flujo**

**Paso 1**

Soft delete:

estado = eliminado_logico\
deleted_at = now()

**Paso 2**

Enqueue cleanup async.

**Paso 3**

Worker:\
borra objeto físico.

**Reglas**

✅ delete físico async\
✅ auditoría preservada\
✅ timeline opcional\
✅ owner/admin solamente

**RPC 4:**

**generar_signed_urls_batch_v1**

**Filosofía**

Optimizar:

**expedientes masivos.**

**Uso**

Generar múltiples signed URLs:\
en:

**un solo roundtrip.**

**Beneficios**

✅ UX\
✅ performance\
✅ menos latencia\
✅ menos requests

**Input**

Lista de:

archivo_id\[\]

**Output**

Lista:

\[\
{\
\"archivo_id\": \"\...\",\
\"signed_url\": \"\...\",\
\"expires_at\": \"\...\"\
}\
\]

**2. NUEVOS HELPERS RLS**

**Helper:**

**can_access_archivo()**

**Filosofía**

Centralizar:

**visibilidad documental.**

**Responsabilidades**

Validar:

✅ tenant\
✅ estado\
✅ visibilidad\
✅ lifecycle

**Reglas**

**Staff normal**

Puede ver:

estado = activo

**Sistema/Admin**

Puede ver:

✅ pending\
✅ fallidos\
✅ corruptos\
✅ deleting

**Helper:**

**can_upload_archivo()**

**Responsabilidades**

Validar:

✅ suscripción activa\
✅ storage quota\
✅ rol usuario\
✅ tenant activo

**Helper:**

**can_delete_archivo()**

**Responsabilidades**

Validar:

✅ admin/owner\
✅ tenant ownership\
✅ restricciones financieras

**3. STORAGE POLICIES OFICIALES**

**Filosofía**

RLS PostgreSQL:

**NO protege Storage.**

**Policies obligatorias**

**Upload**

Solo:\
paths tenant válidos.

**Read**

Solo:\
signed URLs autorizadas.

**Delete**

Solo:\
workers/service role.

**Regla Oficial**

Todos los objetos deben vivir dentro de paths tenant-scoped.

**4. NUEVOS WORKERS OFICIALES**

**Worker:**

**nightly_storage_reaper**

**Frecuencia**

Diaria.

**Responsabilidad**

Detectar:

estado = \'pendiente_subida\'\
AND created_at \< now() - interval \'24 hours\'

**Acción**

✅ borrar objeto storage\
✅ marcar metadata fallida/eliminada\
✅ registrar cleanup opcional

**Regla Congelada**

NO borrar inmediatamente metadata SQL.

**Worker:**

**storage_reconciliation**

**Frecuencia**

Semanal.

**Responsabilidad**

Detectar:

✅ storage sin DB\
✅ DB sin storage\
✅ drift cuotas\
✅ checksums inválidos\
✅ tamaños inconsistentes

**Filosofía**

Corrige:

**drift.**

NO:

**operación realtime.**

**Worker:**

**soft_delete_gc**

**Responsabilidad**

Eliminar físicamente:\
archivos:

eliminado_logico

antiguos.

**Worker:**

**antivirus_scan_worker**

**Roadmap Oficial**

Lifecycle preparado para:

quarantine

**Worker:**

**thumbnail_generation_worker**

**Roadmap Oficial**

Generar:

✅ previews\
✅ thumbnails\
✅ optimizaciones UI

**5. NUEVOS CRONS OFICIALES**

**Cron:**

**orphan_cleanup_nightly**

**Ejecuta**

nightly_storage_reaper

**Cron:**

**storage_reconciliation_weekly**

**Ejecuta**

storage_reconciliation

**Cron:**

**soft_delete_gc_daily**

**Ejecuta**

soft_delete_gc

**6. ACTUALIZACIÓN EVENTO_TIMELINE**

**Nuevos tipos oficiales**

  ----------------------------------------
  **Tipo**                 **Categoría**
  ------------------------ ---------------
  archivo_subido           sistema

  archivo_eliminado        sistema

  comprobante_adjuntado    finanzas

  justificante_adjuntado   contexto

  upload_fallido           sistema
  ----------------------------------------

**Reglas**

Timeline:

**solo tras confirmación real.**

**7. ACTUALIZACIÓN JOB_EXECUTION**

**Nuevos jobs oficiales**

  ---------------------------------------
  **Job**                  **Uso**
  ------------------------ --------------
  nightly_storage_reaper   cleanup

  storage_reconciliation   conciliación

  soft_delete_gc           garbage
                           collection

  antivirus_scan           seguridad

  thumbnail_generation     UX
  ---------------------------------------

**Reglas**

Errores storage:

**jamás rompen ledger financiero.**

**8. ACTUALIZACIÓN SUSCRIPCION_ACADEMIA**

**Nuevos campos roadmap**

  -------------------------------
  **Campo**             **Uso**
  --------------------- ---------
  storage_limit_bytes   cuota

  storage_used_bytes    uso

  max_upload_size_mb    límite
  -------------------------------

**Estrategia Oficial**

**Realtime**

Actualizar:\
aproximadamente:\
en:

✅ confirmar_subida\
✅ delete cleanup

**Reconciliation**

Worker semanal:\
corrige drift.

**9. NUEVAS REGLAS DE IDEMPOTENCIA**

**Filosofía**

Uploads:\
también deben ser:

**resilientes.**

**Estrategia**

Hash:\
se usa para:

✅ integridad\
✅ warnings duplicados\
✅ auditoría

**NO:**

deduplicación agresiva V1.

**Regla Oficial**

hash sirve primero para integridad, no para ahorro de storage.

**10. NUEVAS REGLAS ARQUITECTÓNICAS CONGELADAS**

**Regla 1**

Uploads:

**son distribuidos.**

**Regla 2**

DB:

**controla lifecycle.**

**Regla 3**

Storage:

**jamás es fuente de verdad.**

**Regla 4**

Frontend:

**jamás crea paths.**

**Regla 5**

Frontend:

**jamás confirma existencia.**

**Regla 6**

Uploads:

**requieren confirmación server-side.**

**Regla 7**

Storage:

**tenant-scoped obligatorio.**

**Regla 8**

Buckets:

**privados obligatorios.**

**Regla 9**

Signed URLs:

**temporales y restringidas.**

**Regla 10**

Delete:

**async obligatorio.**

**Regla 11**

Timeline:

**solo tras archivo activo.**

**Regla 12**

Cleanup:

**workers dedicados.**

**Regla 13**

Reconciliation:

**proceso independiente.**

**Regla 14**

Storage drift:

**inevitable y esperado.**

**Regla 15**

Hash:

**integridad primero.**

**Regla 16**

Lifecycle:

**preparado para quarantine.**
