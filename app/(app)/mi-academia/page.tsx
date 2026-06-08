import { createClient } from '@/lib/supabase/server'
import { MiAcademiaClientView } from './mi-academia-client-view'

export const dynamic = 'force-dynamic'

export default async function MiAcademiaPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  const { data: academia } = await supabase
    .from('academia')
    .select('nombre, metadata')
    .eq('id', academiaId)
    .single() as any

  // Conteo de alumnos por estado de registro.
  const { data: alumnos } = await supabase
    .from('persona')
    .select('estado_registro')
    .eq('academia_id', academiaId)
    .eq('etiqueta', 'alumno') as { data: { estado_registro: string }[] | null }

  const activos = (alumnos ?? []).filter((a) => a.estado_registro === 'activo').length
  const suspendidos = (alumnos ?? []).filter((a) => a.estado_registro !== 'activo').length

  return (
    <MiAcademiaClientView
      nombre={academia?.nombre || ''}
      academiaId={academiaId}
      logoUrl={academia?.metadata?.logo_url || null}
      activos={activos}
      suspendidos={suspendidos}
    />
  )
}
