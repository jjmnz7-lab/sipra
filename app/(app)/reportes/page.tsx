import { createClient } from '@/lib/supabase/server'
import { ReportesClientView, type CobradoMes } from './reportes-client-view'
import { clasificarAlumno } from '@/lib/constants/alumno-finanzas'
import { fetchLotesCargos } from '@/lib/reportes/cargos-grupales'

export const dynamic = 'force-dynamic'

function capitalizar(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Cobranza real: eventos PAGO_ABONO (dinero recibido) menos ANULACION_PAGO
 * aplicadas en el periodo. Los PAGO_ABONO de saldo a favor se excluyen porque
 * ese dinero ya contó el día que entró (evita doble conteo).
 */
async function computarCobrado(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  academiaId: string,
  now: Date,
): Promise<CobradoMes> {
  const y = now.getFullYear()
  const m = now.getMonth()
  const inicioMes = new Date(y, m, 1)
  const inicioSerie = new Date(y, m - 11, 1) // últimos 12 meses, incluido el actual

  const { data: eventosRes } = await supabase
    .from('evento_timeline')
    .select('tipo, monto, fecha_evento, metadata')
    .eq('academia_id', academiaId)
    .in('tipo', ['PAGO_ABONO', 'ANULACION_PAGO'])
    .gte('fecha_evento', inicioSerie.toISOString())

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventos = (eventosRes ?? []) as any[]

  const claveMes = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`
  const porMes = new Map<string, number>()
  const mesesConHistorial = new Set<string>()

  let totalMes = 0
  const metodosMes = new Map<string, number>()
  // Anulaciones del mes: el método se resuelve por el movimiento anulado.
  const anulacionesMes: { movimientoId: string | null; monto: number }[] = []

  for (const e of eventos) {
    const monto = Number(e.monto ?? 0)
    if (!monto) continue
    const meta = e.metadata ?? {}
    // Consumo de saldo a favor: no es dinero nuevo.
    if (e.tipo === 'PAGO_ABONO' && meta.tipo === 'saldo_a_favor') continue

    const fecha = new Date(e.fecha_evento)
    const k = claveMes(fecha)
    const signo = e.tipo === 'PAGO_ABONO' ? 1 : -1
    porMes.set(k, (porMes.get(k) ?? 0) + signo * monto)
    mesesConHistorial.add(k)

    if (fecha >= inicioMes) {
      totalMes += signo * monto
      if (e.tipo === 'PAGO_ABONO') {
        const metodo = capitalizar(String(meta.metodo ?? 'otro').toLowerCase())
        metodosMes.set(metodo, (metodosMes.get(metodo) ?? 0) + monto)
      } else {
        anulacionesMes.push({ movimientoId: meta.movimiento_id ?? null, monto })
      }
    }
  }

  // Resta cada anulación del método con el que se registró el pago original.
  if (anulacionesMes.length > 0) {
    const ids = anulacionesMes.map((a) => a.movimientoId).filter(Boolean) as string[]
    const metodoPorMov = new Map<string, string>()
    if (ids.length > 0) {
      const { data: movs } = await supabase
        .from('movimiento')
        .select('id, metodo_pago')
        .in('id', ids)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const mov of (movs ?? []) as any[]) {
        metodoPorMov.set(mov.id, capitalizar(String(mov.metodo_pago ?? 'otro').toLowerCase()))
      }
    }
    for (const a of anulacionesMes) {
      const metodo = (a.movimientoId && metodoPorMov.get(a.movimientoId)) || 'Otro'
      metodosMes.set(metodo, (metodosMes.get(metodo) ?? 0) - a.monto)
    }
  }

  // Serie de los últimos 12 meses; se recortan los meses previos al primer
  // movimiento registrado (academias con menos historial).
  const meses: { label: string; total: number }[] = []
  let historiaIniciada = false
  for (let i = 11; i >= 0; i--) {
    const d = new Date(y, m - i, 1)
    const k = claveMes(d)
    if (!historiaIniciada && !mesesConHistorial.has(k) && i > 0) continue
    historiaIniciada = true
    const mesCorto = capitalizar(d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', ''))
    const label = d.getFullYear() !== y ? `${mesCorto} ${String(d.getFullYear()).slice(-2)}` : mesCorto
    meses.push({ label, total: porMes.get(k) ?? 0 })
  }

  // Efectivo y Transferencia siempre se muestran (aunque queden en 0, son los
  // únicos métodos que ofrece la UI de cobro); los demás solo si tienen monto.
  const ORDEN_BASE = ['Efectivo', 'Transferencia']
  const metodos: { label: string; monto: number }[] = ORDEN_BASE.map((label) => ({
    label,
    monto: metodosMes.get(label) ?? 0,
  }))
  for (const [label, monto] of Array.from(metodosMes.entries())) {
    if (ORDEN_BASE.includes(label)) continue
    if (Math.abs(monto) >= 0.01) metodos.push({ label, monto })
  }

  // Más reciente primero (el mes en curso a la cabeza de la serie).
  const mesLabel = capitalizar(now.toLocaleDateString('es-MX', { month: 'long' }))
  return { mesLabel, total: totalMes, metodos, serie: meses.reverse() }
}

export default async function ReportesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  const now = new Date()

  const [alumnosRes, lotes, cobradoMes] = await Promise.all([
    // Alumnos activos y sus cargos pendientes para la deuda y estados
    supabase
      .from('persona')
      .select('id, cargo (persona_id, saldo_pendiente, concepto, estado_financiero, fecha_vencimiento)')
      .eq('academia_id', academiaId)
      .eq('etiqueta', 'alumno')
      .eq('estado_registro', 'activo'),
    fetchLotesCargos(supabase, academiaId),
    computarCobrado(supabase, academiaId, now),
  ])

  // --- Estados financieros de alumnos activos ---
  const countEstados = {
    al_dia: 0,
    pendiente: 0,
    atrasado: 0,
    urgente: 0,
  }

  const activeAlumnos = (alumnosRes.data ?? []) as any[]
  const totalAlumnosReporte = activeAlumnos.length

  for (const p of activeAlumnos) {
    const cargosPendientes = (p.cargo ?? []).filter((c: any) =>
      ['pendiente', 'parcial', 'vencido'].includes(c.estado_financiero)
    )
    const estado = clasificarAlumno(cargosPendientes, now)
    countEstados[estado]++
  }

  return (
    <ReportesClientView
      cobradoMes={cobradoMes}
      countAlDia={countEstados.al_dia}
      countPendiente={countEstados.pendiente}
      countAtrasado={countEstados.atrasado}
      countUrgente={countEstados.urgente}
      totalAlumnos={totalAlumnosReporte}
      lotes={lotes}
    />
  )
}
