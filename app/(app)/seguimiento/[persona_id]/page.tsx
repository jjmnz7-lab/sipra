import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Database } from '@/lib/types/database.types'
import { SeguimientoClientView } from './seguimiento-client-view'

type MovimientoMinimo = {
  id: string
  fecha_pago: string
  metodo_pago: string
}

type AplicacionMovimientoMinimo = {
  id: string
  monto_aplicado: number
  estado: string
  movimiento: MovimientoMinimo | null
}

type CargoConDetalle = Pick<Database['public']['Tables']['cargo']['Row'],
  'id' | 'saldo_pendiente' | 'estado_financiero' | 'concepto' | 'monto_original' | 'fecha_vencimiento'> & {
  aplicacion_movimiento?: AplicacionMovimientoMinimo[] | null
}

type PersonaConCargo = Database['public']['Tables']['persona']['Row'] & {
  cargo: CargoConDetalle[] | null
}
type EventoRow = Database['public']['Tables']['evento_timeline']['Row']

export default async function SeguimientoPersonaPage({ params }: { params: Promise<{ persona_id: string }> }) {
  const { persona_id } = await params
  const supabase = await createClient()

  // 1. Fetch persona with detailed cargos and applied payments
  const { data: persona } = await supabase
    .from('persona')
    .select(`
      *,
      cargo (
        id,
        concepto,
        monto_original,
        saldo_pendiente,
        estado_financiero,
        fecha_vencimiento,
        aplicacion_movimiento (
          id,
          monto_aplicado,
          estado,
          movimiento (
            id,
            fecha_pago,
            metodo_pago
          )
        )
      )
    `)
    .eq('id', persona_id)
    .single() as { data: PersonaConCargo | null; error: unknown }

  if (!persona) notFound()

  // 1a. Bandera de abonos parciales de la academia y multi_plan
  const { data: academia } = await supabase
    .from('academia')
    .select('allow_partial_payments, multi_plan_enabled')
    .eq('id', persona.academia_id)
    .single() as any
  const allowPartial = academia?.allow_partial_payments ?? true
  const multiPlanEnabled = !!academia?.multi_plan_enabled

  // 1b. Fetch grupo al que pertenece el alumno
  const { data: grupoData } = await supabase
    .from('persona_grupo')
    .select('grupo_id, grupo (id, nombre)')
    .eq('persona_id', persona_id)
    .eq('estado', 'activo')
    .maybeSingle() as any

  const grupoNombre: string | null = grupoData?.grupo?.nombre ?? null
  const currentGrupoId: string | null = grupoData?.grupo_id ?? null

  // 1c. Planes por visita (catálogo de "clases" para el modal de Visita Express)
  const { data: planesPorVisita } = await supabase
    .from('planes_cobro')
    .select('id, nombre, monto')
    .eq('academia_id', persona.academia_id)
    .eq('activo', true)
    .eq('frecuencia', 'por_visita')
    .order('nombre') as any

  // 1d. Catálogo completo de grupos activos
  const { data: grupos } = await supabase
    .from('grupo')
    .select(`
      id, nombre, plan_sugerido_id, cupo_maximo,
      persona_grupo (estado)
    `)
    .eq('academia_id', persona.academia_id)
    .eq('estado', 'activo')
    .order('nombre') as any

  // 1e. Catálogo completo de planes activos
  const { data: planes } = await supabase
    .from('planes_cobro')
    .select('id, nombre, monto, frecuencia')
    .eq('academia_id', persona.academia_id)
    .eq('activo', true)
    .order('nombre') as any

  // 1f. Planes actuales del alumno
  const { data: currentPlanesRel } = await supabase
    .from('alumno_planes')
    .select('plan_cobro_id')
    .eq('alumno_id', persona_id) as any
  const currentPlanIds = (currentPlanesRel ?? []).map((cp: any) => cp.plan_cobro_id) as string[]

  // Cargos activos (para desglose en snapshot)
  const cargosActivos = persona.cargo?.filter((c: any) =>
    ['pendiente', 'parcial', 'vencido'].includes(c.estado_financiero)
  ) || []
  const deudaTotal = cargosActivos.reduce((acc: number, c: any) => acc + Number(c.saldo_pendiente), 0)

  // Preparar el primer cargo para el RegistrarPagoDrawer (inyectando la persona y el ID)
  const primerCargo = cargosActivos[0] ? {
    ...cargosActivos[0],
    persona_id: persona.id,
    persona: { nombre: persona.nombre, apellido: persona.apellido }
  } : null as any

  // Saldo a favor: crédito disponible de pagos/anticipos no aplicados (monto_disponible).
  const { data: movsCredito } = await supabase
    .from('movimiento')
    .select('monto_disponible')
    .eq('persona_id', persona_id) as { data: { monto_disponible: number | null }[] | null; error: unknown }
  const saldoAFavor = (movsCredito ?? []).reduce((acc, m) => acc + Number(m.monto_disponible ?? 0), 0)

  // 2. Fetch timeline
  const { data: timeline } = await supabase
    .from('evento_timeline')
    .select('*')
    .eq('persona_id', persona_id)
    .order('fecha_evento', { ascending: false }) as { data: EventoRow[] | null; error: unknown }

  return (
    <SeguimientoClientView
      persona={persona}
      grupoNombre={grupoNombre}
      cargosActivos={cargosActivos}
      deudaTotal={deudaTotal}
      saldoAFavor={saldoAFavor}
      primerCargo={primerCargo}
      timeline={timeline || []}
      allowPartial={allowPartial}
      planesPorVisita={planesPorVisita || []}
      grupos={grupos || []}
      planes={planes || []}
      multiPlanEnabled={multiPlanEnabled}
      currentGrupoId={currentGrupoId}
      currentPlanIds={currentPlanIds}
    />
  )
}
