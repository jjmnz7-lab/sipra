-- ==============================================================================
-- Migración: grupo_taller_fields
-- Timestamp: 20260531000000
-- Descripción: Agrega soporte explícito para "Talleres" (grupos temporales)
--   incorporando fecha_inicio, fecha_fin y costo_taller a la tabla `grupo`.
-- ==============================================================================

-- UP
ALTER TABLE public.grupo
  ADD COLUMN IF NOT EXISTS fecha_inicio  DATE,
  ADD COLUMN IF NOT EXISTS fecha_fin     DATE,
  ADD COLUMN IF NOT EXISTS costo_taller  NUMERIC(12,2);

-- Restricciones de integridad para talleres
ALTER TABLE public.grupo
  ADD CONSTRAINT chk_grupo_temporal_fechas CHECK (
    es_temporal = false OR (
      fecha_inicio IS NOT NULL AND
      fecha_fin IS NOT NULL AND
      fecha_fin >= fecha_inicio
    )
  ),
  ADD CONSTRAINT chk_grupo_temporal_costo CHECK (
    es_temporal = false OR (
      costo_taller IS NOT NULL AND
      costo_taller >= 0
    )
  );

COMMENT ON COLUMN public.grupo.fecha_inicio IS
  'Fecha de inicio para grupos temporales/talleres. Obligatorio si es_temporal = true.';
COMMENT ON COLUMN public.grupo.fecha_fin IS
  'Fecha de fin para grupos temporales/talleres. Obligatorio si es_temporal = true.';
COMMENT ON COLUMN public.grupo.costo_taller IS
  'Precio único de inscripción/curso para talleres temporales. Obligatorio si es_temporal = true.';

CREATE INDEX IF NOT EXISTS idx_grupo_temporal ON public.grupo (academia_id, es_temporal);

-- DOWN
-- ALTER TABLE public.grupo DROP CONSTRAINT IF EXISTS chk_grupo_temporal_costo;
-- ALTER TABLE public.grupo DROP CONSTRAINT IF EXISTS chk_grupo_temporal_fechas;
-- ALTER TABLE public.grupo DROP COLUMN IF EXISTS costo_taller;
-- ALTER TABLE public.grupo DROP COLUMN IF EXISTS fecha_fin;
-- ALTER TABLE public.grupo DROP COLUMN IF EXISTS fecha_inicio;
-- DROP INDEX IF EXISTS idx_grupo_temporal;
