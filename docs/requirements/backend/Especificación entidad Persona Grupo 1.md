**ESPECIFICACIÓN COMPLETA Y ACTUALIZADA --- ENTIDAD: persona_grupo**

**1. Filosofía de la Entidad**

La entidad persona_grupo representa:

**la membresía operativa e histórica**

entre una persona y un grupo.

NO es una simple tabla pivote técnica.

Es:

- un registro de inscripción,

- una fuente histórica,

- una pieza clave de segmentación operativa.

**Filosofía central**

La entidad debe responder:

¿Esta persona pertenece actualmente al grupo?

y también:

¿Desde cuándo pertenece originalmente?

**Objetivo operacional**

Permitir:

✅ segmentación masiva\
✅ cobranza grupal\
✅ organización táctica\
✅ trazabilidad histórica\
✅ reingresos limpios\
✅ Timeline coherente\
✅ aislamiento tenant

**2. Responsabilidades de la Entidad**

persona_grupo es responsable de:

✅ relación persona ↔ grupo\
✅ membresía activa/removida\
✅ trazabilidad histórica\
✅ filtro de cobranza grupal\
✅ fuente para generación masiva de cargos\
✅ narrativa operativa del Timeline

**NO es responsable de**

❌ deuda grupal\
❌ balances\
❌ asistencia formal\
❌ control escolar\
❌ permisos\
❌ automatización financiera

**3. Nombre Físico de Tabla**

persona_grupo

**4. Estructura de Campos (Esquema Físico)**

  ------------------------------------------------------------------------------
  **Campo**           **Tipo**      **Reglas y            **Propósito**
                                    Restricciones**       
  ------------------- ------------- --------------------- ----------------------
  id                  UUID          PK, DEFAULT           Identificador único de
                                    gen_random_uuid()     membresía

  academia_id         UUID          FK, NOT NULL, INDEX   Tenant isolation

  persona_id          UUID          FK, NOT NULL, INDEX   Persona vinculada

  grupo_id            UUID          FK, NOT NULL, INDEX   Grupo relacionado

  estado              VARCHAR(20)   NOT NULL DEFAULT      Estado actual de
                                    \'activo\'            membresía

  fecha_inscripcion   TIMESTAMPTZ   NOT NULL DEFAULT      Primera inscripción
                                    now()                 histórica

  fecha_baja          TIMESTAMPTZ   NULLABLE              Última salida

  origen              VARCHAR(30)   NULLABLE              Fuente de creación

  notas               TEXT          NULLABLE              Contexto operativo
                                                          ligero

  created_by          UUID          FK usuario(id),       Auditoría
                                    NULLABLE              

  created_at          TIMESTAMPTZ   NOT NULL DEFAULT      Auditoría
                                    now()                 

  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT      Auditoría
                                    now()                 
  ------------------------------------------------------------------------------

**5. Filosofía de id**

La entidad:

**tiene identidad propia.**

Por lo tanto:

id UUID PRIMARY KEY

**Razones arquitectónicas**

Permite:

✅ Realtime limpio en Supabase\
✅ referencias simples\
✅ debugging más fácil\
✅ Timeline más simple\
✅ evolución futura\
✅ metadata futura\
✅ compatibilidad con caches/UI modernas

**6. Restricción de Unicidad Real**

La membresía:

**solo puede existir una vez.**

**Constraint oficial**

UNIQUE (\
academia_id,\
persona_id,\
grupo_id\
)

**Filosofía**

La relación:

**nunca se duplica.**

Solo:

- cambia de estado,

- se reactiva,

- se remueve.

**7. Estados Permitidos**

  ------------------------------
  **Estado**   **Significado**
  ------------ -----------------
  activo       Actualmente
               pertenece

  removido     Ya no pertenece
  ------------------------------

**Filosofía de simplificación**

NO usar:

- inactivo,

- archivado,

- suspendido,\
  en esta tabla.

**Razón**

Evitar:

**ERPitis**

La membresía:\
solo responde:

¿Pertenece actualmente?

**8. Filosofía de fecha_inscripcion**

Este campo:

**JAMÁS debe sobrescribirse.**

Representa:

la primera vez histórica\
que ingresó al grupo.

**Incluso en reingresos**

NO modificar:

fecha_inscripcion

**Razón**

Preserva:

✅ antigüedad\
✅ cohortes\
✅ analytics\
✅ permanencia histórica\
✅ lifetime value

**El flujo temporal detallado vive en:**

evento_timeline

**9. Filosofía de fecha_baja**

Representa:

última salida conocida

**Regla operativa**

Si:

estado = activo

Entonces:

fecha_baja = NULL

**10. Restricciones a Nivel Motor (CHECK Constraints)**

**Estado válido**

