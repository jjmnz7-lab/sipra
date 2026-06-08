import { createClient } from '@/lib/supabase/server'
import { ReportesClientView } from './reportes-client-view'
import { clasificarAlumno, type EstadoFinancieroAlumno } from '@/lib/constants/alumno-finanzas'

export const dynamic = 'force-dynamic'

function ymd(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default async function ReportesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const inicioMes = new Date(y, m, 1)
  const inicioMesSig = new Date(y, m + 1, 1)
  const inicioMesAnt = new Date(y, m - 1, 1)

  const [cargosMesRes, movimientosRes, cargosDeudaRes] = await Promise.all([
    // Cargos cuyo vencimiento cae en el mes actual (para la barra esperado vs cobrado).
    supabase
      .from('cargo')
      .select('monto_original, saldo_pendiente')
      .eq('academia_id', academiaId)
      .gte('fecha_vencimiento', ymd(inicioMes))
      .lt('fecha_vencimiento', ymd(inicioMesSig)),
    // Pagos del mes actual y anterior (excluye anulados).
    supabase
      .from('movimiento')
      .select('monto_total, fecha_pago, estado')
      .eq('academia_id', academiaId)
      .neq('estado', 'anulado')
      .gte('fecha_pago', inicioMesAnt.toISOString())
      .lt('fecha_pago', inicioMesSig.toISOString()),
    // Cargos con saldo pendiente para la deuda acumulada (clasificación por alumno).
    supabase
      .from('cargo')
      .select('persona_id, saldo_pendiente, concepto, estado_financiero, fecha_vencimiento')
      .eq('academia_id', academiaId)
      .in('estado_financiero', ['vencido', 'pendiente', 'parcial']),
  ])

  // --- Barra del mes: esperado / cobrado / pendiente ---
  const cargosMes = (cargosMesRes.data ?? []) as { monto_original: number; saldo_pendiente: number }[]
  const esperadoMes = cargosMes.reduce((acc, c) => acc + Number(c.monto_original), 0)
  const pendienteMes = cargosMes.reduce((acc, c) => acc + Number(c.saldo_pendiente), 0)
  const cobradoMes = esperadoMes - pendienteMes

  // --- Ingresos (pagos recibidos) mes actual vs anterior ---
  const movimientos = (movimientosRes.data ?? []) as { monto_total: number; fecha_pago: string; estado: string }[]
  let ingresosMesActual = 0
  let ingresosMesAnterior = 0
  for (const mov of movimientos) {
    const f = new Date(mov.fecha_pago)
    const monto = Number(mov.monto_total)
    if (f >= inicioMes && f < inicioMesSig) ingresosMesActual += monto
    else if (f >= inicioMesAnt && f < inicioMes) ingresosMesAnterior += monto
  }

  // --- Deuda acumulada por alumno (clasificación del semáforo) ---
  const cargosPorPersona = new Map<string, { concepto: string; estado_financiero: string; fecha_vencimiento: string }[]>()
  const saldoPorPersona = new Map<string, number>()
  const cargosDeuda = (cargosDeudaRes.data ?? []) as { persona_id: string; saldo_pendiente: number; concepto: string; estado_financiero: string; fecha_vencimiento: string }[]
  for (const c of cargosDeuda) {
    if (!c.persona_id) continue
    if (Number(c.saldo_pendiente) <= 0) continue
    const arr = cargosPorPersona.get(c.persona_id) ?? []
    arr.push({ concepto: c.concepto, estado_financiero: c.estado_financiero, fecha_vencimiento: c.fecha_vencimiento })
    cargosPorPersona.set(c.persona_id, arr)
    saldoPorPersona.set(c.persona_id, (saldoPorPersona.get(c.persona_id) ?? 0) + Number(c.saldo_pendiente))
  }

  const deuda: Record<Exclude<EstadoFinancieroAlumno, 'al_dia'>, number> = {
    pendiente: 0,
    atrasado: 0,
    urgente: 0,
  }
  for (const [personaId, cargos] of cargosPorPersona) {
    const estado = clasificarAlumno(cargos, now)
    if (estado === 'al_dia') continue
    deuda[estado] += saldoPorPersona.get(personaId) ?? 0
  }
  const deudaTotal = deuda.pendiente + deuda.atrasado + deuda.urgente

  return (
    <ReportesClientView
      esperadoMes={esperadoMes}
      cobradoMes={cobradoMes}
      pendienteMes={pendienteMes}
      ingresosMesActual={ingresosMesActual}
      ingresosMesAnterior={ingresosMesAnterior}
      deudaPendiente={deuda.pendiente}
      deudaAtrasada={deuda.atrasado}
      deudaUrgente={deuda.urgente}
      deudaTotal={deudaTotal}
    />
  )
}
