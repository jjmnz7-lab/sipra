-- ==============================================================================
-- Migración: delta_inscripcion_temporal
-- Descripción: Columnas genuinamente nuevas que faltan respecto a la spec.
--   La arquitectura M2M (planes_cobro, alumno_planes, persona_grupo, etc.),
--   el soft-delete (grupo.estado / planes_cobro.activo), el saldo vivo
--   (persona.saldo_acumulado + trigger), y los flags de multi-plan/parciales
--   ya están implementados en migraciones previas.
--
--   Esta migración agrega únicamente el DELTA:
--     1. academia.cobrar_inscripcion_default + monto_inscripcion_default
--     2. grupo.es_temporal
--     3. planes_cobro.requiere_inscripcion
--     4. cargo.nota_modificacion
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. academia: política de inscripción (promovida de config_cobro JSONB a columnas reales)
-- ------------------------------------------------------------------------------
ALTER TABLE public.academia
  ADD COLUMN IF NOT EXISTS cobrar_inscripcion_default BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS monto_inscripcion_default  NUMERIC(12,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.academia.cobrar_inscripcion_default IS
  'Si true, al inscribir un alumno se genera un cargo de inscripción por defecto (según monto_inscripcion_default o el valor del plan). Promovida de config_cobro.cobra_inscripcion.';
COMMENT ON COLUMN public.academia.monto_inscripcion_default IS
  'Monto de inscripción por defecto de la academia. Solo aplica si cobrar_inscripcion_default = true y el plan no define uno propio.';

-- Backfill desde config_cobro JSONB (si la academia ya tenía cobra_inscripcion = true).
UPDATE public.academia
SET cobrar_inscripcion_default = COALESCE((config_cobro->>'cobra_inscripcion')::boolean, false)
WHERE config_cobro ? 'cobra_inscripcion';

-- ------------------------------------------------------------------------------
-- 2. grupo: flag de temporalidad (talleres, eventos, workshops)
-- ------------------------------------------------------------------------------
ALTER TABLE public.grupo
  ADD COLUMN IF NOT EXISTS es_temporal BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.grupo.es_temporal IS
  'Si true, el grupo es temporal (taller, workshop, evento). Permite filtrado y tratamiento diferenciado en la UI sin afectar la logística.';

-- ------------------------------------------------------------------------------
-- 3. planes_cobro: exención de inscripción por plan
-- ------------------------------------------------------------------------------
ALTER TABLE public.planes_cobro
  ADD COLUMN IF NOT EXISTS requiere_inscripcion BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.planes_cobro.requiere_inscripcion IS
  'Si false, los alumnos de este plan NO pagan inscripción aunque la academia cobre por defecto (ej. planes tipo fitness, clases sueltas). ON DELETE SET NULL del plan sugerido archivado protege el historial.';

-- ------------------------------------------------------------------------------
-- 4. cargo: auditoría de sobreescritura de precios
-- ------------------------------------------------------------------------------
ALTER TABLE public.cargo
  ADD COLUMN IF NOT EXISTS nota_modificacion TEXT;

COMMENT ON COLUMN public.cargo.nota_modificacion IS
  'Rastro de auditoría: se llena cuando un usuario sobreescribe manualmente el precio predefinido del plan (ej. descuentos, promociones, condonaciones parciales).';
