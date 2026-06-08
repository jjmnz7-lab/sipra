// Cálculo del saldo corriente (estado de cuenta) para el Ledger del alumno.
//
// El saldo resultante de cada cargo = saldo de la cuenta corriente DESPUÉS de ese
// movimiento. Se ancla al saldo vivo real (`persona.saldo_acumulado`) y se camina
// hacia atrás (newest → oldest) restando el delta firmado de cada evento. Así las
// filas más recientes son exactas aunque eventos legacy carezcan de metadata.monto.

export type EventoLedger = {
  id: string
  tipo: string
  metadata?: Record<string, any> | null
}

/** Tipos de evento que representan un cargo (suman al saldo). Incluye alias legacy. */
const TIPOS_CARGO = new Set(['cargo_generado', 'cargo_creado', 'cargo_individual'])

/** ¿El evento es un cargo? (se renderiza con la fila compacta del ledger). */
export function esEventoCargo(tipo: string): boolean {
  return TIPOS_CARGO.has(tipo)
}

/**
 * Delta firmado que el evento aplica al saldo corriente:
 *   cargo            → +monto
 *   abono            → −monto
 *   cargo anulado    → −monto (revierte un cargo)
 *   pago anulado     → +monto (revierte un abono)
 *   otros (nota, promesa, recordatorio…) → 0
 */
export function signedDelta(evento: EventoLedger): number {
  const monto = Number(evento.metadata?.monto)
  if (!Number.isFinite(monto)) return 0

  if (TIPOS_CARGO.has(evento.tipo)) return monto
  if (evento.tipo === 'abono_registrado') return -monto
  if (evento.tipo === 'cargo_anulado') return -monto
  if (evento.tipo === 'pago_anulado') return monto
  return 0
}

/**
 * Mapa id_evento → saldo resultante, recorriendo los eventos en el orden en que
 * llegan (descendente: más reciente primero). El primero hereda el saldo actual y
 * cada paso resta su propio delta para obtener el saldo del evento más antiguo.
 */
export function computeSaldosResultantes(
  eventosDesc: EventoLedger[],
  saldoActual: number,
): Map<string, number> {
  const saldos = new Map<string, number>()
  let running = Number(saldoActual) || 0
  for (const ev of eventosDesc) {
    saldos.set(ev.id, running)
    running -= signedDelta(ev)
  }
  return saldos
}
