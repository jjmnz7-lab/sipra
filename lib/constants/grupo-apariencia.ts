/**
 * Catálogo de apariencia para grupos: colores y emojis disponibles
 * para personalizar la identidad visual del grupo.
 *
 * Paleta v2 — 10 colores con contraste WCAG por tema claro/oscuro.
 * Excluye grises (reservados para suspendidos) y verdes puros (reservados para filtros activos).
 */

export type ColorGrupo = {
  /** Slug que se persiste en la BD (`grupo.color`). */
  slug: string
  /** Etiqueta legible mostrada en el selector. */
  label: string
  /** Fondo sutil (muy claro) — para relleno de círculos y badges. */
  bg: string
  /** Color de borde / acento visible. */
  border: string
  /** Color de texto en tema claro. */
  textLight: string
  /** Color de texto en tema oscuro. */
  textDark: string
}

export const COLORES_GRUPO: ColorGrupo[] = [
  { slug: 'purple',  label: 'Púrpura',   bg: '#F3E8FF', border: '#D8B4FE', textLight: '#6B21A8', textDark: '#D8B4FE' },
  { slug: 'fuchsia', label: 'Fucsia',    bg: '#FDF4FF', border: '#F5D0FE', textLight: '#86198F', textDark: '#F5D0FE' },
  { slug: 'rose',    label: 'Rosa',      bg: '#FFF1F2', border: '#FECDD3', textLight: '#9F1239', textDark: '#FECDD3' },
  { slug: 'orange',  label: 'Naranja',   bg: '#FFF7ED', border: '#FFEDD5', textLight: '#C2410C', textDark: '#FFEDD5' },
  { slug: 'amber',   label: 'Amarillo',  bg: '#FEFCE8', border: '#FEF08A', textLight: '#854D0E', textDark: '#FEF08A' },
  { slug: 'lime',    label: 'Lima',      bg: '#F7FEE7', border: '#D9F99D', textLight: '#3F6212', textDark: '#D9F99D' },
  { slug: 'cyan',    label: 'Cyan',      bg: '#ECFEFF', border: '#A5F3FC', textLight: '#0E7490', textDark: '#A5F3FC' },
  { slug: 'indigo',  label: 'Índigo',    bg: '#EEF2FF', border: '#C7D2FE', textLight: '#3730A3', textDark: '#C7D2FE' },
  { slug: 'steel',   label: 'Azul Acero',bg: '#E0F2FE', border: '#7DD3FC', textLight: '#0369A1', textDark: '#7DD3FC' },
  { slug: 'stone',   label: 'Tierra',    bg: '#FAF8F5', border: '#EDE0D4', textLight: '#78350F', textDark: '#EDE0D4' },
]

export const COLOR_GRUPO_DEFAULT = COLORES_GRUPO[0]

// Mapeo de slugs v1 → v2 para compatibilidad con registros existentes en BD.
const SLUG_MIGRATION: Record<string, string> = {
  'azul-celeste':      'steel',
  'morado-lavanda':    'purple',
  'rosa-pastel':       'rose',
  'naranja-durazno':   'orange',
  'azul-indigo-claro': 'indigo',
  'cafe-arena':        'stone',
  'lila-claro':        'fuchsia',
  'turquesa-palido':   'cyan',
}

export const EMOJIS_GRUPO: string[] = [
  '🐣', '🍼', '👶', '👦', '👧', '🌱', '🌳', '⭐',
  '⚡', '🚀', '🎯', '👑', '💎', '🛡️', '🏆',
]

export function colorPorSlug(slug: string | null | undefined): ColorGrupo {
  if (!slug) return COLOR_GRUPO_DEFAULT
  const resolved = SLUG_MIGRATION[slug] ?? slug
  return COLORES_GRUPO.find(c => c.slug === resolved) ?? COLOR_GRUPO_DEFAULT
}
