import { createClient } from '@/lib/supabase/server'
import { AlumnosClientView } from './alumnos-client-view'
import { clasificarAlumno, type EstadoFinancieroAlumno } from '@/lib/constants/alumno-finanzas'
import { ahoraAcademia } from '@/lib/utils/fecha-academia'

export const dynamic = 'force-dynamic'

export type AlumnoListItem = {
  id: string
  nombre: string
  apellido: string | null
  telefono_whatsapp: string | null
  estado_registro: string
  created_at: string
  grupo: { id: string; nombre: string; color: string | null; emoji: string | null } | null
  grupos: { id: string; nombre: string; color: string | null; emoji: string | null }[]
  planes: { id: string; nombre: string }[]
  sinGrupo: boolean
  sinPlan: boolean
  /** Huérfano según la regla estricta: sin plan, o con plan recurrente y sin grupo. */
  esHuerfano: boolean
  estadoFinanciero: EstadoFinancieroAlumno
  saldoTotal: number
  /** Descuento especial (Hermanos/Beca) para el badge; mutuamente excluyentes. */
  descuentoHermanosActivo: boolean
  becaActiva: boolean
  becaPorcentaje: number
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
    .select('config_recargos, config_cobro, monto_inscripcion_default, cobrar_inscripcion_default, timezone')
    .eq('id', academiaId)
    .single() as any
  const modoProrrateo = (academia?.config_cobro?.modo_prorrateo as 'proporcional' | 'completo') || 'proporcional'
  const montoInscripcionDefault = Number(academia?.monto_inscripcion_default ?? 0)
  const cobrarInscripcionDefault = !!academia?.cobrar_inscripcion_default
  const now = ahoraAcademia(academia?.timezone || 'America/Mexico_City')

  // Solo grupos regulares: a las actividades se inscribe desde su propia pantalla.
  const { data: grupos } = await supabase
    .from('grupo')
    .select(`
      id, nombre, color, emoji, cupo_maximo,
      persona ( id, estado_registro )
    `)
    .eq('estado', 'activo')
    .eq('es_temporal', false)
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
      descuento_hermanos_activo, beca_activa, beca_porcentaje,
      grupo:grupo_id ( id, nombre, color, emoji, es_temporal ),
      planes_cobro:plan_cobro_id ( id, nombre, activo, frecuencia ),
      cargo (
        concepto, estado_financiero, fecha_vencimiento, fecha_creacion, created_at, origen, saldo_pendiente
      )
    `)
    .eq('etiqueta', 'alumno')
    .order('nombre', { ascending: true }) as any

  const alumnos: AlumnoListItem[] = (personas ?? []).map((p: any) => {
    const grupo = p.grupo ? {
      id: p.grupo.id,
      nombre: p.grupo.nombre,
      color: p.grupo.color ?? null,
      emoji: p.grupo.emoji ?? null
    } : null
    const tieneActividad = p.grupo?.es_temporal ?? false

    const cargosPendientes = (p.cargo ?? []).filter((c: any) =>
      ['pendiente', 'parcial', 'vencido'].includes(c.estado_financiero),
    )
    const saldoTotal = cargosPendientes.reduce(
      (acc: number, c: any) => acc + Number(c.saldo_pendiente ?? 0),
      0,
    )
    const estadoFinanciero = clasificarAlumno(cargosPendientes, now, academia?.config_recargos)

    const plan = p.planes_cobro && p.planes_cobro.activo ? { id: p.planes_cobro.id, nombre: p.planes_cobro.nombre } : null
    const planesList = plan ? [plan] : []
    const tieneRecurrente = p.planes_cobro?.activo && (p.planes_cobro.frecuencia === 'mensual' || p.planes_cobro.frecuencia === 'semanal')

    const sinGrupo = !grupo
    const sinPlan = !plan && !(tieneActividad && sinGrupo)

    return {
      id: p.id,
      nombre: p.nombre,
      apellido: p.apellido,
      telefono_whatsapp: p.telefono_whatsapp,
      estado_registro: p.estado_registro,
      created_at: p.created_at,
      grupo,
      grupos: grupo ? [grupo] : [],
      planes: planesList,
      sinGrupo,
      sinPlan,
      // Regla estricta: un alumno solo 'por_visita' sin grupo NO es huérfano.
      esHuerfano: sinPlan || (sinGrupo && tieneRecurrente),
      estadoFinanciero,
      saldoTotal,
      descuentoHermanosActivo: !!p.descuento_hermanos_activo,
      becaActiva: !!p.beca_activa,
      becaPorcentaje: p.beca_porcentaje ?? 0,
    }
  })

  return (
    <AlumnosClientView
      alumnos={alumnos}
      grupos={(grupos ?? []).map((g: any) => ({
        id: g.id,
        nombre: g.nombre,
        color: g.color ?? null,
        emoji: g.emoji ?? null,
        plan_sugerido_id: null,
        cupo_maximo: g.cupo_maximo ?? null,
        persona_grupo: (g.persona ?? []).map((pe: any) => ({ estado: pe.estado_registro })),
      }))}
      planes={(planes ?? []) as PlanCobroItem[]}
      modoProrrateo={modoProrrateo}
      montoInscripcionDefault={montoInscripcionDefault}
      cobrarInscripcionDefault={cobrarInscripcionDefault}
    />
  )
}