CHECK (\
estado IN (\
\'activo\',\
\'removido\'\
)\
)

**Fechas coherentes**

CHECK (\
fecha_baja IS NULL\
OR fecha_baja \>= fecha_inscripcion\
)

**Origen válido (si se usa)**

CHECK (\
origen IS NULL\
OR origen IN (\
\'manual\',\
\'importacion\',\
\'onboarding\',\
\'api\',\
\'automatizacion\'\
)\
)

**11. Índices Recomendados**

**Tenant base**

CREATE INDEX idx_pg_academia\
ON persona_grupo (academia_id);

**Lookup grupo → personas**

CREATE INDEX idx_pg_grupo_lookup\
ON persona_grupo (\
academia_id,\
grupo_id,\
estado\
);

**Lookup persona → grupos**

CREATE INDEX idx_pg_persona_lookup\
ON persona_grupo (\
academia_id,\
persona_id,\
estado\
);

**12. Foreign Keys**

**Academia**

FOREIGN KEY (academia_id)\
REFERENCES academia(id)

**Persona**

FOREIGN KEY (persona_id)\
REFERENCES persona(id)

**Grupo**

FOREIGN KEY (grupo_id)\
REFERENCES grupo(id)

**Usuario**

FOREIGN KEY (created_by)\
REFERENCES usuario(id)

**13. Seguridad y RLS**

**Activación**

ALTER TABLE persona_grupo ENABLE ROW LEVEL SECURITY;

**SELECT**

USING (\
is_auth_user_for_tenant(academia_id)\
)

**INSERT / UPDATE**

WITH CHECK (\
is_auth_user_for_tenant(academia_id)\
AND can_write_to_academia(academia_id)\
)

**DELETE**

USING (false)

**14. Reglas Arquitectónicas Congeladas**

**Regla 1 --- Nunca DELETE físico**

Las membresías:

**jamás se eliminan físicamente.**

**Razón**

Preservar:

- Timeline,

- auditoría,

- analytics,

- trazabilidad.

**Regla 2 --- El grupo NO es financiero**

El grupo:

**solo segmenta personas.**

**La deuda:**

SIEMPRE vive individualmente en:

cargo

**Regla 3 --- Cobro grupal = batch generator**

Cuando:

crear_cargo_grupal()

La API:

- consulta miembros activos,

- genera múltiples cargos individuales.

**NO existe:**

deuda grupal compartida

**Regla 4 --- Solo miembros activos participan**

Toda generación masiva:\
debe filtrar:

WHERE estado = \'activo\'

**Regla 5 --- Persona y grupo deben compartir tenant**

Nunca permitir:

persona.academia_id != grupo.academia_id

**Validación obligatoria en backend/RPC.**

**15. Lógica Oficial de Reingreso (UPSERT)**

**Filosofía**

Una relación:

persona ↔ grupo

solo existe:

**una vez en toda la vida.**

**Reingreso correcto**

**Si existe:**

estado = removido

Entonces:

estado = activo\
fecha_baja = NULL\
updated_at = now()

**IMPORTANTE**

NO modificar:

fecha_inscripcion

**Razón**

Preservar:

- antigüedad,

- cohortes,

- historial real.

**16. Integración con Timeline**

**Alta**

Insertar:

tipo = inscripcion_grupo

**Baja**

Insertar:

tipo = baja_grupo

**El Timeline:**

es la fuente de verdad temporal.

La tabla:\
es el estado operativo actual.

**17. Integración con Cobranza**

**Fuente principal para batch de cargos**

La API:\
debe usar:

persona_grupo

como origen de:

- cargos grupales,

- mensualidades,

- cobros masivos.

**Ejemplo**

"Cobrar mensualidad a Categoría 2015"

↓

SELECT personas activas

↓

crear múltiples cargos individuales

**18. Filosofía UX**

Entidad optimizada para:

✅ organización táctica\
✅ grupos rápidos\
✅ operación móvil\
✅ filtros simples\
✅ batch operations\
✅ cobranza rápida

**NO optimizada aún para**

❌ asistencia formal\
❌ horarios\
❌ materias\
❌ control escolar\
❌ calendarios complejos

**19. Casos Reales Cubiertos**

**Caso A --- Alumno en múltiples grupos**

✅ soportado naturalmente

**Caso B --- Baja temporal**

✅ preserva historial

**Caso C --- Reingreso**

✅ reactivación limpia vía UPSERT

**Caso D --- Cobranza grupal**

✅ generación individual segura

**Caso E --- Analytics históricos**

✅ antigüedad preservada

**20. Estado de Madurez Arquitectónica**

Con esta definición:

**la capa relacional operativa de SIPRA queda completamente
consolidada.**

Ya existe:

✅ memberships históricas\
✅ multigrupo\
✅ cobranza masiva\
✅ multitenancy\
✅ timeline consistente\
✅ soft delete\
✅ idempotencia\
✅ trazabilidad real\
✅ analytics futuros\
✅ UX operacional ligera
