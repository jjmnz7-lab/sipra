/**
 * Catálogo y helpers para días de la semana del grupo/taller.
 * Convención: 0=Domingo, 1=Lunes, ..., 6=Sábado.
 *
 * El orden visual del selector (cuadrícula horizontal) empieza en Lunes para
 * acompañar la convención latinoamericana de calendario.
 */

export type DiaSemanaConfig = {
  /** 0=Dom..6=Sáb (mismo entero que se persiste en grupo.dias_semana). */
  value: number
  /** Etiqueta de 1 carácter para la cuadrícula. */
  shortLabel: string
  /** Etiqueta de 3 caracteres para la línea descriptiva (card, listón). */
  abbr: string
  /** Etiqueta completa para tooltips/lectores de pantalla. */
  fullLabel: string
}

export const DIAS_SEMANA: DiaSemanaConfig[] = [
  { value: 1, shortLabel: 'Lu', abbr: 'Lun', fullLabel: 'Lunes' },
  { value: 2, shortLabel: 'Ma', abbr: 'Mar', fullLabel: 'Martes' },
  { value: 3, shortLabel: 'Mi', abbr: 'Mié', fullLabel: 'Miércoles' },
  { value: 4, shortLabel: 'Ju', abbr: 'Jue', fullLabel: 'Jueves' },
  { value: 5, shortLabel: 'Vi', abbr: 'Vie', fullLabel: 'Viernes' },
  { value: 6, shortLabel: 'Sá', abbr: 'Sáb', fullLabel: 'Sábado' },
  { value: 0, shortLabel: 'Do', abbr: 'Dom', fullLabel: 'Domingo' },
]

const DIA_BY_VALUE = new Map<number, DiaSemanaConfig>(DIAS_SEMANA.map((d) => [d.value, d]))

/**
 * Convierte un arreglo de días persistidos en una etiqueta legible:
 *   [1] → "Lun"
 *   [1, 3, 5] → "Lun, Mié y Vie"
 *   [] / null → null
 */
export function formatearDiasSemana(dias: number[] | null | undefined): string | null {
  if (!dias || dias.length === 0) return null
  const abbrs = DIAS_SEMANA.filter((d) => dias.includes(d.value)).map((d) => d.abbr)
  if (abbrs.length === 0) return null
  if (abbrs.length === 1) return abbrs[0]
  const ultimo = abbrs[abbrs.length - 1]
  const resto = abbrs.slice(0, -1).join(', ')
  return `${resto} y ${ultimo}`
}

/**
 * Formatea días de la semana a su representación más corta pero entendible.
 * Regla:
 *   Si la cantidad de etiquetas resultantes es <= 3:
 *     Usar etiquetas de 3 letras (Lun, Mar, Mié, Jue, Vie, Sáb, Dom).
 *   Si la cantidad de etiquetas es > 3:
 *     Usar etiquetas de 2 letras (Lu, Ma, Mi, Ju, Vi, Sá, Do).
 *   Agrupar con guion (-) cuando haya de 3 a más días consecutivos (o fin de semana Sá-Do).
 */
export function formatearDiasSemanaCorto(dias: number[] | null | undefined): string | null {
  if (!dias || dias.length === 0) return null

  // Ordenar días: Lunes (1) a Domingo (0)
  const order = [1, 2, 3, 4, 5, 6, 0]
  const sorted = [...dias].sort((a, b) => order.indexOf(a) - order.indexOf(b))

  const LABELS_2: Record<number, string> = {
    1: 'Lu', 2: 'Ma', 3: 'Mi', 4: 'Ju', 5: 'Vi', 6: 'Sá', 0: 'Do'
  }
  const LABELS_3: Record<number, string> = {
    1: 'Lun', 2: 'Mar', 3: 'Mie', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 0: 'Dom'
  }

  const runs: number[][] = []
  let currentRun: number[] = []

  for (let i = 0; i < sorted.length; i++) {
    const day = sorted[i]!
    if (currentRun.length === 0) {
      currentRun.push(day)
    } else {
      const lastDay = currentRun[currentRun.length - 1]!
      const isConsecutive = order.indexOf(day) === order.indexOf(lastDay) + 1
      if (isConsecutive) {
        currentRun.push(day)
      } else {
        runs.push(currentRun)
        currentRun = [day]
      }
    }
  }
  if (currentRun.length > 0) {
    runs.push(currentRun)
  }

  const formatWithLabels = (labels: Record<number, string>) => {
    return runs.map((run) => {
      const isWeekend = run.length === 2 && run[0] === 6 && run[1] === 0
      if (run.length >= 3 || isWeekend) {
        return `${labels[run[0]!]}-${labels[run[run.length - 1]!]}`
      } else if (run.length === 2) {
        return `${labels[run[0]!]},${labels[run[1]!]}`
      } else {
        return `${labels[run[0]!]}`
      }
    }).join(',')
  }

  const labelCount = runs.reduce((acc, run) => {
    const isWeekend = run.length === 2 && run[0] === 6 && run[1] === 0
    if (run.length >= 3 || isWeekend) {
      return acc + 2
    } else {
      return acc + run.length
    }
  }, 0)

  if (labelCount <= 3) {
    return formatWithLabels(LABELS_3)
  } else {
    return formatWithLabels(LABELS_2)
  }
}

/**
 * Formatea un par de horas TIME (`HH:MM[:SS]`) a una etiqueta tipo "6:00 - 8:00 pm".
 * Si solo hay hora_inicio, devuelve "6:00 pm".
 * Si no hay inicio, devuelve null.
 */
export function formatearHorario(horaInicio: string | null | undefined, horaFin: string | null | undefined): string | null {
  if (!horaInicio) return null
  const inicio = formatearHora12(horaInicio)
  if (!horaFin) return inicio
  const fin = formatearHora12(horaFin)
  // Si ambos comparten meridiano, omite el del primero para ahorrar caracteres.
  const sufInicio = inicio.slice(-2)
  const sufFin = fin.slice(-2)
  if (sufInicio === sufFin) {
    return `${inicio.slice(0, -3)} - ${fin}`
  }
  return `${inicio} - ${fin}`
}

/** "18:00" → "6:00 pm"; "09:30" → "9:30 am". */
export function formatearHora12(horaTime: string): string {
  const [hhStr = '0', mmStr = '0'] = horaTime.split(':')
  const hh = Number(hhStr) || 0
  const mm = Number(mmStr) || 0
  const periodo = hh >= 12 ? 'pm' : 'am'
  let h12 = hh % 12
  if (h12 === 0) h12 = 12
  const mmFmt = String(mm).padStart(2, '0')
  return `${h12}:${mmFmt} ${periodo}`
}

export function getDiaByValue(value: number): DiaSemanaConfig | undefined {
  return DIA_BY_VALUE.get(value)
}
