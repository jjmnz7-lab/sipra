/**
 * Escala financiera del alumno usada en la vista /alumnos y en la
 * health strip global. Mantenida como constante reusable para que
 * cualquier vista futura (lista de miembros, KPIs, etc.) consuma
 * el mismo mapeo de colores/labels.
 */

export type EstadoFinancieroAlumno = 'al_dia' | 'pendiente' | 'atrasado' | 'urgente'

export type EstadoFinancieroDef = {
  slug: EstadoFinancieroAlumno
  label: string
  hex: string
}

export const ESTADOS_FINANCIEROS: EstadoFinancieroDef[] = [
  { slug: 'al_dia',    label: 'Al día',    hex: '#5C8F78' },
  { slug: 'pendiente', label: 'Pendiente', hex: '#D2A45C' },
  { slug: 'atrasado',  label: 'Atrasado',  hex: '#B85C50' },
  { slug: 'urgente',   label: 'Urgente',   hex: '#7A2F38' },
]

export function colorEstado(slug: EstadoFinancieroAlumno | string | null | undefined): EstadoFinancieroDef {
  return ESTADOS_FINANCIEROS.find(e => e.slug === slug) ?? ESTADOS_FINANCIEROS[0]
}

/**
 * Descuento especial ACTIVO de un alumno, para el badge de la lista/detalle.
 * Hermanos y Beca son mutuamente excluyentes (CHECK en BD), así que hay a lo
 * sumo uno. `tipo` decide el ícono en cada pantalla (hermanos → Users,
 * beca → GraduationCap). Devuelve null si no hay descuento activo.
 */
export type DescuentoEspecialInfo = { tipo: 'hermanos' | 'beca'; label: string }

export function descuentoEspecialBadge(
  hermanosActivo: boolean | null | undefined,
  becaActiva: boolean | null | undefined,
  becaPorcentaje: number | null | undefined,
): DescuentoEspecialInfo | null {
  if (becaActiva && (becaPorcentaje ?? 0) > 0) {
    return { tipo: 'beca', label: `Beca ${becaPorcentaje}%` }
  }
  if (hermanosActivo) {
    return { tipo: 'hermanos', label: 'Descto. hermanos' }
  }
  return null
}

type CargoLite = {
  concepto: string | null
  estado_financiero?: string | null
  fecha_vencimiento: string | null | undefined
}

/**
 * Clasifica el estado financiero del alumno dado el conjunto de cargos
 * con saldo pendiente. Implementa la regla:
 *  - Sin cargos pendientes → al_dia
 *  - >=2 mensualidades vencidas O >=1 cargo no-mensualidad con
 *    fecha_vencimiento < hoy - 1 mes → urgente
 *  - >=1 cargo con estado_financiero === 'vencido' → atrasado
 *  - Resto (cargos pendiente/parcial sin vencer) → pendiente
 *
 * `hoy` debe venir de ahoraAcademia(timezone) con el timezone real de la
 * academia (columna academia.timezone) — no todas las academias están en el
 * mismo huso horario.
 */
export function clasificarAlumno(cargos: CargoLite[], hoy: Date): EstadoFinancieroAlumno {
  if (!cargos || cargos.length === 0) return 'al_dia'

  // hoy viene "falso-UTC" (ver zonedAcademia): siempre getUTC*(), nunca
  // accesores locales, para no depender del huso del proceso que ejecuta esto.
  const oneMonthAgo = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - 1, hoy.getUTCDate()))

  const isMensualidad = (c: CargoLite) =>
    String(c.concepto ?? '').toLowerCase().includes('mensualidad')

  const mensualidadesVencidas = cargos.filter(
    c => c.estado_financiero === 'vencido' && isMensualidad(c),
  ).length

  const otrosAntiguosVencidos = cargos.filter(c => {
    if (isMensualidad(c)) return false
    if (!c.fecha_vencimiento) return false
    const venc = new Date(c.fecha_vencimiento)
    return venc < oneMonthAgo
  }).length

  if (mensualidadesVencidas >= 2 || otrosAntiguosVencidos >= 1) return 'urgente'

  const hayVencido = cargos.some(c => c.estado_financiero === 'vencido')
  if (hayVencido) return 'atrasado'

  return 'pendiente'
}
