import { listarMovimientosIngresosAction } from '../actions'
import { IngresosClientView } from './ingresos-client-view'

export const dynamic = 'force-dynamic'

export default async function IngresosPage() {
  const { movimientos, hasMore } = await listarMovimientosIngresosAction(0, 20)

  return (
    <IngresosClientView
      movimientosIniciales={movimientos}
      hasMoreInicial={hasMore}
    />
  )
}
