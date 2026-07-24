import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Database } from '@/lib/types/database.types'
import { SeguimientoClientView } from './seguimiento-client-view'
import { clasificarAlumno } from '@/lib/constants/alumno-finanzas'
import { ahoraAcademia } from '@/lib/utils/fecha-academia'

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

  // 1. Fetch persona with detailed cargos, group, and plan
  const { data: persona } = await supabase
    .from('persona')
    .select(`
      *,
      grupo:grupo_id ( id, nombre, color, emoji, es_temporal ),
      planes_cobro:plan_cobro_id ( id, nombre, activo ),
      cargo (
        id,
        concepto,
        monto_original,
        saldo_pendiente,
        estado_financiero,
        fecha_vencimiento,
        fecha_creacion,
        created_at,
        origen,
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
    .single() as any

  if (!persona) notFound()

  // 1a. Bandera de abonos parciales de la academia y multi_plan
  const { data: academia } = await supabase
    .from('academia')
    .select('allow_partial_payments, allow_overpayment, timezone, config_recargos')
    .eq('id', persona.academia_id)
    .single() as any
  const allowPartial = academia?.allow_partial_payments ?? true
  const allowOverpayment = academia?.allow_overpayment ?? true
  const timezone = academia?.timezone || 'America/Mexico_City'

  // 1b. Fetch grupo del alumno (relación directa 1:N).
  const g = persona.grupo
  const gruposAlumno = g && !g.es_temporal
    ? [{ id: g.id, nombre: g.nombre, color: g.color ?? null, emoji: g.emoji ?? null }]
    : []
  const currentGrupoId: string | null = g?.id ?? null

  // 1d. Catálogo completo de grupos regulares activos (sin actividades)
  const { data: grupos } = await supabase
    .from('grupo')
    .select(`
      id, nombre, cupo_maximo, color, emoji,
      persona ( id, estado_registro )
    `)
    .eq('academia_id', persona.academia_id)
    .eq('estado', 'activo')
    .eq('es_temporal', false)
    .order('nombre') as any

  const mappedGrupos = (grupos ?? []).map((g: any) => ({
    id: g.id,
    nombre: g.nombre,
    plan_sugerido_id: null,
    cupo_maximo: g.cupo_maximo,
    color: g.color,
    emoji: g.emoji,
    persona_grupo: (g.persona ?? []).map((pe: any) => ({ estado: pe.estado_registro }))
  }))

  // 1e. Catálogo completo de planes activos
  const { data: planes } = await supabase
    .from('planes_cobro')
    .select('id, nombre, monto, frecuencia')
    .eq('academia_id', persona.academia_id)
    .eq('activo', true)
    .order('nombre') as any

  // 1e-bis. Catálogo de cobros frecuentes
  const { data: cobrosFrecuentes } = await supabase
    .from('cobros_frecuentes')
    .select('id, concepto, monto')
    .eq('academia_id', persona.academia_id)
    .eq('activo', true)
    .order('concepto', { ascending: true }) as any

  // 1f. Plan actual del alumno
  const p = persona.planes_cobro
  const planesAlumno = p && p.activo ? [{ id: p.id, nombre: p.nombre }] : []
  const currentPlanIds = planesAlumno.map(x => x.id)

  // Cargos activos (para desglose en snapshot)
  const cargosActivos = persona.cargo?.filter((c: any) =>
    ['pendiente', 'parcial', 'vencido'].includes(c.estado_financiero)
  ) || []
  const deudaTotal = cargosActivos.reduce((acc: number, c: any) => acc + Number(c.saldo_pendiente), 0)
  const estadoFinanciero = clasificarAlumno(cargosActivos, ahoraAcademia(timezone), academia?.config_recargos)

  // Saldo a favor: crédito disponible
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
    .order('fecha_evento', { ascending: false })
    .limit(4) as { data: EventoRow[] | null; error: unknown }

  return (
    <SeguimientoClientView
      persona={persona}
      gruposAlumno={gruposAlumno}
      planesAlumno={planesAlumno}
      cargosActivos={cargosActivos}
      estadoFinanciero={estadoFinanciero}
      deudaTotal={deudaTotal}
      saldoAFavor={saldoAFavor}
      timeline={timeline || []}
      allowPartial={allowPartial}
      allowOverpayment={allowOverpayment}
      grupos={mappedGrupos}
      planes={planes || []}
      cobrosFrecuentes={cobrosFrecuentes || []}
      currentGrupoId={currentGrupoId}
      currentPlanIds={currentPlanIds}
    />
  )
}
