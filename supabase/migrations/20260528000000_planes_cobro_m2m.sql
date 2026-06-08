-- Migración: planes_cobro_m2m
-- Descripción: Desacopla finanzas de logística. Los grupos dejan de almacenar precios;
--   los esquemas de cobro recurrentes viven en `planes_cobro` y se asignan a alumnos
--   (persona) vía una tabla puente M2M. La relación alumno↔grupo ya existía en
--   `persona_grupo` y se reutiliza (no se crea `alumno_grupos`).
--
-- Notas de arquitectura (decisiones acordadas):
--   - Nomenclatura real del esquema: academia / grupo / persona (no plurales en inglés).
--     "alumno" = fila de persona con etiqueta = 'alumno'.
--   - saldo_acumulado en persona es un CACHE DENORMALIZADO derivado del ledger
--     (cargo/movimiento). El ledger sigue siendo la fuente de verdad; aquí solo se
--     crea la columna (default 0), sin triggers de recálculo todavía.
--   - frecuencia se modela como VARCHAR + CHECK (convención del repo; no se usan
--     enums nativos en ninguna otra tabla).
--   - Todas las tablas nuevas llevan academia_id NOT NULL + RLS sipra_auth, igual que
--     el resto del esquema multi-tenant.
--
-- PENDIENTE (fuera de esta migración): refactorizar los RPCs/server actions que aún
--   leen grupo.costo_mensualidad / grupo.costo_inscripcion para que tomen el monto
--   desde planes_cobro. Ver bloque (2) más abajo.

-- ==============================================================================
-- 1. Tabla: academia — banderas de configuración
-- ==============================================================================
ALTER TABLE public.academia
  ADD COLUMN IF NOT EXISTS multi_plan_enabled     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_partial_payments  BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.academia.multi_plan_enabled IS
  'Si true, la UI expone el manejo de múltiples planes/grupos por alumno. Si false, la interfaz se mantiene simple (un plan por alumno).';
COMMENT ON COLUMN public.academia.allow_partial_payments IS
  'Política de abonos parciales. Si true, se permite registrar pagos menores al saldo del cargo.';

-- ==============================================================================
-- 2. Tabla: grupo — eliminar columnas financieras (solo logística)
-- ==============================================================================
-- ADVERTENCIA: estas columnas son leídas por RPCs/acciones vigentes que deben
-- refactorizarse para leer desde planes_cobro:
--   - 20260521120001_rpcs_inscripcion_y_mensualidades.sql
--   - 20260522230000_calcular_cargo_inscripcion_v2.sql
--   - lógica de "generar mensualidades" / "cargo grupal"
ALTER TABLE public.grupo
  DROP COLUMN IF EXISTS costo_mensualidad,
  DROP COLUMN IF EXISTS costo_inscripcion;

-- ==============================================================================
-- 3. Tabla: persona — saldo global (cache denormalizado del ledger)
-- ==============================================================================
ALTER TABLE public.persona
  ADD COLUMN IF NOT EXISTS saldo_acumulado NUMERIC(12,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.persona.saldo_acumulado IS
  'Cache denormalizado del saldo del alumno (modelo de cuenta corriente). Derivado del ledger cargo/movimiento, que sigue siendo la fuente de verdad.';

-- ==============================================================================
-- 4. Nueva tabla: planes_cobro (catálogo de tarifas recurrentes)
-- ==============================================================================
CREATE TABLE public.planes_cobro (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id  UUID          NOT NULL REFERENCES public.academia(id),
  nombre       VARCHAR(120)  NOT NULL,
  monto        NUMERIC(12,2) NOT NULL,
  frecuencia   VARCHAR(20)   NOT NULL DEFAULT 'mensual',
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT chk_plan_nombre     CHECK (char_length(trim(nombre)) > 0),
  CONSTRAINT chk_plan_monto      CHECK (monto >= 0),
  CONSTRAINT chk_plan_frecuencia CHECK (frecuencia IN ('mensual', 'semanal', 'por_visita', 'pago_unico'))
);

CREATE INDEX idx_planes_cobro_academia ON public.planes_cobro (academia_id);

ALTER TABLE public.planes_cobro ENABLE ROW LEVEL SECURITY;

CREATE POLICY planes_cobro_select_policy ON public.planes_cobro
FOR SELECT TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id));

