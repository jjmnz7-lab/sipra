import { createClient } from '@/lib/supabase/server'
import { MiAcademiaForm } from '@/components/domain/configuracion/mi-academia-form'
import { CobranzaFormSection } from '@/components/domain/configuracion/cobranza-form-section'
import { PlanesCobroSection, type PlanCobro } from '@/components/domain/configuracion/planes-cobro-section'
import { PagosAtrasadosForm } from '@/components/domain/configuracion/pagos-atrasados-form'
import { logoutAction } from '@/app/(app)/configuracion/actions'
import { PageSubheader } from '@/components/layout/page-subheader'
import { Button } from '@/components/ui/button'
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
    .select('config_recargos, config_cobro, nombre, metadata, multi_plan_enabled')
    .eq('id', academiaId)
    .single() as any

  const { data: planes } = await supabase
    .from('planes_cobro')
    .select('id, nombre, monto, frecuencia')
    .eq('academia_id', academiaId)
    .eq('activo', true)
    .order('nombre', { ascending: true }) as any

  // Conteo de alumnos ACTIVOS por plan (para el modal de archivado inteligente)
  const { data: alumnosActivos } = await supabase
    .from('persona')
    .select('id')
    .eq('academia_id', academiaId)
    .eq('etiqueta', 'alumno')
    .eq('estado_registro', 'activo') as any
  const activosSet = new Set<string>((alumnosActivos ?? []).map((p: any) => p.id))

  const { data: vinculos } = await supabase
    .from('alumno_planes')
    .select('plan_cobro_id, alumno_id')
    .eq('academia_id', academiaId) as any
  const conteoPorPlan: Record<string, number> = {}
  for (const v of (vinculos ?? [])) {
    if (activosSet.has(v.alumno_id)) {
      conteoPorPlan[v.plan_cobro_id] = (conteoPorPlan[v.plan_cobro_id] ?? 0) + 1
    }
  }
  const planesConConteo = (planes ?? []).map((p: any) => ({ ...p, alumnosCount: conteoPorPlan[p.id] ?? 0 }))

  const configRecargos = academia?.config_recargos || {}
  const configCobro = academia?.config_cobro || {}
  const logoUrl = academia?.metadata?.logo_url || null

  return (
    <div className="flex flex-col h-full min-h-screen bg-background pb-20">
      <PageSubheader title="Configuración" />

      <div className="p-4 space-y-6">
        {showPlanesOnboarding && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-[#15435a]/30 bg-[#15435a]/10">
            <Sparkles className="h-5 w-5 text-[#15435a] mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-foreground">¡Tu academia está lista!</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Elegiste el modelo avanzado. Crea tu primer plan de cobro en la sección
                <span className="font-semibold"> Planes de cobro </span>
                de abajo para empezar a inscribir alumnos.
              </p>
            </div>
          </div>
        )}

        <MiAcademiaForm
          initialNombre={academia?.nombre || ''}
          academiaId={academiaId}
          logoUrl={logoUrl}
        />

        <CobranzaFormSection initialConfig={configCobro} />

        <PlanesCobroSection
          planes={planesConConteo as PlanCobro[]}
          multiPlanEnabled={!!academia?.multi_plan_enabled}
        />

        <PagosAtrasadosForm initialConfig={configRecargos} />

        {/* Cerrar Sesión — standalone */}
        <div className="flex justify-between items-center p-4 bg-muted/30 border border-border rounded-lg">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Cerrar Sesión</h4>
            <p className="text-xs text-muted-foreground">Salir de tu cuenta de forma segura.</p>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="destructive" size="sm">
              Cerrar Sesión
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
