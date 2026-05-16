import { createClient } from '@/lib/supabase/server'
import { EnvioCard } from '@/components/domain/envio/envio-card'
import { MotorRecordatoriosBoton } from '@/components/domain/envio/motor-recordatorios-boton'
import { MessageSquare, CheckCircle2 } from 'lucide-react'
import type { EnvioSugerido } from '@/lib/types/domain'

export default async function RecordatoriosPage() {
  const supabase = await createClient()

  const { data: envios } = await supabase
    .from('envio_sugerido')
    .select('*')
    .eq('estado', 'pendiente_revision')
    .order('fecha_sugerida', { ascending: false }) as { data: EnvioSugerido[] | null; error: unknown }

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-50 pb-20">
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center">
            <MessageSquare className="mr-2 h-5 w-5 text-emerald-500" /> Avisos
          </h1>
          <p className="text-sm text-slate-500">
            {envios?.length || 0} pendientes de envío
          </p>
        </div>
        <MotorRecordatoriosBoton />
      </div>

      <div className="p-4 space-y-4">
        {envios && envios.length > 0 ? (
          envios.map(envio => (
            <EnvioCard key={envio.id} envio={envio} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="bg-emerald-50 p-4 rounded-full mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Bandeja limpia</h3>
            <p className="text-sm text-slate-500">
              No hay recordatorios pendientes de envío. Puedes generar nuevos avisos ejecutando el escáner.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
