'use client'

import * as React from 'react'
import { XCircle, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/currency'
import {
  configEvento,
  accionAnulable,
  formatFechaEvento,
  type EventoTimeline,
  type AccionAnulable,
} from './evento-config'

type Props = {
  evento: EventoTimeline
  /** Última fila visible: oculta la línea conectora inferior. */
  isLast?: boolean
  /** Si se provee, las filas FINANZAS anulables muestran el botón de anular. */
  onAnular?: (accion: NonNullable<AccionAnulable>, evento: EventoTimeline) => void
}

/**
 * Fila universal del historial (layout de 3 bloques):
 *   A) eje izquierdo  → nodo del timeline (círculo mínimo con borde) + línea continua
 *   B) bloque central → título / subtítulo / fecha
 *   C) eje derecho    → impacto financiero (sólo categoría FINANZAS con monto)
 */
export function EventoRow({
  evento,
  isLast = false,
  onAnular,
}: Props) {
  const { Icon, iconClass, borderClass, tituloClass, signo, montoClass } = configEvento(evento)
  const esFinanzas = evento.categoria === 'FINANZAS'
  const monto = evento.monto != null ? Number(evento.monto) : null
  const mostrarMonto = esFinanzas && monto != null && signo != null
  const accion = esFinanzas && onAnular ? accionAnulable(evento) : null

  return (
    <div className="flex items-start justify-between py-2">
      {/* A) Eje izquierdo: nodo mínimo + línea conectora continua */}
      <div className="relative self-stretch flex-shrink-0">
        <div className={cn('w-6 h-6 rounded-full border bg-background flex items-center justify-center', borderClass)}>
          <Icon className={cn('h-3.5 w-3.5', iconClass)} />
        </div>
        {!isLast && (
          <div className="w-px bg-[#E0E0E0] absolute left-3 -translate-x-1/2 top-6 -bottom-4" />
        )}
      </div>

      {/* B) Bloque central */}
      <div className="flex-1 min-w-0 ml-3">
        <span className={cn('font-semibold text-sm block', tituloClass)}>
          {evento.titulo}
        </span>
        {evento.descripcion && (
          <span className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 block line-clamp-2">
            {evento.descripcion}
          </span>
        )}
        <span className="text-slate-400 dark:text-slate-500 text-[10px] mt-1 block">
          {formatFechaEvento(evento.fecha_evento)}
        </span>
      </div>

      {/* C) Eje derecho: impacto financiero (condicional) */}
      {esFinanzas && (mostrarMonto || accion) && (
        <div className="flex flex-col items-end flex-shrink-0 ml-2">
          {mostrarMonto && (
            <span className={cn('font-bold text-sm text-right block', montoClass)}>
              {signo} {formatCurrency(monto!)}
            </span>
          )}
          {accion && (
            <button
              type="button"
              onClick={() => onAnular!(accion, evento)}
              className="mt-1 p-1.5 -mr-1.5 rounded-full text-slate-400 hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
              aria-label={accion.kind === 'pago' ? 'Anular pago' : 'Anular cargo'}
            >
              {accion.kind === 'pago' ? <Undo2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
