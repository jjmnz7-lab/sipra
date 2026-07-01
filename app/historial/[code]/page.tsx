import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { clasificarAlumno, type EstadoFinancieroAlumno } from '@/lib/constants/alumno-finanzas'
import { ahoraAcademia, ACADEMIA_TZ_FALLBACK } from '@/lib/utils/fecha-academia'
import { HistorialPublicoView, EnlaceNoDisponible, type MovimientoPublico } from './historial-publico-view'

// Datos en vivo: cada visita consulta el estado actual del alumno (si el dueño
// registró un pago, el saldo se ve actualizado al instante). Nunca se cachea.
export const dynamic = 'force-dynamic'

// La página es pública pero personal: nunca debe indexarse en buscadores.
export const metadata: Metadata = {
  title: 'Historial de pagos',
  robots: { index: false, follow: false },
}

// Alfabeto sin caracteres ambiguos: A-Z sin I,O + 2-9 → 32 chars
const CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/

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
  params: Promise<{ code: string }>
}) {
  const { code } = await params

  // Código mal formado → no disponible (sin tocar la base de datos).
  if (!CODE_RE.test(code)) return <EnlaceNoDisponible />

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('obtener_historial_publico_v1', {
    p_code: code,
  })

  const payload = data as unknown as HistorialPublico | null

  if (error || !payload || !payload.disponible) {
    return <EnlaceNoDisponible />
  }

  // Página pública: el RPC no expone el timezone de la academia (no es
  // sensible, pero tampoco vale la pena ampliar su contrato solo para esto).
  // Cae al mismo fallback que el resto de la app cuando no hay timezone real.
  const estado: EstadoFinancieroAlumno = clasificarAlumno(payload.cargos_activos ?? [], ahoraAcademia(ACADEMIA_TZ_FALLBACK))

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
