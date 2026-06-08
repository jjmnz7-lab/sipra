/**
 * Catálogo de apariencia para grupos: colores claros y emojis disponibles
 * para personalizar la identidad visual del grupo en el subheader.
 */

export type ColorGrupo = {
  /** Slug que se persiste en la BD (`grupo.color`). */
  slug: string
  /** Etiqueta legible mostrada en el selector. */
  label: string
  /** Hex aplicado vía inline-style al avatar circular. */
  hex: string
}

export const COLORES_GRUPO: ColorGrupo[] = [
  { slug: 'azul-celeste',       label: 'Azul Celeste',       hex: '#B3E5FC' },
  { slug: 'morado-lavanda',     label: 'Morado Lavanda',     hex: '#D1C4E9' },
  { slug: 'rosa-pastel',        label: 'Rosa Pastel',        hex: '#FFCDD2' },
  { slug: 'naranja-durazno',    label: 'Naranja Durazno',    hex: '#FFE0B2' },
  { slug: 'azul-indigo-claro',  label: 'Azul Índigo Claro',  hex: '#C5CAE9' },
  { slug: 'cafe-arena',         label: 'Café Arena',         hex: '#D7CCC8' },
  { slug: 'lila-claro',         label: 'Lila Claro',         hex: '#E1BEE7' },
  { slug: 'turquesa-palido',    label: 'Turquesa Pálido',    hex: '#B2EBF2' },
]

export const COLOR_GRUPO_DEFAULT = COLORES_GRUPO[0]

export const EMOJIS_GRUPO: string[] = [
  '🐣', '🍼', '👶', '👦', '👧', '🌱', '🌳', '⭐',
  '🔥', '⚡', '🚀', '🎯', '👑', '💎', '🛡️', '🏆',
]

export function colorPorSlug(slug: string | null | undefined): ColorGrupo {
  if (!slug) return COLOR_GRUPO_DEFAULT
  return COLORES_GRUPO.find(c => c.slug === slug) ?? COLOR_GRUPO_DEFAULT
}
