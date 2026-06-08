-- Migración: grupo_cupo_maximo
-- Timestamp: 20260604120000
-- Descripción: Agrega cupo máximo de alumnos al grupo o taller.
--
--   • cupo_maximo INT  → límite de alumnos (1..999). Opcional (NULL es cupo ilimitado).
--

ALTER TABLE public.grupo
  ADD COLUMN IF NOT EXISTS cupo_maximo INT;

-- Validar rango 1..999 si no es nulo
ALTER TABLE public.grupo DROP CONSTRAINT IF EXISTS chk_grupo_cupo_maximo;
ALTER TABLE public.grupo
  ADD CONSTRAINT chk_grupo_cupo_maximo CHECK (
    cupo_maximo IS NULL OR (cupo_maximo > 0 AND cupo_maximo <= 999)
  );

COMMENT ON COLUMN public.grupo.cupo_maximo IS
  'Cupo máximo de alumnos para el grupo o taller (1-999). NULL representa cupo ilimitado.';
