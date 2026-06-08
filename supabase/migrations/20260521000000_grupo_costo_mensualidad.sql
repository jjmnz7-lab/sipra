-- Agregar campo de costo de mensualidad a la tabla grupo
-- Permite pre-llenar el monto al generar cargos masivos

ALTER TABLE public.grupo
ADD COLUMN costo_mensualidad NUMERIC(12,2) DEFAULT NULL;

COMMENT ON COLUMN public.grupo.costo_mensualidad IS 'Costo de mensualidad por defecto del grupo. Se usa para pre-llenar cargos masivos.';

-- DOWN (referencia):
-- ALTER TABLE public.grupo DROP COLUMN costo_mensualidad;
