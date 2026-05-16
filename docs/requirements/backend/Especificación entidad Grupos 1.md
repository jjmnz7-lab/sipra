**ESPECIFICACIÓN DE ENTIDAD: grupo**

**SIPRA V1 --- Contenedor Operativo Flexible Multi-tenant**

**1. Objetivo de la Entidad**

La entidad grupo representa una agrupación operativa flexible de
personas dentro de una academia.

Su propósito es facilitar:

- organización,

- cobranza masiva,

- comunicación colectiva,

- filtros operativos,

- generación de eventos,

- y navegación contextual.

**2. Filosofía del Dominio**

grupo NO representa:

- un salón escolar rígido,

- matrícula formal,

- estructura ERP,

- ni contabilidad colectiva.

Representa:

**una unidad operativa flexible.**

Ejemplos válidos:

- Categoría 2015

- Ballet Inicial

- Porteros

- Turno Vespertino

- Jazz Infantil

- Sede Norte

**3. Principios Arquitectónicos**

**Principio 1 --- Grupo NO posee deuda**

Los cargos:

**siempre son individuales.**

Un "cobro grupal":

- NO crea deuda grupal,

- NO comparte saldo,

- NO genera estados colectivos.

Simplemente:

- genera múltiples cargos individuales.

**Principio 2 --- Grupo es organizador, no ledger**

grupo sirve para:

- seleccionar personas,

- operar masivamente,

- comunicar,

- organizar.

NO:

- para contabilidad consolidada.

**Principio 3 --- Multi-membership permitido**

Una persona:

- puede pertenecer a múltiples grupos simultáneamente.

Ejemplo:

- Categoría 2015

- Clínica de Porteros

- Torneo Estatal

**4. Nombre Físico de Tabla**

grupo

**5. Estructura Física de Campos**

  ---------------------------------------------------------------------------
  **Campo**      **Tipo**       **Restricciones / Reglas**    **Propósito**
  -------------- -------------- ----------------------------- ---------------
  id             uuid           PK, NOT NULL, DEFAULT         Identificador
                                gen_random_uuid()             único

  academia_id    uuid           FK NOT NULL                   Tenant owner

  nombre         varchar(120)   NOT NULL                      Nombre
                                                              operativo

  descripcion    text           NULLABLE                      Contexto
                                                              opcional

  color          varchar(20)    NULLABLE                      Identidad
                                                              visual ligera

  estado         varchar(20)    NOT NULL DEFAULT \'activo\'   Estado lógico

  orden_visual   integer        NOT NULL DEFAULT 0            Ordenamiento UI

  created_by     uuid           FK usuario NULLABLE           Auditoría

  created_at     timestamptz    NOT NULL DEFAULT now()        Auditoría

  updated_at     timestamptz    NOT NULL DEFAULT now()        Auditoría
  ---------------------------------------------------------------------------

**6. Índices Recomendados**

**Primary Key**

PRIMARY KEY (id)

**Índice tenant**

INDEX idx_grupo_academia\
ON grupo (academia_id)

**Índice búsqueda rápida**

INDEX idx_grupo_nombre\
ON grupo (academia_id, lower(nombre))

**Índice estado**

INDEX idx_grupo_estado\
ON grupo (academia_id, estado)

**Restricción unique lógica**

Evita grupos duplicados dentro del mismo tenant.

UNIQUE (academia_id, lower(nombre))

**7. Restricciones a Nivel de Base de Datos**

**Estado válido**

