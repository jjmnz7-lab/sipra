-- Agrega columna emoji al grupo para identidad visual en la vista de seguimiento.
-- color ya existe desde 20260516180002_persona_grupo.sql.

ALTER TABLE public.grupo
  ADD COLUMN IF NOT EXISTS emoji VARCHAR(8);

COMMENT ON COLUMN public.grupo.emoji IS 'Emoji opcional para personalizar el avatar del grupo en la UI.';
