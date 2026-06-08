-- Migración: 20260522200000_fix_cargo_origen_constraint
-- Descripción: Agrega 'inscripcion' como valor válido en chk_cargo_origen
--              para soportar cargos generados al inscribir un alumno.
--
-- DOWN (revertir):
-- ALTER TABLE public.cargo DROP CONSTRAINT chk_cargo_origen;
-- ALTER TABLE public.cargo ADD CONSTRAINT chk_cargo_origen
--   CHECK (origen IN ('manual','grupal','automatico','ajuste'));

ALTER TABLE public.cargo DROP CONSTRAINT IF EXISTS chk_cargo_origen;

ALTER TABLE public.cargo ADD CONSTRAINT chk_cargo_origen
  CHECK (origen IN ('manual','grupal','automatico','ajuste','inscripcion'));
