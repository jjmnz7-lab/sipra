import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { RegistrarPagoDrawer } from '@/components/domain/cargo/registrar-pago-drawer'
import { CrearCargoDrawer } from '@/components/domain/cargo/crear-cargo-drawer'
import { Calendar, Banknote } from 'lucide-react'
import type { CargoConPersona } from '@/lib/types/domain'

export default async function PendientesPage() {
  const supabase = await createClient()

  // 1. Fetch alumnos para el drawer de nuevo cargo
  const { data: alumnos } = await supabase
    .from('persona')
    .select('id, nombre, apellido')
    .eq('etiqueta', 'alumno')
    .eq('estado_global', 'al_corriente') // O traer todos activos
    .order('nombre') as any

  // 2. Fetch cargos operativos
  const { data: cargos } = await supabase
    .from('cargo')
    .select(`
      id, concepto, monto_original, saldo_pendiente, fecha_vencimiento, estado_financiero, persona_id,
      persona (nombre, apellido)
    `)
    .in('estado_financiero', ['vencido', 'pendiente', 'parcial'])
    .order('fecha_vencimiento', { ascending: true }) as { data: CargoConPersona[] | null; error: unknown }

  // 3. Calcular KPIs
  const totalVencido = cargos
    ?.filter((c: any) => c.estado_financiero === 'vencido')
    .reduce((acc: number, c: any) => acc + Number(c.saldo_pendiente), 0) || 0

  const totalPendiente = cargos
    ?.filter((c: any) => c.estado_financiero === 'pendiente' || c.estado_financiero === 'parcial')
    .reduce((acc: number, c: any) => acc + Number(c.saldo_pendiente), 0) || 0

  // Fetch lo cobrado hoy
  const hoy = new Date().toISOString().split('T')[0]
  const { data: cobradoHoy } = await supabase
    .from('movimiento')
    .select('monto_total')
    .eq('estado', 'registrado')
    .gte('fecha_pago', `${hoy}T00:00:00Z`)
  
  const totalCobrado = (cobradoHoy as any)?.reduce((acc: number, m: any) => acc + Number(m.monto_total), 0) || 0

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-50 pb-24">
      {/* Header & KPIs */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 space-y-4">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Cobranza</h1>
        
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x hide-scrollbar">
          <Card className="min-w-[140px] snap-start border-red-100 bg-red-50/50">
            <CardContent className="p-3">
              <p className="text-xs font-medium text-red-600 mb-1">Total Vencido</p>
              <p className="text-lg font-bold text-red-700">{formatCurrency(totalVencido)}</p>
            </CardContent>
          </Card>
          <Card className="min-w-[140px] snap-start border-amber-100 bg-amber-50/50">
            <CardContent className="p-3">
              <p className="text-xs font-medium text-amber-600 mb-1">A Cobrar Hoy/Mes</p>
              <p className="text-lg font-bold text-amber-700">{formatCurrency(totalPendiente)}</p>
            </CardContent>
          </Card>
          <Card className="min-w-[140px] snap-start border-emerald-100 bg-emerald-50/50">
            <CardContent className="p-3">
              <p className="text-xs font-medium text-emerald-600 mb-1">Cobrado Hoy</p>
              <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalCobrado)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lista de Cargos */}
      <div className="p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center mb-4">
          <Banknote className="h-4 w-4 mr-2 text-slate-500" /> Cargos Operativos
        </h2>

        {cargos?.map(cargo => {
          const isVencido = cargo.estado_financiero === 'vencido'
          return (
            <RegistrarPagoDrawer key={cargo.id} cargo={cargo}>
              <Card className="overflow-hidden cursor-pointer active:scale-[0.98] transition-transform hover:border-indigo-200">
                <CardContent className="p-4 flex gap-4 items-center">
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-slate-900 leading-tight">
                        {cargo.persona?.nombre ?? '—'} {cargo.persona?.apellido ?? ''}
                      </h3>
                      <Badge 
                        variant={isVencido ? 'destructive' : 'outline'}
                        className={!isVencido ? 'text-amber-600 border-amber-200 bg-amber-50' : ''}
                      >
                        {isVencido ? 'Vencido' : cargo.estado_financiero === 'parcial' ? 'Parcial' : 'Pendiente'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">{cargo.concepto}</p>
                    <div className="flex items-center text-xs text-slate-500 mt-2">
                      <Calendar className="h-3 w-3 mr-1" />
                      Vence: {new Date(cargo.fecha_vencimiento).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  
                  <div className="text-right flex flex-col items-end justify-center border-l border-slate-100 pl-4 min-w-[80px]">
                    <span className="text-xs text-slate-400 mb-1">Saldo</span>
                    <span className={`text-lg font-bold ${isVencido ? 'text-red-600' : 'text-amber-600'}`}>
                      {formatCurrency(cargo.saldo_pendiente)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </RegistrarPagoDrawer>
          )
        })}

        {(!cargos || cargos.length === 0) && (
          <div className="text-center py-16 px-4">
            <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Banknote className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">Todo al corriente</h3>
            <p className="text-sm text-slate-500">No hay cargos pendientes ni vencidos por cobrar.</p>
          </div>
        )}
      </div>

      <CrearCargoDrawer alumnos={alumnos || []} />
    </div>
  )
}
