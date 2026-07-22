-- Migración: 20260721143000_agregar_estado_archivada_academia
-- Descripción: Re-incorporar 'archivada' al check de estado_tenant en public.academia

ALTER TABLE public.academia DROP CONSTRAINT chk_academia_estado;
ALTER TABLE public.academia ADD CONSTRAINT chk_academia_estado
  CHECK (estado_tenant IN (
    'invitada', 'onboarding_pendiente', 'prueba',
    'activa', 'suspendida', 'cancelada', 'archivada'
  ));

/*
-- DOWN Migration (para referencia)
ALTER TABLE public.academia DROP CONSTRAINT chk_academia_estado;
ALTER TABLE public.academia ADD CONSTRAINT chk_academia_estado
  CHECK (estado_tenant IN (
    'invitada', 'onboarding_pendiente', 'prueba',
    'activa', 'suspendida', 'cancelada'
  ));
*/
