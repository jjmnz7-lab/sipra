import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { clasificarAlumno, type EstadoFinancieroAlumno } from '@/lib/constants/alumno-finanzas'
import { HistorialPublicoView, EnlaceNoDisponible, type MovimientoPublico } from './historial-publico-view'

// Datos en vivo: cada visita consulta el estado actual del alumno (si el dueño
// registró un pago, el saldo se ve actualizado al instante). Nunca se cachea.
export const dynamic = 'force-dynamic'

// La página es pública pero personal: nunca debe indexarse en buscadores.
export const metadata: Metadata = {
  title: 'Historial de pagos',
  robots: { index: false, follow: false },
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type CargoLite = {
  concepto: string | null
  estado_financiero: string | null
  fecha_vencimiento: string | null
}

type HistorialPublico = {
  disponible: boolean
  academia?: { nombre: string | null; logo_url: string | null }
  alumno?: { nombre: string; apellido: string | null }
  deuda?: number
  saldo_a_favor?: number
  cargos_activos?: CargoLite[]
  movimientos?: MovimientoPublico[]
}

export default async function HistorialPublicoPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // Token mal formado → no disponible (sin tocar la base de datos).
  if (!UUID_RE.test(token)) return <EnlaceNoDisponible />

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('obtener_historial_publico_v1', {
    p_token: token,
  })

  const payload = data as unknown as HistorialPublico | null

  if (error || !payload || !payload.disponible) {
    return <EnlaceNoDisponible />
  }

  const estado: EstadoFinancieroAlumno = clasificarAlumno(payload.cargos_activos ?? [])

  return (
    <HistorialPublicoView
      academia={{
        nombre: payload.academia?.nombre ?? 'Academia',
        logoUrl: payload.academia?.logo_url ?? null,
      }}
      alumnoNombre={`${payload.alumno?.nombre ?? ''} ${payload.alumno?.apellido ?? ''}`.trim()}
      estado={estado}
      deuda={Number(payload.deuda ?? 0)}
      saldoAFavor={Number(payload.saldo_a_favor ?? 0)}
      movimientos={payload.movimientos ?? []}
    />
  )
}
