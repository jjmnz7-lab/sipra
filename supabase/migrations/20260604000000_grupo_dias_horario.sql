-- ==============================================================================
-- Migración: grupo_dias_horario
-- Timestamp: 20260604000000
-- Descripción: Agrega campos de logística básica al grupo/taller para
--   reemplazar el hardcode visual de "Lun, Mié y Vie • 06:00 pm":
--
--     • dias_semana smallint[]  → arreglo de 0..6 (0=Dom, 1=Lun, …, 6=Sáb)
--     • hora_inicio TIME        → inicio de la sesión (opcional)
--     • hora_fin    TIME        → fin de la sesión (opcional; debe ser > hora_inicio si ambas presentes)
--
--   Todos los campos son OPCIONALES (la UI los oculta cuando no hay datos).
-- ==============================================================================

ALTER TABLE public.grupo
  ADD COLUMN IF NOT EXISTS dias_semana  SMALLINT[],
  ADD COLUMN IF NOT EXISTS hora_inicio  TIME,
  ADD COLUMN IF NOT EXISTS hora_fin     TIME;

-- Validar dominio de días (0..6) mediante una función IMMUTABLE.
-- (CHECK no permite subqueries directas, pero sí llamadas a funciones.)
CREATE OR REPLACE FUNCTION public.fn_dias_semana_validos(p_dias smallint[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_dias IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM unnest(p_dias) AS d WHERE d < 0 OR d > 6
    );
$$;

ALTER TABLE public.grupo DROP CONSTRAINT IF EXISTS chk_grupo_dias_semana_dominio;
ALTER TABLE public.grupo
  ADD CONSTRAINT chk_grupo_dias_semana_dominio CHECK (
    public.fn_dias_semana_validos(dias_semana)
  );

-- Validar coherencia de horario: si ambas horas vienen, fin > inicio.
ALTER TABLE public.grupo DROP CONSTRAINT IF EXISTS chk_grupo_horario_coherente;
ALTER TABLE public.grupo
  ADD CONSTRAINT chk_grupo_horario_coherente CHECK (
    hora_fin IS NULL OR hora_inicio IS NULL OR hora_fin > hora_inicio
  );

COMMENT ON COLUMN public.grupo.dias_semana IS
  'Días de la semana del grupo/taller. Arreglo de smallint: 0=Domingo .. 6=Sábado.';
COMMENT ON COLUMN public.grupo.hora_inicio IS
  'Hora de inicio de la sesión (opcional).';
COMMENT ON COLUMN public.grupo.hora_fin IS
  'Hora de fin de la sesión (opcional; si está, debe ser > hora_inicio).';