CREATE POLICY planes_cobro_insert_policy ON public.planes_cobro
FOR INSERT TO authenticated
WITH CHECK (
  sipra_auth.is_admin_of_tenant(academia_id)
  AND sipra_auth.can_write_to_academia(academia_id)
);

CREATE POLICY planes_cobro_update_policy ON public.planes_cobro
FOR UPDATE TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id))
WITH CHECK (sipra_auth.can_write_to_academia(academia_id));

CREATE POLICY planes_cobro_delete_policy ON public.planes_cobro
FOR DELETE TO authenticated
USING (sipra_auth.is_admin_of_tenant(academia_id));

-- ==============================================================================
-- 5. Tabla puente alumno↔grupo: REUSO de persona_grupo
-- ==============================================================================
-- persona_grupo ya implementa el M2M alumno↔grupo (con estado, fecha_inscripcion y RLS).
-- No se crea alumno_grupos para evitar duplicación. Solo se ajustan los FKs para que
-- la eliminación de una persona o grupo limpie la relación (semántica M2M deseada).
ALTER TABLE public.persona_grupo
  DROP CONSTRAINT IF EXISTS persona_grupo_persona_id_fkey,
  ADD  CONSTRAINT persona_grupo_persona_id_fkey
       FOREIGN KEY (persona_id) REFERENCES public.persona(id) ON DELETE CASCADE;

ALTER TABLE public.persona_grupo
  DROP CONSTRAINT IF EXISTS persona_grupo_grupo_id_fkey,
  ADD  CONSTRAINT persona_grupo_grupo_id_fkey
       FOREIGN KEY (grupo_id) REFERENCES public.grupo(id) ON DELETE CASCADE;

-- ==============================================================================
-- 6. Nueva tabla puente alumno↔plan: alumno_planes (M2M)
-- ==============================================================================
-- Permite que un alumno tenga múltiples esquemas de cobro activos simultáneamente.
CREATE TABLE public.alumno_planes (
  academia_id    UUID        NOT NULL REFERENCES public.academia(id),
  alumno_id      UUID        NOT NULL REFERENCES public.persona(id)      ON DELETE CASCADE,
  plan_cobro_id  UUID        NOT NULL REFERENCES public.planes_cobro(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT pk_alumno_planes PRIMARY KEY (alumno_id, plan_cobro_id)
);

-- La PK (alumno_id, plan_cobro_id) ya cubre lookups por alumno; este índice optimiza
-- el join inverso "¿qué alumnos tienen el plan X?" y el filtrado por tenant.
CREATE INDEX idx_alumno_planes_plan     ON public.alumno_planes (plan_cobro_id);
CREATE INDEX idx_alumno_planes_academia ON public.alumno_planes (academia_id);

ALTER TABLE public.alumno_planes ENABLE ROW LEVEL SECURITY;

CREATE POLICY alumno_planes_select_policy ON public.alumno_planes
FOR SELECT TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id));

CREATE POLICY alumno_planes_insert_policy ON public.alumno_planes
FOR INSERT TO authenticated
WITH CHECK (
  sipra_auth.is_admin_of_tenant(academia_id)
  AND sipra_auth.can_write_to_academia(academia_id)
);

CREATE POLICY alumno_planes_update_policy ON public.alumno_planes
FOR UPDATE TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id))
WITH CHECK (sipra_auth.can_write_to_academia(academia_id));

CREATE POLICY alumno_planes_delete_policy ON public.alumno_planes
FOR DELETE TO authenticated
USING (sipra_auth.is_admin_of_tenant(academia_id));
