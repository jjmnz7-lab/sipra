import { createClient } from '@/lib/supabase/server'
import { AlumnosClientView } from './alumnos-client-view'
import { clasificarAlumno, type EstadoFinancieroAlumno } from '@/lib/constants/alumno-finanzas'

export const dynamic = 'force-dynamic'

export type AlumnoListItem = {
  id: string
  nombre: string
  apellido: string | null
  telefono_whatsapp: string | null
  estado_registro: string
  created_at: string
  grupo: { id: string; nombre: string; color: string | null } | null
  planes: { id: string; nombre: string }[]
  sinGrupo: boolean
  sinPlan: boolean
  /** Huérfano según la regla estricta: sin plan, o con plan recurrente y sin grupo. */
  esHuerfano: boolean
  estadoFinanciero: EstadoFinancieroAlumno
  saldoTotal: number
}

export type GrupoFiltro = {
  id: string
  nombre: string
  color: string | null
  plan_sugerido_id: string | null
}

export type PlanCobroItem = {
  id: string
  nombre: string
  monto: number
  frecuencia: 'mensual' | 'semanal' | 'por_visita' | 'pago_unico'
  requiere_inscripcion?: boolean
}

export default async function AlumnosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  // Config de cobranza para el preview de prorrateo del CrearPersonaDrawer (FAB)
  const { data: academia } = await supabase
    .from('academia')
    .select('config_cobro, multi_plan_enabled, monto_inscripcion_default, cobrar_inscripcion_default')
    .eq('id', academiaId)
    .single() as any
  const modoProrrateo = (academia?.config_cobro?.modo_prorrateo as 'proporcional' | 'completo') || 'proporcional'
  const multiPlanEnabled = !!academia?.multi_plan_enabled
  const montoInscripcionDefault = Number(academia?.monto_inscripcion_default ?? 0)
  const cobrarInscripcionDefault = !!academia?.cobrar_inscripcion_default

  const { data: grupos } = await supabase
    .from('grupo')
    .select(`
      id, nombre, color, plan_sugerido_id, cupo_maximo,
      persona_grupo (estado)
    `)
    .eq('estado', 'activo')
    .order('nombre', { ascending: true }) as any

  // Planes de cobro (catálogo para el selector de inscripción)
  const { data: planes } = await supabase
    .from('planes_cobro')
    .select('id, nombre, monto, frecuencia, requiere_inscripcion')
    .eq('academia_id', academiaId)
    .eq('activo', true)
    .order('nombre', { ascending: true }) as any

  // Alumnos (cualquier estado_registro) + grupo activo + cargos pendientes
  const { data: personas } = await supabase
    .from('persona')
    .select(`
      id, nombre, apellido, telefono_whatsapp, estado_registro, created_at,
      persona_grupo (
        estado,
        grupo ( id, nombre, color )
      ),
      alumno_planes (
        planes_cobro ( id, nombre, activo, frecuencia )
      ),
      cargo (
        concepto, estado_financiero, fecha_vencimiento, saldo_pendiente
      )
    `)
    .eq('etiqueta', 'alumno')
    .order('nombre', { ascending: true }) as any

  const alumnos: AlumnoListItem[] = (personas ?? []).map((p: any) => {
    const pgActivo = (p.persona_grupo ?? []).find((pg: any) => pg.estado === 'activo')
    const grupo = pgActivo?.grupo
      ? { id: pgActivo.grupo.id, nombre: pgActivo.grupo.nombre, color: pgActivo.grupo.color ?? null }
      : null

    const cargosPendientes = (p.cargo ?? []).filter((c: any) =>
      ['pendiente', 'parcial', 'vencido'].includes(c.estado_financiero),
    )
    const saldoTotal = cargosPendientes.reduce(
      (acc: number, c: any) => acc + Number(c.saldo_pendiente ?? 0),
      0,
    )
    const estadoFinanciero = clasificarAlumno(cargosPendientes)

    // Solo planes ACTIVOS cuentan: un alumno con únicamente planes archivados
    // se considera huérfano de plan (el cron tampoco le genera cargos).
    const planesActivos = (p.alumno_planes ?? [])
      .map((ap: any) => ap.planes_cobro)
      .filter((pc: any) => pc && pc.activo)
    const planes = planesActivos.map((pc: any) => ({ id: pc.id, nombre: pc.nombre }))
    // Plan recurrente = mensual/semanal: solo este tipo dispara la alerta "sin grupo".
    const tieneRecurrente = planesActivos.some(
      (pc: any) => pc.frecuencia === 'mensual' || pc.frecuencia === 'semanal',
    )

    const sinGrupo = !grupo
    const sinPlan = planes.length === 0

    return {
      id: p.id,
      nombre: p.nombre,
      apellido: p.apellido,
      telefono_whatsapp: p.telefono_whatsapp,
      estado_registro: p.estado_registro,
      created_at: p.created_at,
      grupo,
      planes,
      sinGrupo,
      sinPlan,
      // Regla estricta: un alumno solo 'por_visita' sin grupo NO es huérfano.
      esHuerfano: sinPlan || (sinGrupo && tieneRecurrente),
      estadoFinanciero,
      saldoTotal,
    }
  })

  return (
    <AlumnosClientView
      alumnos={alumnos}
      grupos={(grupos ?? []).map((g: any) => ({
        id: g.id,
        nombre: g.nombre,
        color: g.color ?? null,
        plan_sugerido_id: g.plan_sugerido_id ?? null,
        cupo_maximo: g.cupo_maximo ?? null,
        persona_grupo: g.persona_grupo || [],
      }))}
      planes={(planes ?? []) as PlanCobroItem[]}
      modoProrrateo={modoProrrateo}
      multiPlanEnabled={multiPlanEnabled}
      montoInscripcionDefault={montoInscripcionDefault}
      cobrarInscripcionDefault={cobrarInscripcionDefault}
    />
  )
}
