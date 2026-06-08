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

type CargoLite = {
  concepto: string | null
  estado_financiero: string | null
  fecha_vencimiento: string | null
}

/**
 * Clasifica el estado financiero del alumno dado el conjunto de cargos
 * con saldo pendiente. Implementa la regla:
 *  - Sin cargos pendientes → al_dia
 *  - >=2 mensualidades vencidas O >=1 cargo no-mensualidad con
 *    fecha_vencimiento < hoy - 1 mes → urgente
 *  - >=1 cargo con estado_financiero === 'vencido' → atrasado
 *  - Resto (cargos pendiente/parcial sin vencer) → pendiente
 */
export function clasificarAlumno(cargos: CargoLite[], hoy: Date = new Date()): EstadoFinancieroAlumno {
  if (!cargos || cargos.length === 0) return 'al_dia'

  const oneMonthAgo = new Date(hoy)
  oneMonthAgo.setMonth(hoy.getMonth() - 1)

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
