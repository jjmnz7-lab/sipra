import { createClient } from '@/lib/supabase/server'
import { ActividadesClientView } from './actividades-client-view'

export const dynamic = 'force-dynamic'

export default async function ActividadesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  const { data: academia } = await supabase
    .from('academia')
    .select('timezone')
    .eq('id', academiaId)
    .single() as any
  const timezone = academia?.timezone || 'America/Mexico_City'

  // Fetch actividades con el estado de sus miembros (activas y archivadas)
  const { data: actividades } = await supabase
    .from('grupo')
    .select(`
      id, nombre, descripcion, estado, emoji, fecha_inicio, fecha_fin, costo_actividad, dias_semana, hora_inicio, hora_fin, cupo_maximo,
      persona_grupo (
        estado,
        persona (
          estado_registro
        )
      )
    `)
    .eq('es_temporal', true)
    .order('nombre', { ascending: true }) as any

  return (
    <ActividadesClientView
      actividades={actividades || []}
      timezone={timezone}
    />
  )
}
