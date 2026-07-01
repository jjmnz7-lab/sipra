import {
  Receipt,
  Banknote,
  CalendarClock,
  XCircle,
  Undo2,
  UserPlus,
  PlusCircle,
  Sparkles,
  UserX,
  UserCheck,
  FolderPlus,
  FolderMinus,
  CreditCard,
  MessageSquare,
  StickyNote,
  Megaphone,
  Tag,
  Circle,
  type LucideIcon,
} from 'lucide-react'

export type EventoTimeline = {
  id: string
  categoria: string
  tipo: string
  titulo: string
  descripcion: string | null
  monto: number | null
  fecha_evento: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any> | null
  actor_nombre?: string | null
}

type EventoUI = {
  Icon: LucideIcon
  /** Color del ícono dentro del círculo. */
  iconClass: string
  /** Color del borde del círculo (mismo color que el ícono). */
  borderClass: string
  /** Color del título (los FINANZAS se tiñen; el resto usa el neutro). */
  tituloClass: string
  /** Signo del monto en el eje derecho ('+' suma deuda, '-' resta deuda). */
  signo: '+' | '-' | null
  /** Clases del monto en el eje derecho. */
  montoClass: string
}

// Paleta: cargos = azul principal • pagos/abonos = verde secundario •
// anulaciones = gris neutro • operativo = azul/slate informativo.
const CARGO: Omit<EventoUI, 'Icon'> = {
  iconClass: 'text-primary',
  borderClass: 'border-primary',
  tituloClass: 'text-primary',
  signo: '+',
  montoClass: 'text-primary',
}

const PAGO: Omit<EventoUI, 'Icon'> = {
  iconClass: 'text-[#22887c]',
  borderClass: 'border-[#22887c]',
  tituloClass: 'text-[#22887c]',
  signo: '-',
  montoClass: 'text-[#22887c]',
}

const ANULACION: Omit<EventoUI, 'Icon'> = {
  iconClass: 'text-slate-400 dark:text-slate-500',
  borderClass: 'border-slate-400 dark:border-slate-500',
  tituloClass: 'text-slate-400 dark:text-slate-500',
  montoClass: 'text-slate-400 dark:text-slate-500',
  signo: null, // se asigna por tipo
}

const NEUTRO_TITULO = 'text-slate-900 dark:text-slate-100'

const OPERATIVO_BLUE: Omit<EventoUI, 'Icon'> = {
  iconClass: 'text-blue-600 dark:text-blue-400',
  borderClass: 'border-blue-600 dark:border-blue-400',
  tituloClass: 'text-blue-600 dark:text-blue-400',
  signo: null,
  montoClass: '',
}

const OPERATIVO_SLATE: Omit<EventoUI, 'Icon'> = {
  iconClass: 'text-slate-500 dark:text-slate-400',
  borderClass: 'border-slate-500 dark:border-slate-400',
  tituloClass: 'text-slate-500 dark:text-slate-400',
  signo: null,
  montoClass: '',
}

/**
 * Configuración visual del evento según la matriz de movimientos.
 * Para tipos con variante (ESTATUS_CAMBIO, GRUPO_MUTACION, ESQUEMA_MUTACION)
 * la variante se resuelve por el título.
 */
