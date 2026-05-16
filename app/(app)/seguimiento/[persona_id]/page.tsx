import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import { AnularPagoDrawer } from '@/components/domain/timeline/anular-pago-drawer'
import { ArrowLeft, Phone, Clock, CheckCircle2, AlertCircle, RefreshCcw } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Database } from '@/lib/types/database.types'

type PersonaConCargo = Database['public']['Tables']['persona']['Row'] & {
  cargo: Pick<Database['public']['Tables']['cargo']['Row'], 'saldo_pendiente' | 'estado_financiero'>[] | null
}
type EventoRow = Database['public']['Tables']['evento_timeline']['Row']

export default async function SeguimientoPersonaPage({ params }: { params: Promise<{ persona_id: string }> }) {
  const { persona_id } = await params
  const supabase = await createClient()

  // 1. Fetch persona
  const { data: persona } = await supabase
    .from('persona')
    .select('*, cargo (saldo_pendiente, estado_financiero)')
    .eq('id', persona_id)
    .single() as { data: PersonaConCargo | null; error: unknown }

  if (!persona) notFound()

  const deudaTotal = persona.cargo?.reduce((acc: number, c: any) => acc + Number(c.saldo_pendiente), 0) || 0

  // 2. Fetch timeline
  const { data: timeline } = await supabase
    .from('evento_timeline')
    .select('*')
    .eq('persona_id', persona_id)
    .order('created_at', { ascending: false }) as { data: EventoRow[] | null; error: unknown }

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-50 pb-20">
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
        <div className="flex items-center space-x-3 mb-4">
          <Link href="/grupos" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
              {persona.nombre} {persona.apellido}
            </h1>
          </div>
          <Badge variant={persona.estado_global === 'al_corriente' ? 'default' : 'destructive'}>
            {persona.estado_global === 'al_corriente' ? 'Al corriente' : 'Vencido'}
          </Badge>
        </div>

        <div className="flex justify-between items-center bg-slate-100 rounded-xl p-4">
          <div>
            <p className="text-xs text-slate-500 font-medium">Deuda actual</p>
            <p className={`text-xl font-bold ${deudaTotal > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {formatCurrency(deudaTotal)}
            </p>
          </div>
          {persona.telefono_whatsapp && (
            <a href={`https://wa.me/${persona.telefono_whatsapp}`} target="_blank" rel="noreferrer" 
               className="flex items-center text-sm font-medium text-emerald-600 bg-emerald-100 px-3 py-2 rounded-lg hover:bg-emerald-200 transition-colors">
              <Phone className="h-4 w-4 mr-2" /> WhatsApp
            </a>
          )}
        </div>
      </div>

      <div className="p-4">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center mb-6">
          <Clock className="h-4 w-4 mr-2 text-slate-500" /> Historial de Operaciones
        </h2>

        <div className="relative border-l-2 border-slate-200 ml-3 space-y-8">
          {timeline?.map(evento => {
            const isPago = evento.tipo === 'abono_registrado'
            const isAnulacion = evento.tipo === 'pago_anulado'
            
            // Metadata parsing
            const meta = evento.metadata as Record<string, any>

            return (
              <div key={evento.id} className="relative pl-6">
                <div className={`absolute -left-[11px] top-1 h-5 w-5 rounded-full border-4 border-slate-50 flex items-center justify-center
                  ${isPago ? 'bg-emerald-500' : isAnulacion ? 'bg-red-500' : 'bg-indigo-500'}`}
                >
                </div>
                
                <Card className={`overflow-hidden shadow-sm ${isAnulacion ? 'border-red-100 bg-red-50/30' : ''}`}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`text-sm font-bold ${isAnulacion ? 'text-red-700 line-through' : 'text-slate-900'}`}>
                        {evento.titulo}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(evento.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    
                    <p className={`text-xs ${isAnulacion ? 'text-red-600' : 'text-slate-600'}`}>
                      {evento.descripcion}
                    </p>

                    {isPago && meta?.movimiento_id && (
                      <div className="mt-3 flex justify-end border-t border-slate-100 pt-2">
                        <AnularPagoDrawer movimientoId={meta.movimiento_id} monto={meta.monto}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
                            <RefreshCcw className="h-3 w-3 mr-1" /> Anular
                          </Button>
                        </AnularPagoDrawer>
                      </div>
                    )}
                    
                    {isAnulacion && (
                      <div className="mt-2 text-[10px] text-slate-500 bg-white p-2 rounded border border-slate-100">
                        <strong>Motivo:</strong> {meta?.motivo} <br/>
                        <strong>Por:</strong> {evento.actor_nombre}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )
          })}

          {(!timeline || timeline.length === 0) && (
            <div className="pl-6 text-sm text-slate-500">
              No hay eventos registrados en el historial de este alumno.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
