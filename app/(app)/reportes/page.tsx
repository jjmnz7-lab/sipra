import { createClient } from '@/lib/supabase/server'
import { ReportesClientView, type CobradoMes } from './reportes-client-view'
import { clasificarAlumno } from '@/lib/constants/alumno-finanzas'
import { fetchLotesCargos } from '@/lib/reportes/cargos-grupales'
import { ahoraAcademia, zonedAcademia, obtenerTimezoneAcademia } from '@/lib/utils/fecha-academia'

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
  timezone: string,
): Promise<CobradoMes> {
  // now viene "falso-UTC" (ver zonedAcademia): siempre getUTC*(), nunca
  // accesores locales, para no depender del huso del proceso que ejecuta esto.
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const inicioMes = new Date(Date.UTC(y, m, 1))
  const inicioSerie = new Date(Date.UTC(y, m - 11, 1)) // últimos 12 meses, incluido el actual

  // Monday of this week:
  const dayOfWeek = now.getUTCDay()
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const inicioSemana = new Date(Date.UTC(y, m, now.getUTCDate() - daysToSubtract, 0, 0, 0, 0))

  // Today (00:00:00)
  const inicioHoy = new Date(Date.UTC(y, m, now.getUTCDate(), 0, 0, 0, 0))

  const { data: eventosRes } = await supabase
    .from('evento_timeline')
    .select('tipo, monto, fecha_evento, metadata')
    .eq('academia_id', academiaId)
    .in('tipo', ['PAGO_ABONO', 'ANULACION_PAGO'])
    .gte('fecha_evento', inicioSerie.toISOString())

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventos = (eventosRes ?? []) as any[]

  const claveMes = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}`
  const porMes = new Map<string, number>()
  const mesesConHistorial = new Set<string>()

  let totalMes = 0
  const metodosMes = new Map<string, number>()
  const anulacionesMes: { movimientoId: string | null; monto: number }[] = []

  let totalSemana = 0
  const metodosSemana = new Map<string, number>()
  const anulacionesSemana: { movimientoId: string | null; monto: number }[] = []

  let totalHoy = 0
  const metodosHoy = new Map<string, number>()
  const anulacionesHoy: { movimientoId: string | null; monto: number }[] = []

  for (const e of eventos) {
    const monto = Number(e.monto ?? 0)
    if (!monto) continue
    const meta = e.metadata ?? {}

    // Descuentos y anulaciones de descuentos: no son dinero nuevo/ingresos.
    const isDescuento =
      (e.tipo === 'PAGO_ABONO' && (meta.metodo === 'descuento' || meta.metodo_pago === 'descuento')) ||
      (e.tipo === 'ANULACION_PAGO' && e.titulo === 'Descuento anulado') ||
      (e.tipo === 'DESCUENTO')

    if (isDescuento) continue

    // Consumo de saldo a favor: no es dinero nuevo.
    if (e.tipo === 'PAGO_ABONO' && meta.tipo === 'saldo_a_favor') continue

    // fecha_evento es un instante real (timestamptz); se convierte al
    // calendario de la academia antes de decidir a qué mes pertenece.
    const fecha = zonedAcademia(new Date(e.fecha_evento), timezone)
    const k = claveMes(fecha)
    const signo = e.tipo === 'PAGO_ABONO' ? 1 : -1
    const amount = signo * monto
    porMes.set(k, (porMes.get(k) ?? 0) + amount)
    mesesConHistorial.add(k)

    if (fecha >= inicioMes) {
      totalMes += amount
      if (e.tipo === 'PAGO_ABONO') {
        const metodo = capitalizar(String(meta.metodo ?? 'otro').toLowerCase())
        metodosMes.set(metodo, (metodosMes.get(metodo) ?? 0) + monto)
      } else {
        anulacionesMes.push({ movimientoId: meta.movimiento_id ?? null, monto })
      }
    }

    if (fecha >= inicioSemana) {
      totalSemana += amount
      if (e.tipo === 'PAGO_ABONO') {
        const metodo = capitalizar(String(meta.metodo ?? 'otro').toLowerCase())
        metodosSemana.set(metodo, (metodosSemana.get(metodo) ?? 0) + monto)
      } else {
        anulacionesSemana.push({ movimientoId: meta.movimiento_id ?? null, monto })
      }
    }

    if (fecha >= inicioHoy) {
      totalHoy += amount
      if (e.tipo === 'PAGO_ABONO') {
        const metodo = capitalizar(String(meta.metodo ?? 'otro').toLowerCase())
        metodosHoy.set(metodo, (metodosHoy.get(metodo) ?? 0) + monto)
      } else {
        anulacionesHoy.push({ movimientoId: meta.movimiento_id ?? null, monto })
      }
    }
  }

  // Resta cada anulación del método con el que se registró el pago original.
  const ids = Array.from(new Set([
    ...anulacionesMes.map((a) => a.movimientoId),
    ...anulacionesSemana.map((a) => a.movimientoId),
    ...anulacionesHoy.map((a) => a.movimientoId)
  ])).filter(Boolean) as string[]

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

  const restarAnulaciones = (
    anulaciones: { movimientoId: string | null; monto: number }[],
    metodosMap: Map<string, number>,
  ) => {
    for (const a of anulaciones) {
      const metodo = (a.movimientoId && metodoPorMov.get(a.movimientoId)) || 'Otro'
      metodosMap.set(metodo, (metodosMap.get(metodo) ?? 0) - a.monto)
    }
  }

  restarAnulaciones(anulacionesMes, metodosMes)
  restarAnulaciones(anulacionesSemana, metodosSemana)
  restarAnulaciones(anulacionesHoy, metodosHoy)

  // Serie de los últimos 12 meses; se recortan los meses previos al primer
  // movimiento registrado (academias con menos historial).
  const meses: { label: string; total: number }[] = []
  let historiaIniciada = false
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - i, 1))
    const k = claveMes(d)
    if (!historiaIniciada && !mesesConHistorial.has(k) && i > 0) continue
    historiaIniciada = true
    const mesCorto = capitalizar(
      d.toLocaleDateString('es-MX', { month: 'short', timeZone: 'UTC' }).replace('.', ''),
    )
    const label = d.getUTCFullYear() !== y ? `${mesCorto} ${String(d.getUTCFullYear()).slice(-2)}` : mesCorto
    meses.push({ label, total: porMes.get(k) ?? 0 })
  }

  // Efectivo y Transferencia siempre se muestran (aunque queden en 0, son los
  // únicos métodos que ofrece la UI de cobro); los demás solo si tienen monto.
  const ORDEN_BASE = ['Efectivo', 'Transferencia']
  const formatearMetodos = (metodosMap: Map<string, number>) => {
    const metodos: { label: string; monto: number }[] = ORDEN_BASE.map((label) => ({
      label,
      monto: metodosMap.get(label) ?? 0,
    }))
    for (const [label, monto] of Array.from(metodosMap.entries())) {
      if (ORDEN_BASE.includes(label)) continue
      if (Math.abs(monto) >= 0.01) metodos.push({ label, monto })
    }
    return metodos
  }

  const metodosHoyList = formatearMetodos(metodosHoy)
  const metodosSemanaList = formatearMetodos(metodosSemana)
  const metodosMesList = formatearMetodos(metodosMes)

  // Más reciente primero (el mes en curso a la cabeza de la serie).
  const mesLabel = capitalizar(now.toLocaleDateString('es-MX', { month: 'long', timeZone: 'UTC' }))

  return {
    mesLabel,
    total: totalMes,
    metodos: metodosMesList,
    serie: meses.reverse(),
    hoyTotal: totalHoy,
    hoyMetodos: metodosHoyList,
    semanaTotal: totalSemana,
    semanaMetodos: metodosSemanaList,
  }
}

export default async function ReportesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  const timezone = await obtenerTimezoneAcademia(supabase, academiaId)
  const now = ahoraAcademia(timezone)

  const { data: academiaData } = await supabase
    .from('academia')
    .select('config_recargos')
    .eq('id', academiaId)
    .single() as any
  const configRecargos = academiaData?.config_recargos || {}

  const [alumnosRes, lotes, cobradoMes] = await Promise.all([
    // Alumnos activos y sus cargos pendientes para la deuda y estados
    supabase
      .from('persona')
      .select('id, cargo (persona_id, saldo_pendiente, concepto, estado_financiero, fecha_vencimiento, fecha_creacion, created_at, origen)')
      .eq('academia_id', academiaId)
      .eq('etiqueta', 'alumno')
      .eq('estado_registro', 'activo'),
    fetchLotesCargos(supabase, academiaId),
    computarCobrado(supabase, academiaId, now, timezone),
  ])

  // --- Estados financieros de alumnos activos ---
  const countEstados = {
    al_dia: 0,
    pendiente: 0,
    atrasado: 0,
    urgente: 0,
  }

  type AlumnoConCargos = {
    id: string
    cargo: {
      persona_id: string
      saldo_pendiente: number
      concepto: string
      estado_financiero: string
      fecha_vencimiento: string
      fecha_creacion?: string
      created_at?: string
      origen?: string
    }[]
  }

  const activeAlumnos = (alumnosRes.data ?? []) as unknown as AlumnoConCargos[]
  const totalAlumnosReporte = activeAlumnos.length

  for (const p of activeAlumnos) {
    const cargosPendientes = (p.cargo ?? []).filter((c) =>
      ['pendiente', 'parcial', 'vencido'].includes(c.estado_financiero)
    )
    const estado = clasificarAlumno(cargosPendientes, now, configRecargos)
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
