import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { GrupoClientView } from './grupo-client-view'
import { clasificarAlumno, type EstadoFinancieroAlumno } from '@/lib/constants/alumno-finanzas'

export default async function GrupoDetallePage({ params, searchParams }: { params: Promise<{ grupo_id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { grupo_id } = await params
  const { abrir_archiva } = await searchParams
  const supabase = await createClient()

  // Fetch grupo
  const { data: grupo } = await supabase
    .from('grupo')
    .select('*')
    .eq('id', grupo_id)
    .single() as any

  if (!grupo) {
    notFound()
  }

  // Si el id corresponde a una actividad, se redirige a su pantalla.
  if (grupo.es_temporal) {
    redirect(`/actividades/${grupo_id}`)
  }

  // Planes de cobro + modo de prorrateo para el drawer de inscripción
  const { data: planes } = await supabase
    .from('planes_cobro')
    .select('id, nombre, monto, frecuencia, requiere_inscripcion')
    .eq('academia_id', grupo.academia_id)
    .eq('activo', true)
    .order('nombre', { ascending: true }) as any

  const { data: academia } = await supabase
    .from('academia')
    .select('config_cobro, multi_plan_enabled, monto_inscripcion_default, cobrar_inscripcion_default, timezone')
    .eq('id', grupo.academia_id)
    .single() as any
  const modoProrrateo = (academia?.config_cobro?.modo_prorrateo as 'proporcional' | 'completo') || 'proporcional'
  const multiPlanEnabled = !!academia?.multi_plan_enabled
  const montoInscripcionDefault = Number(academia?.monto_inscripcion_default ?? 0)
  const cobrarInscripcionDefault = !!academia?.cobrar_inscripcion_default
  const timezone = academia?.timezone || 'America/Mexico_City'

  // Otros grupos regulares activos (destino opcional al archivar este grupo;
  // las actividades no son destino válido)
  const { data: gruposDestino } = await supabase
    .from('grupo')
    .select('id, nombre')
    .eq('academia_id', grupo.academia_id)
    .eq('estado', 'activo')
    .eq('es_temporal', false)
    .neq('id', grupo_id)
    .order('nombre', { ascending: true }) as any

  // Fetch alumnos inscritos
  const { data: inscripciones } = await supabase
    .from('persona_grupo')
    .select(`
      id, estado, fecha_inscripcion,
      persona (id, nombre, apellido, telefono_whatsapp, estado_registro)
    `)
    .eq('grupo_id', grupo_id)
    .eq('estado', 'activo') as any

  // Orden A–Z por nombre completo (case-insensitive)
  const inscripcionesOrdenadas = [...(inscripciones ?? [])].sort((a: any, b: any) => {
    const an = `${a.persona?.nombre ?? ''} ${a.persona?.apellido ?? ''}`.trim().toLowerCase()
    const bn = `${b.persona?.nombre ?? ''} ${b.persona?.apellido ?? ''}`.trim().toLowerCase()
    return an.localeCompare(bn, 'es')
  })

  const personaIds = inscripcionesOrdenadas
    .map((i: any) => i.persona?.id)
    .filter(Boolean) as string[]

  // Fetch cargos activos (con fecha_vencimiento para clasificación crítico)
  const { data: cargos } = await supabase
    .from('cargo')
    .select('persona_id, concepto, saldo_pendiente, estado_financiero, fecha_vencimiento')
    .in('persona_id', personaIds.length ? personaIds : ['00000000-0000-0000-0000-000000000000'])
    .in('estado_financiero', ['vencido', 'pendiente', 'parcial']) as any

  // Clasificación del semáforo financiero (4 estados estándar) usando la misma
  // función que la pantalla Alumnos, para mantener una única regla en todo el sistema.
  const now = new Date()
  const cargosPorPersona: Record<string, any[]> = {}
  for (const c of (cargos ?? [])) {
    if (!c.persona_id) continue
    ;(cargosPorPersona[c.persona_id] ||= []).push(c)
  }

  const mapEstadoMiembro: Record<string, EstadoFinancieroAlumno> = {}
  let alDia = 0
  let pendientes = 0
  let atrasados = 0
  let urgentes = 0

  for (const ins of inscripcionesOrdenadas) {
    const p = ins.persona
    if (!p?.id) continue
    const cargosP = cargosPorPersona[p.id] ?? []
    const estado = clasificarAlumno(cargosP, now)
    mapEstadoMiembro[p.id] = estado
    if (p.estado_registro === 'activo') {
      if (estado === 'al_dia') alDia++
      else if (estado === 'pendiente') pendientes++
      else if (estado === 'atrasado') atrasados++
      else if (estado === 'urgente') urgentes++
    }
  }

  const totalAlumnos = inscripcionesOrdenadas.filter((ins: any) => ins.persona?.estado_registro === 'activo').length
  const pendienteGrupo = (cargos ?? []).reduce((acc: number, c: any) => acc + Number(c.saldo_pendiente), 0)

  // Planes asignados a cada alumno del grupo (badge multi-plan en la tarjeta).
  const planById = new Map<string, { id: string; nombre: string; monto: number; frecuencia: string }>()
  for (const p of (planes ?? []) as any[]) {
    planById.set(p.id, { id: p.id, nombre: p.nombre, monto: Number(p.monto ?? 0), frecuencia: p.frecuencia })
  }
  const { data: alumnoPlanesRows } = await supabase
    .from('alumno_planes')
    .select('alumno_id, plan_cobro_id')
    .eq('academia_id', grupo.academia_id)
    .in('alumno_id', personaIds.length ? personaIds : ['00000000-0000-0000-0000-000000000000']) as any
  const planesPorAlumno: Record<string, { id: string; nombre: string; monto: number; frecuencia: string }[]> = {}
  for (const r of (alumnoPlanesRows ?? []) as any[]) {
    const plan = planById.get(r.plan_cobro_id)
    if (!plan) continue
    ;(planesPorAlumno[r.alumno_id] ||= []).push(plan)
  }

  // Alumnos disponibles para inscribir: activos, no inscritos a este grupo.
  const inscritosIds = new Set<string>(personaIds)
  const { data: activosTodos } = await supabase
    .from('persona')
    .select('id, nombre, apellido, telefono_whatsapp')
    .eq('academia_id', grupo.academia_id)
    .eq('etiqueta', 'alumno')
    .eq('estado_registro', 'activo')
    .order('nombre', { ascending: true }) as any
  const alumnosDisponibles = ((activosTodos ?? []) as any[])
    .filter((a) => !inscritosIds.has(a.id))
    .map((a) => ({ id: a.id, nombre: a.nombre, apellido: a.apellido ?? null, telefono_whatsapp: a.telefono_whatsapp ?? null }))

  return (
    <GrupoClientView
      grupo={grupo}
      inscripciones={inscripcionesOrdenadas}
      planes={planes || []}
      modoProrrateo={modoProrrateo}
      multiPlanEnabled={multiPlanEnabled}
      montoInscripcionDefault={montoInscripcionDefault}
      cobrarInscripcionDefault={cobrarInscripcionDefault}
      gruposDestino={gruposDestino || []}
      cargos={cargos || []}
      totalAlumnos={totalAlumnos}
      alDia={alDia}
      pendientes={pendientes}
      atrasados={atrasados}
      urgentes={urgentes}
      pendienteGrupo={pendienteGrupo}
      mapEstadoMiembro={mapEstadoMiembro}
      planesPorAlumno={planesPorAlumno}
      alumnosDisponibles={alumnosDisponibles}
      timezone={timezone}
      abrirArchivar={abrir_archiva === 'true'}
    />
  )
}
