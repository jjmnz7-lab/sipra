**ESPECIFICACIÓN DE ENTIDAD: envio_sugerido (El Outbox Inteligente)**

**1. Objetivo y Filosofía de la Entidad**

La entidad envio_sugerido NO envía mensajes automáticamente en V1 y NO
es una tabla de historial permanente. Es una **Entidad
Efímera-Operativa** que representa una intención de comunicación
preparada por el sistema.

Transforma el *\"tener que buscar a quién cobrar\"* en *\"aprobar
conversaciones ya preparadas\"*. Actúa como un Asistente Confiable: si
el contexto financiero cambia (ej. el cliente paga o promete pagar), la
sugerencia se invalida sola para evitar fricción social.

**Nombre de Tabla:** envio_sugerido

**2. Estructura de Campos (Esquema Físico)**

  -------------------------------------------------------------------------------------------
  **Campo**           **Tipo**       **Reglas y               **Propósito**
                                     Restricciones**          
  ------------------- -------------- ------------------------ -------------------------------
  id                  UUID           **PK**, DEFAULT          Identificador único de la
                                     gen_random_uuid()        sugerencia.

  academia_id         UUID           **FK, NOT NULL**,        **Tenant isolation.**
                                     Indexado                 

  persona_id          UUID           **FK, NOT NULL**,        Destinatario principal
                                     Indexado                 (Alumno/Tutor).

  cargo_id            UUID           **FK**, NULLABLE,        Deuda específica que origina el
                                     Indexado                 envío.

  grupo_envio_id      UUID           NULLABLE, Indexado       **Consolidación:** Agrupa
                                                              múltiples sugerencias en un
                                                              solo disparo.

  grupo_id            UUID           **FK**, NULLABLE         Grupo origen (si es aviso
                                                              operativo/colectivo).

  created_by          UUID           **FK**, NULLABLE         Quién generó el envío (Null =
                                                              Sistema/Cron).

  tipo_mensaje        Varchar(50)    **NOT NULL**             recordatorio_pago,
                                                              aviso_operativo,
                                                              seguimiento_promesa.

  canal               Varchar(30)    **NOT NULL**, DEFAULT    Medio de contacto proyectado.
                                     \'whatsapp\'             

  telefono_snapshot   Varchar(20)    **NOT NULL**             Teléfono exacto usado al
                                                              momento de la sugerencia
                                                              (Inmutable).

  texto_propuesto     Text           **NOT NULL**             Texto limpio y renderizado. La
                                                              UI no compone templates.

  wa_link             Text           **NOT NULL**             URL pre-calculada y codificada
                                                              (https://wa.me/\...).

  template_snapshot   JSONB          **NOT NULL**, DEFAULT    Variables de contexto (nombre,
                                     \'{}\'                   monto) usadas en la generación.

  estado              Varchar(30)    **NOT NULL**, DEFAULT    Estado de la máquina operativa.
                                     \'pendiente_revision\'   

  prioridad           Smallint       **NOT NULL**, DEFAULT 1  Orden visual: 1 (Baja), 2
                                                              (Media), 3 (Alta).

  motivo_generacion   Varchar(100)   NULLABLE                 Contexto interno (ej.
                                                              vencimiento_manana).

  invalid_reason      Varchar(150)   NULLABLE                 Justificación del sistema en
                                                              caso de autodescarte.

  scheduled_for       Timestamptz    NULLABLE                 Cuándo debería idealmente
                                                              enviarse.

  expires_at          Timestamptz    NULLABLE                 **GC Rule:** Cuándo \"caduca\"
                                                              y se vuelve basura operativa.

  reviewed_at         Timestamptz    NULLABLE                 Momento de revisión humana
                                                              (aprobación/descarte).

  reviewed_by         UUID           **FK**, NULLABLE         Usuario que ejecutó la
                                                              revisión.

  enviado_at          Timestamptz    NULLABLE                 Momento del disparo manual
                                                              (Click-to-chat).

  created_at          Timestamptz    DEFAULT now()            Auditoría de creación.

  updated_at          Timestamptz    DEFAULT now()            Auditoría (Actualizado por
                                                              Trigger).
  -------------------------------------------------------------------------------------------

**3. Máquina de Estados (Semántica Estricta)**

  -----------------------------------------------------------------------------------------
  **Estado**               **Significado Real**                           **Mutabilidad**
  ------------------------ ---------------------------------------------- -----------------
  **pendiente_revision**   Visible en el Outbox. Espera acción humana o   Mutable
                           trigger de invalidación.                       

  **enviado**              **El usuario disparó la acción manual          Terminal /
                           (Click-to-chat). NO significa confirmación de  Inmutable
                           lectura de Meta.**                             

  **descartado_humano**    El usuario decidió ignorar o borrar la         Terminal /
                           sugerencia manualmente.                        Inmutable

  **invalidado**           El sistema la canceló automáticamente (pago    Terminal /
                           recibido, promesa activa).                     Inmutable

  **expirado**             Superó la barrera de expires_at sin ser        Terminal /
                           gestionada.                                    Inmutable
  -----------------------------------------------------------------------------------------

**4. Restricciones a Nivel Motor (Constraints & Índices)**

- **Protección Anti-Duplicados / Anti-Spam:**

> CREATE UNIQUE INDEX uq_envio_activo ON envio_sugerido (academia_id,
> cargo_id, tipo_mensaje) WHERE estado = \'pendiente_revision\';

- **Índices Operativos de la UI:**

  - CREATE INDEX idx_envio_outbox ON envio_sugerido (academia_id,
    estado, prioridad, created_at DESC);

  - CREATE INDEX idx_envio_persona ON envio_sugerido (academia_id,
    persona_id, estado);

- **Reglas Lógicas (CHECKs):**

  - CHECK (estado IN (\'pendiente_revision\', \'enviado\',
    \'descartado_humano\', \'invalidado\', \'expirado\'))

  - CHECK (prioridad BETWEEN 1 AND 3)

  - CHECK (char_length(trim(texto_propuesto)) \> 0)

**5. El Ciclo de Vida Determinista (Cron Job Nocturno)**

El proceso automatizado se ejecutará en una ventana de \"hora muerta\"
local (ej. 2:00 AM usando now() AT TIME ZONE academia.timezone) bajo un
orden de ejecución estricto:

1.  **Fase 1: Limpieza (Garbage Collection).**

> UPDATE envio_sugerido SET estado = \'expirado\' WHERE expires_at \<
> now() AND estado = \'pendiente_revision\';

2.  **Fase 2: Invalidación Financiera Rezagada.**

> Verificar y marcar como invalidado cualquier registro cuyo cargo ya
> esté liquidado o tenga una promesa vigente.

3.  **Fase 3: Generación Inteligente.**

> Evaluar vencimientos e inyectar nuevas sugerencias respetando la regla
> del \"Silenciador\" (Verificar que no haya envíos recientes en base a
> academia.config_cobro-\>\>\'horas_minimas_recordatorio\').

**6. Protocolo de Consolidación y Envío (Regla Multi-Deuda)**

Cuando un alumno debe múltiples cargos, la UI agrupa las sugerencias
visualmente por persona_id. Al presionar *\"Enviar mensaje
consolidado\"*, el Backend ejecuta una operación atómica:

1.  **Marcado Masivo:** Actualiza todas las filas afectadas de
    envio_sugerido a estado = \'enviado\'.

2.  **Identidad Común:** A todas se les asigna el mismo UUID recién
    generado en grupo_envio_id y el mismo enviado_at.

3.  **Inmutabilidad del Mensaje Original:** El campo texto_propuesto de
    la base de datos **nunca se sobrescribe**, conservando la propuesta
    original del sistema.

4.  **Registro del Snapshot Editado:** Se inserta UN SOLO evento en
    evento_timeline (categoría comunicacion). Dentro de su metadata se
    inyecta el sent_payload_snapshot, capturando el texto final que el
    usuario editó o consolidó antes de abrir WhatsApp.

**7. Integración Transaccional Obligatoria (Auto-Invalidación)**

Es una regla arquitectónica congelada que **toda mutación financiera**
impacte al Outbox.

Si una RPC ejecuta un pago (creando un AplicacionMovimiento) o registra
una prórroga, DEBE incluir en la misma transacción:

SQL

UPDATE envio_sugerido

SET estado = \'invalidado\',

invalid_reason = \'Motivo de invalidación (ej. Pago detectado)\'

WHERE cargo_id = :id

AND estado = \'pendiente_revision\';

**8. Seguridad y Row Level Security (RLS)**

- **Activación:** ALTER TABLE envio_sugerido ENABLE ROW LEVEL SECURITY;

- **Política de Lectura (SELECT):** USING
  (is_auth_user_for_tenant(academia_id));

- **Política de Escritura (INSERT, UPDATE):** WITH CHECK
  (is_auth_user_for_tenant(academia_id) AND
  can_write_to_academia(academia_id));

- **Política de Borrado (DELETE):** USING (false); (Mantenemos la
  historia íntegra para analíticas).
