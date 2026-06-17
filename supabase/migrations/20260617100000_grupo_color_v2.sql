-- Migración de colores de grupo v1 → v2
-- Reasigna los 8 slugs antiguos al color más parecido de la nueva paleta de 10.
UPDATE grupo
SET color = CASE color
  WHEN 'azul-celeste'      THEN 'steel'
  WHEN 'morado-lavanda'    THEN 'purple'
  WHEN 'rosa-pastel'       THEN 'rose'
  WHEN 'naranja-durazno'   THEN 'orange'
  WHEN 'azul-indigo-claro' THEN 'indigo'
  WHEN 'cafe-arena'        THEN 'stone'
  WHEN 'lila-claro'        THEN 'fuchsia'
  WHEN 'turquesa-palido'   THEN 'cyan'
  ELSE color
END
WHERE color IN (
  'azul-celeste',
  'morado-lavanda',
  'rosa-pastel',
  'naranja-durazno',
  'azul-indigo-claro',
  'cafe-arena',
  'lila-claro',
  'turquesa-palido'
);
