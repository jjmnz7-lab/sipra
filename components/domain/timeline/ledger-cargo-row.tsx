'use client'

import * as React from 'react'
import { formatCurrency } from '@/lib/utils/currency'
import { iconoEvento } from './evento-icono'

type EventoCargo = {
  id: string
  tipo: string
  titulo: string
  fecha_evento: string
  metadata?: Record<string, any> | null
}

/**
 * Fila ultra-compacta de un CARGO dentro del Ledger (estado de cuenta).
 * Formato: punto del timeline · Concepto / Fecha · +Monto · Saldo resultante.
 * Los demás eventos (abonos, promesas, notas…) se siguen renderizando como Cards.
 */
export function LedgerCargoRow({
  evento,
  saldoResultante,
  withYear = false,
}: {
  evento: EventoCargo
  saldoResultante?: number
  withYear?: boolean
}) {
  const { Icon, color, bg } = iconoEvento(evento.tipo)
  const monto = Number(evento.metadata?.monto)
  const tieneMonto = Number.isFinite(monto)

  const fecha = new Date(evento.fecha_evento).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  })

  return (
    <div className="relative pl-6">
      <div
        className={`absolute -left-[13px] top-1 h-6 w-6 rounded-full border-4 border-background flex items-center justify-center ${bg}`}
      >
        <Icon className={`h-3 w-3 ${color}`} />
      </div>

      <div className="flex items-baseline justify-between gap-3 py-0.5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate leading-tight">{evento.titulo}</p>
          <p className="text-[10px] text-muted-foreground/80 font-medium mt-0.5">{fecha}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          {tieneMonto && (
            <p className="text-sm font-bold text-foreground leading-tight">+{formatCurrency(monto)}</p>
          )}
          {saldoResultante != null && (
            <p className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">
              Saldo: {formatCurrency(saldoResultante)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
