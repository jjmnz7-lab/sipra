**ESPECIFICACIÓN DE ENTIDAD: persona_grupo (Membresía)**

**1. Filosofía de la Entidad**

persona_grupo es la **Bitácora de Pertenencia Operativa**. Representa el
vínculo histórico y actual entre una persona y un grupo. No es solo una
conexión técnica; es el documento que certifica que un alumno \"existe\"
para un grupo en un momento dado. Su diseño permite que SIPRA gestione
reingresos (el alumno que se va y vuelve) sin duplicar filas,
preservando siempre la fecha del primer ingreso.

**Nombre de Tabla:** persona_grupo

**2. Estructura de Campos (Esquema Físico)**

  ------------------------------------------------------------------------------------
  **Campo**         **Tipo**      **Reglas y          **Propósito**
                                  Restricciones**     
  ----------------- ------------- ------------------- --------------------------------
  **id**            UUID          **PK**, DEFAULT     ID único para vinculación y
                                  gen_random_uuid()   auditoría.

  **academia_id**   UUID          FK, **NOT NULL**,   **Tenant isolation.**
                                  Indexado            (Redundancia estratégica).

  **persona_id**    UUID          FK, **NOT NULL**,   Alumno/Tutor vinculado.
                                  Indexado            

  **grupo_id**      UUID          FK, **NOT NULL**,   Grupo asociado.
                                  Indexado            

  **estado**        Varchar(20)   **NOT NULL**,       activo, removido.
                                  DEFAULT \'activo\'  

  **origen**        Varchar(30)   **NOT NULL**,       manual, importacion, onboarding,
                                  DEFAULT \'manual\'  sistema.

  **notas**         Text          NULLABLE            Contexto ligero (ej.
                                                      \"Capitán\", \"Beca
                                                      deportiva\").

  **fecha_alta**    Timestamptz   **NOT NULL**,       Fecha del **primer** ingreso
                                  DEFAULT now()       (Inmutable).

  **fecha_baja**    Timestamptz   NULLABLE            Fecha de la salida más reciente.

  **created_by**    UUID          FK usuario,         Auditoría: Staff que realizó la
                                  NULLABLE            inscripción.

  **created_at**    Timestamptz   DEFAULT now()       Auditoría de creación física del
                                                      registro.

  **updated_at**    Timestamptz   DEFAULT now()       **Fecha de última reactivación**
                                                      o cambio de estado.
  ------------------------------------------------------------------------------------

**3. Dinámica de Estados y Reingreso (Lógica de Upsert)**

Para mantener la limpieza de la base de datos y la coherencia histórica,
la membresía sigue una regla de **Unicidad de Por Vida**. Una persona y
un grupo solo tienen una fila en esta tabla para siempre.

**El Protocolo de Reingreso**

Cuando un usuario intenta inscribir a una persona en un grupo donde ya
tuvo membresía (existente pero en estado removido):

1.  **Detección:** El sistema detecta el conflicto mediante el índice
    único.

2.  **Acción de Upsert:**

    - El estado cambia de removido a activo.

    - La fecha_baja se resetea a NULL.

    - El campo updated_at se actualiza (indicando la fecha de este
      reingreso).

    - **Crucial:** La fecha_alta **NO** se toca, preservando la
      antigüedad original del alumno.

**4. Restricciones a Nivel Motor (Constraints & Índices)**

- **Índice de Unicidad Absoluta (Anti-Duplicados):**

> CREATE UNIQUE INDEX uq_membresia_unica ON persona_grupo (academia_id,
> persona_id, grupo_id);

- **Índices de Rendimiento Operativo:**

  - CREATE INDEX idx_pg_grupo_activo ON persona_grupo (academia_id,
    grupo_id) WHERE estado = \'activo\'; *(Carga instantánea de listas
    de clase).*

  - CREATE INDEX idx_pg_persona_grupos ON persona_grupo (academia_id,
    persona_id, estado); *(Perfil del alumno: \"¿En qué grupos
    está?\").*

- **Reglas Lógicas (CHECKs):**

  - CHECK (estado IN (\'activo\', \'removido\'))

  - CHECK (origen IN (\'manual\', \'importacion\', \'onboarding\',
    \'sistema\'))

  - CHECK (fecha_baja IS NULL OR fecha_baja \>= fecha_alta)

**5. Reglas Arquitectónicas Congeladas (Backend / RPC)**

1.  **Filtro de Cobranza Batch:** La función de \"Cobro Grupal\"
    (generación masiva de cargos) debe filtrar estrictamente por estado
    = \'activo\'. Nunca se genera deuda a un registro removido.

2.  **Trazabilidad de Narrativa:** Todo cambio en esta tabla debe
    disparar un evento en el evento_timeline de la persona vinculada:

    - **Alta/Reingreso:** Categoría sistema, tipo inscripcion_grupo.

    - **Baja:** Categoría sistema, tipo baja_grupo.

3.  **Persistencia del Staff:** El campo created_by es obligatorio en
    inserciones manuales para auditoría forense de \"quién movió a
    quién\".

4.  **Higiene de Estado:** Si el estado es activo, el sistema debe
    garantizar que fecha_baja sea NULL.

**6. Seguridad y Row Level Security (RLS)**

- **Activación:** ALTER TABLE persona_grupo ENABLE ROW LEVEL SECURITY;

- **Política de Lectura (SELECT):** USING
  (is_auth_user_for_tenant(academia_id));

- **Política de Escritura (INSERT, UPDATE):** WITH CHECK
  (is_auth_user_for_tenant(academia_id) AND
  can_write_to_academia(academia_id));

- **Política de Borrado Físico (DELETE):** USING (false);

  - *La relación es eterna. La salida de un alumno es una mutación de
    estado, no una desaparición de la historia.*

**7. Casos UX que resuelve esta Estructura**

- **El \"Eterno Retorno\":** Si un alumno se va en verano y vuelve en
  otoño, el sistema lo reactiva sin perder el rastro de que fue alumno
  fundador (vía fecha_alta).

- **Auditoría de Cobro:** Si un padre reclama un cobro, el Timeline
  mostrará: *\"Inscrito al grupo el 10/May por Prof. Juan\"* y
  *\"Removido del grupo el 15/May por Prof. Juan\"*. La evidencia es
  absoluta.

- **Segmentación Rápida:** Permite filtrar en milisegundos quién está
  activo en \"Karate\" pero inactivo en \"Fútbol\".
