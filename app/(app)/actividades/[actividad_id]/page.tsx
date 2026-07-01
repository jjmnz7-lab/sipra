import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ActividadClientView } from './actividad-client-view'
import { clasificarAlumno, type EstadoFinancieroAlumno } from '@/lib/constants/alumno-finanzas'
import { ahoraAcademia } from '@/lib/utils/fecha-academia'

export default async function ActividadDetallePage({ params, searchParams }: { params: Promise<{ actividad_id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { actividad_id } = await params
  const { abrir_archiva } = await searchParams
  const supabase = await createClient()

  // Fetch actividad
  const { data: actividad } = await supabase
    .from('grupo')
    .select('*')
    .eq('id', actividad_id)
    .single() as any

  if (!actividad) {
    notFound()
  }

  // Si el id corresponde a un grupo regular, se redirige a su pantalla.
  if (!actividad.es_temporal) {
    redirect(`/grupos/${actividad_id}`)
  }

  const { data: academia } = await supabase
    .from('academia')
    .select('timezone')
    .eq('id', actividad.academia_id)
    .single() as any
  const timezone = academia?.timezone || 'America/Mexico_City'

  // Catálogo de cobros frecuentes (para el combobox de concepto del cargo grupal).
  const { data: cobrosFrecuentes } = await supabase
    .from('cobros_frecuentes')
    .select('id, concepto, monto')
    .eq('academia_id', actividad.academia_id)
    .eq('activo', true)
    .order('concepto', { ascending: true }) as any

  // Fetch alumnos inscritos
  const { data: inscripciones } = await supabase
    .from('persona_grupo')
    .select(`
      id, estado, fecha_inscripcion,
      persona (id, nombre, apellido, telefono_whatsapp, estado_registro, beca_activa, beca_porcentaje)
    `)
    .eq('grupo_id', actividad_id)
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

  // Fetch cargos activos (con fecha_vencimiento para clasificación del semáforo)
  const { data: cargos } = await supabase
    .from('cargo')
    .select('persona_id, concepto, saldo_pendiente, estado_financiero, fecha_vencimiento')
    .in('persona_id', personaIds.length ? personaIds : ['00000000-0000-0000-0000-000000000000'])
    .in('estado_financiero', ['vencido', 'pendiente', 'parcial']) as any

  // Clasificación del semáforo financiero (misma regla que Alumnos/Grupos).
  const now = ahoraAcademia()
  const cargosPorPersona: Record<string, any[]> = {}
  for (const c of (cargos ?? [])) {
    if (!c.persona_id) continue
    ;(cargosPorPersona[c.persona_id] ||= []).push(c)
  }

  const mapEstadoMiembro: Record<string, EstadoFinancieroAlumno> = {}
  for (const ins of inscripcionesOrdenadas) {
    const p = ins.persona
    if (!p?.id) continue
    mapEstadoMiembro[p.id] = clasificarAlumno(cargosPorPersona[p.id] ?? [], now)
  }

  const totalAlumnos = inscripcionesOrdenadas.filter((ins: any) => ins.persona?.estado_registro === 'activo').length

  // Alumnos disponibles para inscribir: activos, no inscritos a esta actividad.
  const inscritosIds = new Set<string>(personaIds)
  const { data: activosTodos } = await supabase
    .from('persona')
    .select('id, nombre, apellido, telefono_whatsapp')
    .eq('academia_id', actividad.academia_id)
    .eq('etiqueta', 'alumno')
    .eq('estado_registro', 'activo')
    .order('nombre', { ascending: true }) as any
  const alumnosDisponibles = ((activosTodos ?? []) as any[])
    .filter((a) => !inscritosIds.has(a.id))
    .map((a) => ({ id: a.id, nombre: a.nombre, apellido: a.apellido ?? null, telefono_whatsapp: a.telefono_whatsapp ?? null }))

  return (
    <ActividadClientView
      actividad={actividad}
      inscripciones={inscripcionesOrdenadas}
      totalAlumnos={totalAlumnos}
      mapEstadoMiembro={mapEstadoMiembro}
      alumnosDisponibles={alumnosDisponibles}
      cobrosFrecuentes={cobrosFrecuentes || []}
      abrirArchivar={abrir_archiva === 'true'}
      timezone={timezone}
    />
  )
}