CHECK (\
estado IN (\
\'activo\',\
\'archivado\'\
)\
)

**Nombre obligatorio**

CHECK (\
char_length(trim(nombre)) \> 0\
)

**Orden visual válido**

CHECK (\
orden_visual \>= 0\
)

**8. Máquina de Estados**

**Campo**

estado

**Estados posibles**

  ------------------------------
  **Estado**   **Descripción**
  ------------ -----------------
  activo       Grupo operativo

  archivado    Grupo oculto/no
               operativo
  ------------------------------

**Transition Rules**

  ---------------------------------------
  **Estado    **Nuevo     **Permitido**
  Actual**    Estado**    
  ----------- ----------- ---------------
  activo      archivado   Sí

  archivado   activo      Sí
  ---------------------------------------

**9. Reglas Operativas por Estado**

**activo**

Permite:

- agregar personas,

- generar cargos grupales,

- generar avisos,

- aparecer en filtros,

- participar en automatización.

**archivado**

Bloquea:

- nuevas relaciones activas,

- nuevos cargos grupales,

- nuevos avisos.

Pero conserva:

- historial,

- cargos anteriores,

- timeline,

- trazabilidad.

**Regla oficial V1**

**Nunca hacer DELETE físico.**

**Archivado:**

soft delete lógico.

**10. Relación Many-to-Many con Persona**

**Tabla pivote requerida**

persona_grupo

**Filosofía**

Una persona:

- puede pertenecer a múltiples grupos.

Un grupo:

- puede contener múltiples personas.

**11. Especificación Relacional: persona_grupo**

**Nombre físico**

persona_grupo

**Objetivo**

Representar pertenencia operativa flexible.

NO matrícula rígida.

**Estructura de Campos**

  -----------------------------------------------------------------------
  **Campo**           **Tipo**      **Restricciones /     **Propósito**
                                    Reglas**              
  ------------------- ------------- --------------------- ---------------
  id                  uuid          PK DEFAULT            Identificador
                                    gen_random_uuid()     técnico

  academia_id         uuid          FK NOT NULL           Tenant
                                                          isolation

  persona_id          uuid          FK NOT NULL           Persona

  grupo_id            uuid          FK NOT NULL           Grupo

  estado              varchar(20)   DEFAULT \'activo\'    Estado lógico

  fecha_inscripcion   timestamptz   DEFAULT now()         Alta operativa

  fecha_remocion      timestamptz   NULLABLE              Baja lógica

  created_by          uuid          FK usuario NULLABLE   Auditoría

  created_at          timestamptz   DEFAULT now()         Auditoría

  updated_at          timestamptz   DEFAULT now()         Auditoría
  -----------------------------------------------------------------------

**Restricción unique**

UNIQUE (persona_id, grupo_id)

**Restricción estado**

CHECK (\
estado IN (\
\'activo\',\
\'removido\'\
)\
)

**Filosofía relacional**

La relación:

**NO se elimina físicamente.**

Puede:

- activarse,

- removerse,

- reactivarse.

**Regla de reactivación**

Si existe relación:

estado=\'removido\'

↓

El backend debe:

- reactivar,

- NO insertar nueva fila.

**Beneficios**

✅ Historial preservado\
✅ Auditoría consistente\
✅ Idempotencia\
✅ Compatibilidad móvil/retries\
✅ Compatible con timeline futuro

**12. Reglas Multi-tenant**

**Regla absoluta**

Toda relación:

- grupo,

- persona,

- persona_grupo

debe pertenecer:\
a la MISMA academia.

**Prohibido**

Relaciones cross-tenant.

**Validación obligatoria backend/RPC**

Antes de crear relación:\
verificar:

- misma academia,

- tenant activo.

**13. Seguridad / RLS**

**Activación**

ALTER TABLE grupo ENABLE ROW LEVEL SECURITY;

ALTER TABLE persona_grupo ENABLE ROW LEVEL SECURITY;

**Filosofía**

Un usuario:\
solo puede operar:\
datos de su tenant.

**Fuente oficial tenant**

Tabla:

usuario

NO JWT únicamente.

**Política conceptual SELECT**

USING (\
EXISTS (\
SELECT 1\
FROM usuario u\
WHERE u.auth_user_id = auth.uid()\
AND u.academia_id = grupo.academia_id\
AND u.estado = \'activo\'\
)\
)

**Política escritura (INSERT/UPDATE)**

Debe validar:

- usuario activo,

- tenant ownership,

- academia activa.

**Concepto arquitectónico**

**Readonly mode:**

ley física de BD.

NO ilusión frontend.

**Política conceptual escritura**

WITH CHECK (\
can_write_tenant_data(grupo.academia_id)\
)

**DELETE público prohibido**

USING (false)

**14. Cobro Grupal --- Regla Oficial**

**"Cobro grupal" NO existe físicamente**

El backend:

- consulta miembros activos,

- genera cargos individuales.

**Ejemplo**

Grupo:

Categoría 2015

↓

20 personas activas.

↓

Usuario crea:

Uniforme \$500

↓

Backend:\
crea:\
20 registros independientes en cargo.

**Exclusiones**

Si usuario excluye:

- Sofía,

- Juan.

↓

Se crean:\
18 cargos.

**Beneficio arquitectónico**

Cada cargo:

- tiene vida propia,

- saldo propio,

- timeline propio,

- automatización propia,

- promesas propias.

**15. Eventos Grupales**

Los eventos grupales:

- nacen desde grupo,

- pero se proyectan individualmente.

Ejemplo:

Ensayo General

↓

Genera:\
eventos individuales en evento_timeline.

**16. UX / Comportamiento Operativo**

**Objetivo UX**

grupo debe sentirse:

- rápido,

- táctico,

- operacional,

- móvil-first.

NO:

- administrativo pesado.

**Vista principal debe mostrar**

- nombre,

- total miembros,

- resumen financiero,

- pendientes,

- próximo evento opcional.

**Vista interna debe permitir**

- crear cargo grupal,

- generar resumen,

- crear aviso,

- navegar a seguimiento individual.

**17. Reglas Backend / RPC**

**RPC recomendada:**

agregar_persona_a_grupo

**Algoritmo oficial**

1\. Buscar relación persona_id + grupo_id\
2. Si NO existe:\
INSERT\
3. Si existe removida:\
UPDATE estado=\'activo\'\
4. Si ya existe activa:\
retornar éxito idempotente

**RPC:**

remover_persona_de_grupo

UPDATE persona_grupo\
SET\
estado=\'removido\',\
fecha_remocion=now(),\
updated_at=now()

**RPC:**

crear_cargo_grupal

Responsabilidades:

- validar tenant,

- validar grupo activo,

- excluir personas opcionales,

- crear N cargos individuales,

- insertar timelines.

**RPC:**

generar_resumen_grupal

Genera:

- lista verde,

- lista roja,

- texto WhatsApp compartible.

**RPC:**

crear_aviso_grupal

Responsabilidades:

- crear evento operativo,

- proyectar timelines,

- generar sugerencias.

**18. Triggers Recomendados**

**updated_at automático**

NEW.updated_at = now()

**19. Reglas Arquitectónicas Congeladas**

✅ Grupo = contenedor operativo flexible\
✅ Cobro grupal = múltiples cargos individuales\
✅ Many-to-many flexible\
✅ academia_id obligatorio\
✅ RLS obligatorio\
✅ Readonly mode vía BD\
✅ Sin DELETE físico\
✅ Soft delete lógico\
✅ Reactivación en vez de recreación\
✅ UUID surrogate keys\
✅ Single DB + Shared Schema\
✅ PostgreSQL-first architecture\
✅ Tenant isolation obligatorio
