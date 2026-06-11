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

  const [cargosMesRes, alumnosRes] = await Promise.all([
    // Cargos cuyo vencimiento cae en el mes actual o generados en este mes (para la barra esperado vs cobrado).
    supabase
      .from('cargo')
      .select('monto_original, saldo_pendiente')
      .eq('academia_id', academiaId)
      .or(`and(fecha_vencimiento.gte.${ymd(inicioMes)},fecha_vencimiento.lt.${ymd(inicioMesSig)}),and(created_at.gte.${inicioMes.toISOString()},created_at.lt.${inicioMesSig.toISOString()})`),
    // Alumnos activos y sus cargos pendientes para la deuda y estados
    supabase
      .from('persona')
      .select('id, cargo (persona_id, saldo_pendiente, concepto, estado_financiero, fecha_vencimiento)')
      .eq('academia_id', academiaId)
      .eq('etiqueta', 'alumno')
      .eq('estado_registro', 'activo'),
  ])

  // --- Barra del mes: esperado / cobrado / pendiente ---
  const cargosMes = (cargosMesRes.data ?? []) as { monto_original: number; saldo_pendiente: number }[]
  const esperadoMes = cargosMes.reduce((acc, c) => acc + Number(c.monto_original), 0)
  const pendienteMes = cargosMes.reduce((acc, c) => acc + Number(c.saldo_pendiente), 0)
  const cobradoMes = esperadoMes - pendienteMes

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
      esperadoMes={esperadoMes}
      cobradoMes={cobradoMes}
      pendienteMes={pendienteMes}
      countAlDia={countEstados.al_dia}
      countPendiente={countEstados.pendiente}
      countAtrasado={countEstados.atrasado}
      countUrgente={countEstados.urgente}
      totalAlumnos={totalAlumnosReporte}
    />
  )
}
