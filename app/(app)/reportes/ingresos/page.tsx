import { createClient } from '@/lib/supabase/server'
import { obtenerTimezoneAcademia } from '@/lib/utils/fecha-academia'
import { listarMovimientosIngresosAction } from '../actions'
import { IngresosClientView } from './ingresos-client-view'

export const dynamic = 'force-dynamic'

export default async function IngresosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  const [timezoneRes, { movimientos, hasMore }] = await Promise.all([
    obtenerTimezoneAcademia(supabase, academiaId),
    listarMovimientosIngresosAction(0, 20),
  ])

  return (
    <IngresosClientView
      movimientosIniciales={movimientos}
      hasMoreInicial={hasMore}
      timezone={timezoneRes}
    />
  )
}
