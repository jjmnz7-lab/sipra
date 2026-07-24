import { createClient } from '@/lib/supabase/server'
import { PlanesCobroSection, type PlanCobro } from '@/components/domain/configuracion/planes-cobro-section'
import { CobrosFrecuentesSection, type CobroFrecuente } from '@/components/domain/configuracion/cobros-frecuentes-section'
import { EstadosPagoSection } from '@/components/domain/configuracion/estados-pago-section'
import { RecargosSection } from '@/components/domain/configuracion/recargos-excepciones-section'
import { PoliticasCobroSection } from '@/components/domain/configuracion/politicas-cobro-section'
import { ConfiguracionSubheader } from './configuracion-subheader'
import { Sparkles } from 'lucide-react'

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string }>
}) {
  const { onboarding } = await searchParams
  const showPlanesOnboarding = onboarding === 'planes'

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  const { data: academia } = await supabase
    .from('academia')
    .select('config_recargos, config_cobro, allow_partial_payments, allow_overpayment')
    .eq('id', academiaId)
    .single() as any

  const { data: planes } = await supabase
    .from('planes_cobro')
    .select('id, nombre, monto, frecuencia')
    .eq('academia_id', academiaId)
    .eq('activo', true)
    .order('nombre', { ascending: true }) as any

  // Conteo de alumnos por plan: activos (para archivado) y totales (para eliminar).
  const { data: alumnosPlanes } = await supabase
    .from('persona')
    .select('id, plan_cobro_id, estado_registro')
    .eq('academia_id', academiaId)
    .eq('etiqueta', 'alumno')
    .not('plan_cobro_id', 'is', null) as any

  const conteoActivo: Record<string, number> = {}
  const conteoTotal: Record<string, number> = {}
  for (const p of (alumnosPlanes ?? [])) {
    const planId = p.plan_cobro_id
    if (!planId) continue
    conteoTotal[planId] = (conteoTotal[planId] ?? 0) + 1
    if (p.estado_registro === 'activo') {
      conteoActivo[planId] = (conteoActivo[planId] ?? 0) + 1
    }
  }

  const planesConConteo = (planes ?? []).map((p: any) => ({
    ...p,
    alumnosCount: conteoActivo[p.id] ?? 0,
    vinculosCount: conteoTotal[p.id] ?? 0,
  }))

  // Catálogo de cobros frecuentes (activos) + si tienen registros relacionados.
  const { data: cobros } = await supabase
    .from('cobros_frecuentes')
    .select('id, concepto, monto')
    .eq('academia_id', academiaId)
    .eq('activo', true)
    .order('concepto', { ascending: true }) as any

  const { data: usosCobros } = await supabase
    .from('cargo')
    .select('cf:metadata->>cobro_frecuente_id')
    .eq('academia_id', academiaId)
    .not('metadata->>cobro_frecuente_id', 'is', null) as any
  const usadosSet = new Set<string>((usosCobros ?? []).map((u: any) => u.cf).filter(Boolean))
  const cobrosFrecuentes: CobroFrecuente[] = (cobros ?? []).map((c: any) => ({
    id: c.id,
    concepto: c.concepto,
    monto: Number(c.monto),
    eliminable: !usadosSet.has(c.id),
  }))

  const configRecargos = academia?.config_recargos || {}
  const configCobro = academia?.config_cobro || {}
  const mesesSinCobro: number[] = Array.isArray(configCobro?.meses_sin_cobro)
    ? configCobro.meses_sin_cobro.filter((m: any) => Number.isInteger(m) && m >= 1 && m <= 12)
    : []
  const allowPartial = academia?.allow_partial_payments ?? true
  const allowOverpayment = academia?.allow_overpayment ?? true

  return (
    <div className="flex flex-col h-full min-h-screen bg-background pb-20">
      <ConfiguracionSubheader />

      <div className="p-4 space-y-6">
        {showPlanesOnboarding && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-[#15435a]/30 bg-[#15435a]/10">
            <Sparkles className="h-5 w-5 text-[#15435a] mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-foreground">¡Tu academia está lista!</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Crea tu primer plan con el botón
                <span className="font-semibold"> Agregar plan </span>
                en la sección Planes de Cobro Mensual para empezar a inscribir alumnos.
              </p>
            </div>
          </div>
        )}

        {/* 1. Planes de Cobro Mensual (incluye Meses de cobro + Prorrateo) */}
        <PlanesCobroSection
          planes={planesConConteo as PlanCobro[]}
          initialMesesSinCobro={mesesSinCobro}
          initialCobro={configCobro}
        />

        {/* 2. Catálogo de Cobros Frecuentes */}
        <CobrosFrecuentesSection cobros={cobrosFrecuentes} />

        {/* 3. Estados de pago (nueva) */}
        <EstadosPagoSection initialConfig={configRecargos} />

        {/* 4. Recargos (recargos por pago tardío de mensualidad) */}
        <RecargosSection initialConfig={configRecargos} />

        {/* 5. Políticas de Cobro (sin cambios) */}
        <PoliticasCobroSection
          initialAllowPartial={allowPartial}
          initialAllowOverpayment={allowOverpayment}
        />
      </div>
    </div>
  )
}
