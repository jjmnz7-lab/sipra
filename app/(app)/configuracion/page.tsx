import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { MotorRecargosForm } from '@/components/domain/configuracion/motor-recargos-form'
import { AjustesGeneralesForm } from '@/components/domain/configuracion/ajustes-generales-form'
import { Settings, Zap } from 'lucide-react'

export default async function ConfiguracionPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  const { data: academia } = await supabase
    .from('academia')
    .select('config_recargos, config_cobro, nombre')
    .eq('id', academiaId)
    .single() as any

  const configRecargos = academia?.config_recargos || { activo: false, escalones: [] }
  const configCobro = academia?.config_cobro || {}

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center">
            <Settings className="mr-2 h-5 w-5" /> Configuración
          </h1>
          <p className="text-sm text-slate-500">{academia?.nombre}</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Ajustes Generales (Spec) */}
        <AjustesGeneralesForm initialConfig={configCobro} academiaNombre={academia?.nombre || ''} />

        {/* Motor de Recargos (Existente) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center text-indigo-700">
              <Zap className="mr-2 h-5 w-5" /> Motor de Recargos
            </CardTitle>
            <CardDescription>
              Configura penalizaciones automáticas para alumnos con pagos atrasados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MotorRecargosForm initialConfig={configRecargos} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