export function configEvento(evento: Pick<EventoTimeline, 'tipo' | 'titulo'>): EventoUI {
  const esRemocion = /removid|suspendid|baja/i.test(evento.titulo)

  switch (evento.tipo) {
    // ── FINANZAS: cargos (de cualquier tipo) ────────────────────────────────
    case 'CARGO_RECURRENTE':
    case 'RECARGO_TARDIO':
    case 'INSCRIPCION':
    case 'CARGO_UNICO':
    case 'CARGO_MASIVO':
      return { Icon: Receipt, ...CARGO }

    // ── FINANZAS: pagos / abonos ────────────────────────────────────────────
    case 'PAGO_ABONO':
      return { Icon: Banknote, ...PAGO }

    // ── FINANZAS: descuento informativo (beca / hermanos). No mueve saldo:
    //    el cargo ya se generó por el neto, esta línea solo documenta el ajuste.
    case 'DESCUENTO':
      return {
        Icon: Tag,
        iconClass: 'text-[#22887c]',
        borderClass: 'border-[#22887c]',
        tituloClass: 'text-[#22887c]',
        signo: null,
        montoClass: 'text-[#22887c]',
      }

    case 'PROMESA':
      return {
        Icon: CalendarClock,
        iconClass: 'text-amber-600 dark:text-amber-400',
        borderClass: 'border-amber-600 dark:border-amber-400',
        tituloClass: 'text-amber-600 dark:text-amber-400',
        signo: null,
        montoClass: '',
      }

    // ── FINANZAS: anulaciones (neutras) ─────────────────────────────────────
    case 'ANULACION_CARGO':
      return { Icon: XCircle, ...ANULACION, signo: '-' }
    case 'ANULACION_PAGO':
      return { Icon: Undo2, ...ANULACION, signo: '+' }

    // ── OPERATIVO ───────────────────────────────────────────────────────────
    case 'REGISTRO':
      return { Icon: UserPlus, ...OPERATIVO_BLUE }
    case 'INSCRIPCION_NUEVO_GRUPO':
      return { Icon: PlusCircle, ...OPERATIVO_BLUE }
    case 'INSCRIPCION_ACTIVIDAD':
      return { Icon: Sparkles, ...OPERATIVO_BLUE }
    case 'ESTATUS_CAMBIO':
      return esRemocion
        ? { Icon: UserX, ...OPERATIVO_SLATE }
        : { Icon: UserCheck, ...OPERATIVO_BLUE }
    case 'GRUPO_MUTACION':
      return esRemocion
        ? { Icon: FolderMinus, ...OPERATIVO_SLATE }
        : { Icon: FolderPlus, ...OPERATIVO_BLUE }
    case 'ESQUEMA_MUTACION':
      return esRemocion
        ? { Icon: CreditCard, ...OPERATIVO_SLATE }
        : { Icon: CreditCard, ...OPERATIVO_BLUE }
    case 'NOTA':
      return { Icon: StickyNote, ...OPERATIVO_SLATE }
    case 'AVISO_GRUPAL':
      return { Icon: Megaphone, ...OPERATIVO_BLUE }

    // ── COMUNICACION ────────────────────────────────────────────────────────
    case 'MENSAJE_AUTOMATICO':
      return { Icon: MessageSquare, iconClass: 'text-[#22887c]', borderClass: 'border-[#22887c]', tituloClass: 'text-[#22887c]', signo: null, montoClass: '' }

    default:
      return { Icon: Circle, ...OPERATIVO_SLATE }
  }
}

/** Tipos FINANZAS cuyo cargo se puede anular desde el historial. */
const TIPOS_CARGO_ANULABLE = new Set([
  'CARGO_RECURRENTE',
  'RECARGO_TARDIO',
  'INSCRIPCION',
  'CARGO_UNICO',
  'CARGO_MASIVO',
])

export type AccionAnulable =
  | { kind: 'cargo'; cargoId: string }
  | { kind: 'pago'; movimientoId: string }
  | null

/** Resuelve si el evento permite anular su cargo/pago de origen. */
export function accionAnulable(evento: EventoTimeline): AccionAnulable {
  const meta = evento.metadata ?? {}
  if (evento.tipo === 'PAGO_ABONO' && meta.movimiento_id && meta.tipo !== 'saldo_a_favor') {
    return { kind: 'pago', movimientoId: meta.movimiento_id }
  }
  if (TIPOS_CARGO_ANULABLE.has(evento.tipo) && meta.cargo_id) {
    return { kind: 'cargo', cargoId: meta.cargo_id }
  }
  return null
}

/** "4 jun" — sólo fecha; agrega el año cuando no es el año en curso. */
export function formatFechaEvento(fechaIso: string): string {
  const fecha = new Date(fechaIso)
  return fecha.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    ...(fecha.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
  })
}

/** "Junio 2026" — etiqueta del separador mensual del historial completo. */
export function etiquetaMes(fechaIso: string): string {
  const txt = new Date(fechaIso).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

/** Llave año-mes para detectar cambios de mes entre eventos consecutivos. */
export function claveMes(fechaIso: string): string {
  const f = new Date(fechaIso)
  return `${f.getFullYear()}-${f.getMonth()}`
}
