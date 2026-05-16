**ESPECIFICACIÓN DE ENTIDAD: envio_sugerido**

**SIPRA V1 --- Outbox / Automatización Asistida / Gestión Operativa de
Cobranza**

**1. Objetivo de la entidad**

envio_sugerido representa una:

**intención operativa de comunicación**

generada automáticamente por el sistema.

No representa:

- el mensaje enviado oficialmente,

- ni una conversación real.

Representa:

- una recomendación contextual,

- pendiente de revisión humana,

- para contactar a una persona respecto a un cargo o situación
  operativa.

**2. Filosofía de dominio**

SIPRA V1 NO automatiza WhatsApp directamente.

El sistema:

- detecta situaciones,

- prioriza personas,

- prepara mensajes,

- construye enlaces,

- y deja la decisión final al usuario humano.

**3. Filosofía UX**

La entidad existe para transformar:

\"tener que cobrar manualmente\"

en:

\"aprobar conversaciones ya preparadas\"

**4. Filosofía operativa**

envio_sugerido es:

**una cola operativa efímera.**

No es:

- CRM,

- inbox real,

- historial permanente,

- ni sistema de mensajería.

Es:

- una lista temporal de acciones recomendadas.

**5. Principio crítico de diseño**

**El sistema debe autocorregirse**

Si:

- el cargo se paga,

- se registra promesa,

- se anula la deuda,

- o expira el contexto,

la sugerencia debe:

**invalidarse automáticamente**

antes de que el usuario genere fricción social.

**6. Nombre físico de tabla**

envio_sugerido

**7. Estructura física de campos**

  ---------------------------------------------------------------------------------------
  **Campo**               **Tipo**       **Reglas y               **Propósito**
                                         restricciones**          
  ----------------------- -------------- ------------------------ -----------------------
  id                      uuid           PK, DEFAULT              Identificador único
                                         gen_random_uuid()        

  academia_id             uuid           FK, NOT NULL, indexado   Tenant isolation

  persona_id              uuid           FK, NOT NULL, indexado   Destinatario principal

  cargo_id                uuid           FK, NOT NULL, indexado   Cargo detonante

  grupo_envio_id          uuid           NULLABLE, indexado       Agrupación lógica de
                                                                  múltiples sugerencias

  created_by              uuid           FK usuario nullable      Quién creó manualmente
                                                                  la sugerencia

  tipo_sugerencia         varchar(30)    NOT NULL                 Tipo operativo

  prioridad               smallint       NOT NULL DEFAULT 1       Prioridad numérica

  estado                  varchar(30)    NOT NULL DEFAULT         Estado operativo
                                         \'pendiente_revision\'   

  mensaje_preview         text           NOT NULL                 Texto renderizado
                                                                  visible

  action_url              text           NOT NULL                 URL completa wa.me o
                                                                  esquema equivalente

  telefono_snapshot       varchar(25)    NULLABLE                 Número utilizado al
                                                                  generar el link

  metadata                jsonb          NOT NULL DEFAULT \'{}\'  Snapshot contextual

  invalid_reason          varchar(150)   NULLABLE                 Razón de invalidación
                                                                  automática

  expires_at              timestamptz    NULLABLE                 Caducidad operativa

  fecha_sugerencia        date           NOT NULL DEFAULT         Día lógico de
                                         CURRENT_DATE             generación

  reviewed_at             timestamptz    NULLABLE                 Momento de revisión

  reviewed_by             uuid           FK usuario nullable      Quién revisó

  enviado_at              timestamptz    NULLABLE                 Momento en que se
                                                                  disparó el envío

  sent_payload_snapshot   jsonb          NULLABLE                 Mensaje final
                                                                  efectivamente enviado

  created_at              timestamptz    NOT NULL DEFAULT now()   Auditoría

  updated_at              timestamptz    NOT NULL DEFAULT now()   Auditoría
  ---------------------------------------------------------------------------------------

**8. Filosofía de mensaje_preview**

El backend debe generar:

- el mensaje final renderizado,

- listo para visualizar,

- listo para copiar,

- listo para enviar.

El frontend:

**NO reconstruye templates.**

**9. Filosofía de action_url**

action_url debe contener:

**la URL completa y funcional**

ya:

- codificada,

- renderizada,

- lista para abrir.

**10. Ejemplo de action_url**

https://wa.me/6691234567?text=Hola%20Sof%C3%ADa\...

