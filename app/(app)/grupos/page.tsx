import { createClient } from '@/lib/supabase/server'
import { GruposClientView } from './grupos-client-view'

export const dynamic = 'force-dynamic'

export default async function GruposPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  // Config de cobranza para el preview de prorrateo del drawer de inscripción
  const { data: academia } = await supabase
    .from('academia')
    .select('config_cobro, monto_inscripcion_default, cobrar_inscripcion_default')
    .eq('id', academiaId)
    .single() as any
  const modoProrrateo = (academia?.config_cobro?.modo_prorrateo as 'proporcional' | 'completo') || 'proporcional'
  const montoInscripcionDefault = Number(academia?.monto_inscripcion_default ?? 0)
  const cobrarInscripcionDefault = !!academia?.cobrar_inscripcion_default

  const timezone = academia?.timezone || 'America/Mexico_City'

  // Fetch grupos regulares (las actividades viven en su propia pantalla)
  // con el estado de sus miembros (tanto activos como archivados)
  const { data: gruposRaw } = await supabase
    .from('grupo')
    .select(`
      id, nombre, descripcion, estado, color, emoji, dias_semana, hora_inicio, hora_fin, cupo_maximo,
      persona (
        estado_global,
        estado_registro,
        cargo (
          concepto,
          estado_financiero,
          fecha_vencimiento,
          saldo_pendiente
        )
      )
    `)
    .eq('es_temporal', false)
    .order('nombre', { ascending: true }) as any

  const grupos = (gruposRaw ?? []).map((g: any) => ({
    ...g,
    persona_grupo: (g.persona ?? []).map((pe: any) => ({
      estado: pe.estado_registro,
      persona: pe,
    }))
  }))

  // Planes de cobro de la academia (catálogo para el selector de inscripción)
  const { data: planes } = await supabase
    .from('planes_cobro')
    .select('id, nombre, monto, frecuencia, requiere_inscripcion')
    .eq('academia_id', academiaId)
    .eq('activo', true)
    .order('nombre', { ascending: true }) as any

  return (
    <GruposClientView
      grupos={grupos || []}
      planes={planes || []}
      modoProrrateo={modoProrrateo}
      montoInscripcionDefault={montoInscripcionDefault}
      cobrarInscripcionDefault={cobrarInscripcionDefault}
      timezone={timezone}
    />
  )
}

