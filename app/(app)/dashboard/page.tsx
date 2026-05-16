import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import { buildWhatsAppUrl, buildRecordatorioMensaje } from '@/lib/utils/whatsapp'
import { GenerarMensualidadesDrawer } from '@/components/domain/cargo/generar-mensualidades-drawer'
import {
  TrendingUp,
  AlertCircle,
  Users,
  MessageCircle,
  ChevronRight,
  LayoutDashboard,
} from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  const { data: academia } = await supabase.from('academia').select('nombre').eq('id', academiaId).single() as { data: { nombre: string } | null; error: unknown }

  const { data: kpis } = await (supabase as any).rpc('get_dashboard_kpis_v1', { p_academia_id: academiaId })

  const totalIngresos = kpis?.total_ingresos || 0
  const totalDeudaVencida = kpis?.total_deuda_vencida || 0
  const cantAlumnos = kpis?.cant_alumnos || 0
  const cantAvisos = kpis?.cant_avisos || 0
  
  const topDeudoresList = kpis?.top_deudores?.map((d: any) => [
    d.persona_id, 
    { 
      nombre: d.persona.nombre, 
      apellido: d.persona.apellido, 
      telefono: d.persona.telefono_whatsapp, 
      total: d.total 
    }
  ]) || []

  const mesActual = new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 pt-4 pb-5 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-indigo-600" />
              Resumen
            </h1>
            <p className="text-sm text-slate-500 capitalize">{mesActual} · {academia?.nombre}</p>
          </div>
          {cantAvisos > 0 && (
            <Link href="/recordatorios">
              <Badge variant="destructive" className="text-xs animate-pulse">
                {cantAvisos} aviso{cantAvisos > 1 ? 's' : ''}
              </Badge>
            </Link>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Ingresos Mes</p>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalIngresos)}</p>
            </CardContent>
          </Card>

          <Card className="border-red-100 bg-gradient-to-br from-red-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Deuda Vencida</p>
              </div>
              <p className="text-2xl font-bold text-red-700">{formatCurrency(totalDeudaVencida)}</p>
            </CardContent>
          </Card>

          <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50 to-white col-span-2">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                <div>
                  <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Alumnos Activos</p>
                  <p className="text-2xl font-bold text-indigo-700">{cantAlumnos}</p>
                </div>
              </div>
              {cantAvisos > 0 && (
                <>
                  <div className="w-px h-10 bg-slate-200" />
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Avisos WA</p>
                      <p className="text-2xl font-bold text-amber-700">{cantAvisos}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Action: Generar Mensualidades */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Acción Rápida</h2>
          <GenerarMensualidadesDrawer />
        </section>

        {/* Top Deudores */}
        {topDeudoresList.length > 0 && (
          <section>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Top Deudores</h2>
              <Link href="/pendientes" className="text-xs text-indigo-600 font-medium">
                Ver todos →
              </Link>
            </div>
            <div className="space-y-2">
              {(topDeudoresList as [string, { nombre: string; apellido: string | null; telefono: string | null; total: number }][]).map(([personaId, deudor]) => {
                const mensaje = buildRecordatorioMensaje({
                  nombre: deudor.nombre,
                  academia: (academia as any)?.nombre ?? 'la academia',
                  monto: deudor.total,
                  concepto: 'saldo vencido',
                })
                const waUrl = buildWhatsAppUrl(deudor.telefono, mensaje)

                return (
                  <Card key={personaId} className="overflow-hidden">
                    <CardContent className="p-3 flex items-center gap-3">
                      <Link href={`/seguimiento/${personaId}`} className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {deudor.nombre} {deudor.apellido}
                        </p>
                        <p className="text-sm font-bold text-red-600">{formatCurrency(deudor.total)}</p>
                      </Link>
                      <div className="flex items-center gap-2 shrink-0">
                        {waUrl && (
                          <a href={waUrl} target="_blank" rel="noreferrer">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50">
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                        <Link href={`/seguimiento/${personaId}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>
        )}

        {topDeudoresList.length === 0 && totalDeudaVencida === 0 && (
          <Card className="border-emerald-100 bg-emerald-50">
            <CardContent className="p-6 text-center">
              <p className="text-2xl mb-2">🎉</p>
              <p className="font-bold text-emerald-800">¡Todo al corriente!</p>
              <p className="text-sm text-emerald-700">No hay deudas vencidas en este momento.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
