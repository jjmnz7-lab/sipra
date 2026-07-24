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

export type ConfigEstadosPago = {
  dia_atrasado?: number | null
  dia_urgente?: number | null
}

export type CargoLite = {
  concepto: string | null
  estado_financiero?: string | null
  fecha_vencimiento?: string | null
  fecha_creacion?: string | null
  created_at?: string | null
  origen?: string | null
}

/**
 * Clasifica un cargo individual evaluando su antigüedad en meses de calendario.
 */
export function clasificarCargoIndividual(
  cargo: CargoLite,
  hoy: Date,
  diaAtrasado: number,
  diaUrgente: number
): EstadoFinancieroAlumno {
  const fechaStr = cargo.fecha_vencimiento ?? cargo.fecha_creacion ?? cargo.created_at
  if (!fechaStr) return 'pendiente'

  const [yStr, mStr] = fechaStr.split('T')[0].split('-')
  const vencYear = Number(yStr)
  const vencMonth = Number(mStr) - 1 // 0-indexed

  const hoyYear = hoy.getUTCFullYear()
  const hoyMonth = hoy.getUTCMonth() // 0-indexed
  const hoyDay = hoy.getUTCDate()

  // Diferencia exacta en meses de calendario
  const mesesDiferencia = (hoyYear - vencYear) * 12 + (hoyMonth - vencMonth)

  // 1. Cargo de 2 o más meses de calendario atrás -> Urgente
  if (mesesDiferencia >= 2) {
    return 'urgente'
  }

  // 2. Cargo de exactamente 1 mes de calendario atrás (ej: cargo de julio estando en agosto)
  if (mesesDiferencia === 1) {
    // Permanece en Atrasado durante los primeros días del nuevo mes;
    // escala a Urgente sólo al alcanzar el dia_urgente del mes actual (ej: día 20)
    if (hoyDay >= diaUrgente) return 'urgente'
    return 'atrasado'
  }

  // 3. Cargo del mes de calendario actual (mesesDiferencia === 0)
  if (mesesDiferencia === 0) {
    if (hoyDay >= diaUrgente) return 'urgente'
    if (hoyDay >= diaAtrasado) return 'atrasado'
    return 'pendiente'
  }

  // 4. Cargo de meses futuros (mesesDiferencia < 0)
  return 'pendiente'
}

/**
 * Clasifica el estado financiero del alumno dado el conjunto de cargos con saldo pendiente.
 * `hoy` debe venir de ahoraAcademia(timezone) con el timezone real de la academia.
 */
export function clasificarAlumno(
  cargos: CargoLite[],
  hoy: Date,
  config?: ConfigEstadosPago | null
): EstadoFinancieroAlumno {
  if (!cargos || cargos.length === 0) return 'al_dia'

  const diaAtrasado = Number(config?.dia_atrasado) || 6
  const diaUrgente = Number(config?.dia_urgente) || 20

  const esMensualidad = (c: CargoLite) =>
    c.origen === 'recurrente' || /mensualidad|colegiatura|cuota/i.test(c.concepto ?? '')

  const mensualidadesAdeudadas = cargos.filter(esMensualidad).length

  // Acumulación de 2 o más mensualidades no pagadas de cualquier mes -> Urgente
  if (mensualidadesAdeudadas >= 2) return 'urgente'

  // Evaluar severidad individual de cada cargo
  const estados = cargos.map(c => clasificarCargoIndividual(c, hoy, diaAtrasado, diaUrgente))

  if (estados.includes('urgente')) return 'urgente'
  if (estados.includes('atrasado')) return 'atrasado'
  return 'pendiente'
}