**11. Regla arquitectónica congelada**

La generación de:

- URL encoding,

- concatenación,

- construcción del link,

ocurre:

**exclusivamente en Backend/RPC.**

**12. Filosofía de grupo_envio_id**

La BD mantiene:

**1 sugerencia = 1 cargo**

para:

- trazabilidad,

- invalidación,

- automatización,

- consistencia.

Pero la UI puede:

**agrupar visualmente por persona**

para consolidar conversación humana.

**13. Ejemplo de consolidación UI**

**BD**

  ----------------------------
  **Cargo**   **Sugerencia**
  ----------- ----------------
  Mayo        Registro 1

  Junio       Registro 2

  Uniforme    Registro 3
  ----------------------------

**UI**

Sofía Martínez\
- Mensualidad Mayo \$800\
- Mensualidad Junio \$800\
- Uniforme \$300\
\
Total: \$1,900

**14. Estados operativos**

  --------------------------------------------
  **Estado**           **Significado**
  -------------------- -----------------------
  pendiente_revision   Visible en Outbox

  enviado              Usuario disparó acción
                       WhatsApp

  descartado_humano    Usuario decidió ignorar

  invalidado           Sistema descartó
                       automáticamente

  expirado             Caducó operativamente
  --------------------------------------------

**15. Significado exacto de enviado**

**MUY IMPORTANTE**

En V1:

**NO significa "Meta confirmó entrega".**

Solo significa:

**"el usuario disparó manualmente la acción".**

No existe:

- confirmación de entrega,

- confirmación de lectura,

- webhook oficial.

**16. Máquina de estados**

**Estado inicial**

pendiente_revision

**pendiente_revision → enviado**

**Trigger**

Usuario:

- hace click,

- abre WhatsApp,

- o confirma envío consolidado.

**Efectos**

- registra timestamps,

- reviewed_by,

- enviado_at,

- timeline.

**pendiente_revision → descartado_humano**

**Trigger**

Usuario:

- ignora,

- omite,

- o descarta manualmente.

**pendiente_revision → invalidado**

**Trigger automático**

Sistema detecta:

- pago,

- liquidación,

- promesa activa,

- cargo anulado,

- conflicto operativo.

**pendiente_revision → expirado**

**Trigger automático**

expires_at \< now().

**17. Restricciones a nivel motor**

**Estados válidos**

