-- Agregar campo de costo de inscripción al grupo
-- Se cobra al inscribir un nuevo alumno SI academia.config_cobro.cobra_inscripcion = true

ALTER TABLE public.grupo
ADD COLUMN costo_inscripcion NUMERIC(12,2) DEFAULT NULL;

COMMENT ON COLUMN public.grupo.costo_inscripcion IS
  'Costo de inscripción del grupo. Se cobra como cargo separado al inscribir un nuevo alumno cuando academia.config_cobro.cobra_inscripcion = true.';
