-- Up
ALTER TABLE public.persona ADD COLUMN codigo_pais text NOT NULL DEFAULT '52';

-- Down
-- ALTER TABLE public.persona DROP COLUMN codigo_pais;
