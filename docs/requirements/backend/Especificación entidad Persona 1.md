**ESPECIFICACIÓN COMPLETA Y ACTUALIZADA --- ENTIDAD: persona**

**1. Filosofía de la Entidad**

La entidad persona representa al sujeto operativo principal de SIPRA:

- alumno,

- tutor,

- cliente,

- responsable de pago.

En SIPRA V1:

**"Persona" representa a la unidad real de cobranza y comunicación.**

NO intenta modelar:

- relaciones familiares complejas,

- múltiples tutores,

- dependientes,

- árbol familiar académico.

La filosofía es:

**"La persona a la que el sistema le cobra y le escribe".**

Esto permite:

- simplicidad operativa,

- automatización consistente,

- WhatsApp-first UX,

- mínima fricción de captura,

- queries rápidas,

- Timeline centralizado.

**2. Responsabilidades de la Entidad**

La entidad persona es responsable de:

✅ Identidad operativa del cliente/alumno\
✅ Canal principal de comunicación (WhatsApp)\
✅ Estado financiero global cacheado\
✅ Punto central del Timeline\
✅ Relación con grupos\
✅ Relación con cargos\
✅ Relación con movimientos\
✅ Target del motor de automatización

**3. Nombre Físico de Tabla**

persona

**4. Estructura de Campos (Esquema Físico)**

  -------------------------------------------------------------------------------------
  **Campo**               **Tipo**       **Reglas y            **Propósito**
                                         Restricciones**       
  ----------------------- -------------- --------------------- ------------------------
  id                      UUID           PK, DEFAULT           Identificador único
                                         gen_random_uuid()     

  academia_id             UUID           FK, NOT NULL, INDEX   Tenant isolation

  nombre                  VARCHAR(100)   NOT NULL              Nombre(s) principales

  apellido                VARCHAR(100)   NULLABLE              Apellidos para
                                                               ordenamiento

  nombre_referencia       VARCHAR(100)   NULLABLE              Alumno real asociado
                                                               (ej. hijo)

  telefono_whatsapp       VARCHAR(20)    NULLABLE              Canal principal de
                                                               contacto

  email                   VARCHAR(150)   NULLABLE              Contacto secundario

  etiqueta                VARCHAR(50)    NOT NULL DEFAULT      Segmentación ligera UX
                                         \'alumno\'            

  estado_global           VARCHAR(20)    NOT NULL DEFAULT      Caché
                                         \'al_corriente\'      financiero/operativo

  estado_registro         VARCHAR(20)    NOT NULL DEFAULT      Estado lógico operativo
                                         \'activo\'            

  notas_internas          TEXT           NULLABLE              Contexto persistente
                                                               breve

  metadata                JSONB          NOT NULL DEFAULT      Datos flexibles no
                                         \'{}\'                críticos

  search_text             TEXT           NULLABLE              Texto consolidado para
                                                               búsqueda

  ultima_interaccion_at   TIMESTAMPTZ    NULLABLE              Última interacción
                                                               humana relevante

  fecha_baja              DATE           NULLABLE              Soft delete lógico

  created_by              UUID           FK usuario(id),       Auditoría
                                         NULLABLE              

  created_at              TIMESTAMPTZ    NOT NULL DEFAULT      Auditoría
                                         now()                 

  updated_at              TIMESTAMPTZ    NOT NULL DEFAULT      Auditoría
                                         now()                 
  -------------------------------------------------------------------------------------

**5. Filosofía del Modelo "Tutor Responsable"**

En V1:

**SIPRA trabaja bajo el modelo de "Responsable de Pago".**

Ejemplos:

  -------------------------------
  **Caso**     **Persona
               registrada**
  ------------ ------------------
  Alumno       El propio alumno
  adulto       

  Niño en      El tutor/padre
  academia     

  Hermanos     Puede repetirse el
               teléfono
  -------------------------------

**Ejemplo real**

  ----------------------------------
  **Campo**           **Valor**
  ------------------- --------------
  nombre              María López

  nombre_referencia   Carlitos

  telefono_whatsapp   526691234567
  ----------------------------------

**Razón arquitectónica**

El:

- ledger,

- Timeline,

- Outbox,

- cargos,

- automatización,\
  requieren:

**un único responsable operativo.**

**6. Filosofía de estado_global**

estado_global

**NO es fuente de verdad financiera.**

Es:

**caché operativo derivado.**

Objetivo:

- acelerar UI,

- badges,

- grupos,

- pendientes,

- búsquedas.

**Estados permitidos**

  -------------------------------------
  **Estado**     **Significado**
  -------------- ----------------------
  al_corriente   Sin deuda

  pendiente      Tiene saldo pendiente
                 no vencido

  vencido        Tiene al menos un
                 cargo vencido

  pausado        Tiene promesa activa
                 dominante

  archivado      Fuera de operación
  -------------------------------------

**Prioridad de cálculo**

vencido\
\> pausado\
\> pendiente\
\> al_corriente

**7. Restricciones a Nivel Motor (CHECK Constraints)**

**Estado global válido**