CHECK (\
estado IN (\
\'pendiente_revision\',\
\'enviado\',\
\'descartado_humano\',\
\'invalidado\',\
\'expirado\'\
)\
)

**Prioridad válida**

CHECK (prioridad IN (1,2,3))

**Tipo válido**

CHECK (\
tipo_sugerencia IN (\
\'recordatorio_proximo\',\
\'cobro_vencido\',\
\'seguimiento_promesa\',\
\'recordatorio_grupal\',\
\'mensaje_manual\',\
\'alerta_sistema\'\
)\
)

**Texto obligatorio**

CHECK (char_length(trim(mensaje_preview)) \> 0)

**URL obligatoria**

CHECK (char_length(trim(action_url)) \> 0)

**18. Índices recomendados**

**Outbox principal**

CREATE INDEX idx_envio_outbox\
ON envio_sugerido (\
academia_id,\
estado,\
prioridad,\
created_at DESC\
);

**Por persona**

CREATE INDEX idx_envio_persona\
ON envio_sugerido (\
academia_id,\
persona_id,\
estado\
);

**Por cargo**

CREATE INDEX idx_envio_cargo\
ON envio_sugerido (\
academia_id,\
cargo_id\
);

**Por grupo de envío**

CREATE INDEX idx_envio_grupo\
ON envio_sugerido (\
grupo_envio_id\
);

**Pendientes solamente**

CREATE INDEX idx_envio_pendientes\
ON envio_sugerido (\
academia_id,\
created_at DESC\
)\
WHERE estado = \'pendiente_revision\';

**19. Restricción anti-duplicados**

**Regla**

No deben existir dos sugerencias activas equivalentes:

- mismo cargo,

- mismo tipo,

- misma fecha lógica,

- mismo estado pendiente.

**Índice único parcial**

CREATE UNIQUE INDEX uq_envio_pendiente\
ON envio_sugerido (\
academia_id,\
cargo_id,\
tipo_sugerencia,\
fecha_sugerencia\
)\
WHERE estado = \'pendiente_revision\';

**20. Seguridad / RLS**

**Activación**

ALTER TABLE envio_sugerido ENABLE ROW LEVEL SECURITY;

**SELECT**

Solo tenant autorizado.

**INSERT**

Solo backend/RPC/procesos autorizados.

**UPDATE**

Usuario solo puede:

- marcar enviado,

- descartar,

- o revisar.

No puede:

- mutar mensaje original,

- alterar payload histórico,

- ni editar action_url.

**DELETE**

USING (false)

Borrado físico prohibido.

**21. Reglas críticas de consistencia**

**Regla 1 --- Invalidación automática transaccional**

Si:

- un cargo queda liquidado,

- o entra en promesa,

todas sus sugerencias pendientes deben invalidarse:

**dentro de la misma transacción.**

**Ejemplo**

UPDATE envio_sugerido\
SET estado = \'invalidado\',\
invalid_reason = \'Cargo liquidado\'\
WHERE cargo_id = X\
AND estado = \'pendiente_revision\';

**Regla 2 --- Snapshot defensivo**

metadata debe almacenar:

- monto,

- días de atraso,

- saldo,

- concepto,

- contexto temporal.

Aunque luego cambie el cargo.

**Regla 3 --- Snapshot de envío real**

Si el usuario:

- edita mensaje,

- consolida múltiples cargos,

- personaliza texto,

el resultado final debe guardarse en:

sent_payload_snapshot

**22. Garbage Collection operativo**

El Cron Job nocturno debe:

**Fase 1 --- Limpieza**

UPDATE envio_sugerido\
SET estado = \'expirado\'\
WHERE expires_at \< now()\
AND estado = \'pendiente_revision\';

**Fase 2 --- Generación**

Luego:

- recalcular candidatos,

- aplicar silenciamiento,

- generar nuevas sugerencias.

**23. Algoritmo operativo nocturno**

**Paso 1 --- Buscar candidatos**

saldo_pendiente \> 0\
AND estado_financiero IN (\...)

**Paso 2 --- Aplicar silenciamiento**

Excluir:

- promesas activas,

- anulados,

- cooldown reciente,

- ya enviados recientemente.

**Paso 3 --- Calcular prioridad**

  -------------------------------
  **Condición**   **Prioridad**
  --------------- ---------------
  vencido \> 7    3
  días            

  vencido \<= 7   2
  días            

  próximo a       1
  vencer          
  -------------------------------

**Paso 4 --- Renderizar mensaje**

Construir:

- template,

- snapshot,

- URL final,

- metadata.

**Paso 5 --- Insertar sugerencia**

**24. Cooldown configurable**

No hardcodear:

48 horas

Debe venir desde:

academia.config_cobro

Ejemplo:

{\
\"horas_minimas_recordatorio\": 48\
}

**25. Integración con Timeline**

**Eventos generados**

  ---------------------------------------
  **Acción**      **Evento**
  --------------- -----------------------
  sugerencia      recordatorio_sugerido
  creada          

  envío disparado whatsapp_enviado

  descarte humano envio_descartado

  invalidación    autodescarte_envio
  automática      
  ---------------------------------------

**26. Integración UI obligatoria**

**Regla UX**

La UI debe:

**agrupar visualmente por persona_id**

aunque la BD mantenga:

**granularidad por cargo.**

**27. Protección contra race conditions**

Toda operación crítica:

- debe usar transacciones,

- invalidar antes del commit,

- idealmente usar FOR UPDATE\
  sobre cargos relacionados.

**28. Reglas arquitectónicas congeladas**

✅ Outbox humano-asistido\
✅ 1 sugerencia = 1 cargo\
✅ Consolidación visual en UI\
✅ action_url generado por backend\
✅ Snapshot histórico obligatorio\
✅ Invalidación automática transaccional\
✅ Garbage collection nocturno\
✅ Cooldown configurable\
✅ Estados terminales inmutables\
✅ No DELETE físico\
✅ No edición libre del mensaje\
✅ Multi-tenant obligatorio\
✅ PostgreSQL-first architecture

**29. Resumen conceptual final**

envio_sugerido es:

**la bandeja de trabajo inteligente de SIPRA.**

No automatiza conversaciones:

**prepara decisiones humanas.**

Es el puente entre:

- automatización,

- cobranza,

- y sensibilidad relacional.