CHECK (\
estado_global IN (\
\'al_corriente\',\
\'pendiente\',\
\'vencido\',\
\'pausado\',\
\'archivado\'\
)\
)

**Estado registro válido**

CHECK (\
estado_registro IN (\
\'activo\',\
\'inactivo\',\
\'archivado\'\
)\
)

**Nombre válido**

CHECK (\
char_length(trim(nombre)) \> 0\
)

**Teléfono válido básico**

CHECK (\
telefono_whatsapp IS NULL\
OR char_length(telefono_whatsapp) BETWEEN 10 AND 20\
)

**Etiqueta válida**

CHECK (\
etiqueta IN (\
\'alumno\',\
\'tutor\',\
\'staff_externo\'\
)\
)

**8. Índices Recomendados**

**Tenant base**

CREATE INDEX idx_persona_academia\
ON persona (academia_id);

**Estado operativo**

CREATE INDEX idx_persona_estado\
ON persona (academia_id, estado_global);

**Búsqueda nombre**

CREATE INDEX idx_persona_nombre\
ON persona (academia_id, nombre, apellido);

**WhatsApp lookup**

CREATE INDEX idx_persona_telefono\
ON persona (academia_id, telefono_whatsapp);

**Actividad reciente**

CREATE INDEX idx_persona_interaccion\
ON persona (academia_id, ultima_interaccion_at DESC);

**Search full-text (recomendado)**

CREATE INDEX idx_persona_search\
ON persona\
USING gin (search_text gin_trgm_ops);

(Requiere extensión pg_trgm)

**9. Filosofía de search_text**

Campo derivado para acelerar búsquedas móviles.

Ejemplo:

maria lopez carlitos 526691234567

Incluye:

- nombre,

- apellido,

- referencia,

- teléfono.

**Objetivo**

Evitar:

- concatenaciones runtime,

- búsquedas lentas,

- lógica compleja frontend.

**10. Relaciones**

  -------------------------------------
  **Relación**       **Cardinalidad**
  ------------------ ------------------
  academia -\>       1:N
  persona            

  persona -\> grupo  M:N vía
                     persona_grupo

  persona -\> cargo  1:N

  persona -\>        1:N
  movimiento         

  persona -\>        1:N
  evento_timeline    

  persona -\>        1:N
  envio_sugerido     
  -------------------------------------

**11. Seguridad y RLS**

**Activación**

ALTER TABLE persona ENABLE ROW LEVEL SECURITY;

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

**12. Reglas de Negocio Congeladas**

**Regla 1 --- Nunca DELETE físico**

Las personas:

**jamás se eliminan físicamente.**

Siempre:

- estado_registro

- fecha_baja

**Regla 2 --- WhatsApp NO obligatorio**

Puede existir:

persona sin teléfono

Pero:

**NO puede entrar al motor de automatización.**

**Regla 3 --- Backend sanitiza teléfonos**

Toda persistencia debe:

- eliminar espacios,

- símbolos,

- paréntesis,

- guiones,

- normalizar formato E.164 simplificado.

**Ejemplo persistido**

526691234567

**Regla 4 --- NO UNIQUE en teléfono**

Se permiten:

- hermanos,

- familias,

- múltiples alumnos,\
  con mismo contacto.

**Regla 5 --- Timeline centralizado**

Narrativa operativa:

**vive en evento_timeline**

NO en:

- notas_internas,

- metadata.

**Regla 6 --- notas_internas es snapshot breve**

Correcto:

"Dar facilidad de pago"

Incorrecto:

"El martes dijo que\..."

Eso pertenece al Timeline.

**Regla 7 --- ultima_interaccion_at NO usa trigger global**

NO debe actualizarse:

- en todos los eventos,

- vía trigger automático universal.

**Actualización recomendada**

Solo desde:

- RPCs,

- servicios backend,

- interacciones humanas reales.

**Eventos que SÍ actualizan**

✅ finanzas\
✅ comunicacion\
✅ contexto

**Eventos que NO actualizan**

❌ sistema\
❌ automatizacion\
❌ worker\
❌ interno

**13. Integración con Ecosistema**

**Timeline**

Al crear persona:\
insertar automáticamente:

registro_inicial

**Outbox**

envio_sugerido\
debe snapshotear:

- nombre,

- teléfono,

- mensaje,

- saldo.

NO depender dinámicamente de persona.

**Cargos**

Todo cargo:\
requiere:

persona_id válido

**Automatización**

El motor nocturno:\
debe excluir:

telefono_whatsapp IS NULL\
OR estado_registro != \'activo\'

**14. Filosofía UX**

Entidad optimizada para:

✅ WhatsApp-first\
✅ operación móvil\
✅ mínima captura\
✅ búsqueda rápida\
✅ cobranza táctica\
✅ Timeline humano\
✅ velocidad operativa

**NO optimizada aún para**

❌ CRM complejo\
❌ control escolar formal\
❌ expediente académico\
❌ relaciones familiares avanzadas\
❌ multi-contacto

**15. Decisiones Arquitectónicas Congeladas**

**1. Persona = sujeto financiero + operativo**

NO separar:

- alumno,

- tutor,

- cliente,\
  en V1.

**2. Estado global cacheado**

NO calcular dinámicamente en frontend.

**3. Timeline desacoplado**

La narrativa vive exclusivamente en:

evento_timeline

**4. Soft delete universal**

Toda baja:

- lógica,

- nunca física.

**5. Tenant isolation absoluto**

Toda operación:\
debe respetar:

academia_id

**16. Estado de Madurez Arquitectónica**

Con esta definición:

**el núcleo humano-operativo de SIPRA queda completamente consolidado.**

Ya existe:

- identidad,

- cobranza,

- narrativa,

- automatización,

- timeline,

- multitenant,

- auditoría,

- seguridad,

- UX operativa,

- búsqueda escalable.
