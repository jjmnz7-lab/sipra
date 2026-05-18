import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { RegistrarPagoDrawer } from '@/components/domain/cargo/registrar-pago-drawer'
import { FabOperativo } from '@/components/layout/fab-operativo'
import { SwipeableCargoCard } from '@/components/domain/cargo/swipeable-cargo-card'
import { Calendar, Banknote, Bell, ChevronRight, Search, Settings, MessageCircle } from 'lucide-react'
import type { CargoConPersona } from '@/lib/types/domain'
import Link from 'next/link'

export default async function PendientesPage({ searchParams }: { searchParams: Promise<{ status?: string, group?: string }> }) {
  const { status: activeStatus, group: activeGroup } = await searchParams
  const supabase = await createClient()

  // 1. Fetch alumnos para el drawer de nuevo cargo
  const { data: alumnos } = await supabase
    .from('persona')
    .select('id, nombre, apellido')
    .eq('etiqueta', 'alumno')
    .eq('estado_global', 'al_corriente') // O traer todos activos
    .order('nombre') as any

  // Fetch grupos activos
  const { data: grupos } = await supabase
    .from('grupo')
    .select('id, nombre')
    .eq('estado', 'activo')
    .order('nombre')

  // Fetch personas del grupo seleccionado si aplica
  let personasEnGrupo: string[] = []
  if (activeGroup) {
    const { data: rels } = await supabase
      .from('persona_grupo')
      .select('persona_id')
      .eq('grupo_id', activeGroup)
      .eq('estado', 'activo')
    
    personasEnGrupo = rels?.map((r: any) => r.persona_id) || []
  }

  // 2. Fetch cargos operativos
  const { data: cargos } = await supabase
    .from('cargo')
    .select(`
      id, concepto, monto_original, saldo_pendiente, fecha_vencimiento, estado_financiero, persona_id,
      persona (nombre, apellido)
    `)
    .in('estado_financiero', ['vencido', 'pendiente', 'parcial'])
    .order('fecha_vencimiento', { ascending: true }) as { data: CargoConPersona[] | null; error: unknown }

  // 3. Calcular KPIs — priorizar conteo sobre montos (spec §8)
  const cargosVencidos = cargos?.filter((c: any) => c.estado_financiero === 'vencido') || []
  const cargosPendientes = cargos?.filter((c: any) => c.estado_financiero === 'pendiente' || c.estado_financiero === 'parcial') || []

  // Conteo de personas únicas (no de cargos)
  const personasConDeudaVencida = new Set(cargosVencidos.map((c: any) => c.persona_id)).size
  const personasConDeudaPendiente = new Set(cargosPendientes.map((c: any) => c.persona_id)).size

  // Montos totales como dato secundario
  const montoVencido = cargosVencidos.reduce((acc: number, c: any) => acc + Number(c.saldo_pendiente), 0)
  const montoPendiente = cargosPendientes.reduce((acc: number, c: any) => acc + Number(c.saldo_pendiente), 0)

  // Cobrado hoy
  const hoy = new Date().toISOString().split('T')[0]
  const { data: cobradoHoy } = await supabase
    .from('movimiento')
    .select('monto_total')
    .eq('estado', 'registrado')
    .gte('fecha_pago', `${hoy}T00:00:00Z`)
  
  const totalCobrado = (cobradoHoy as any)?.reduce((acc: number, m: any) => acc + Number(m.monto_total), 0) || 0
  const pagosHoy = (cobradoHoy as any)?.length || 0

  // 4. Asistente: recordatorios pendientes de envío
  const { count: cantAvisos } = await supabase
    .from('envio_sugerido')
    .select('id', { count: 'exact', head: true })
    .eq('estado', 'pendiente_revision')

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-50 pb-24">
      {/* Header & KPIs */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Pendientes</h1>
          <div className="flex gap-1">
            <button className="p-2 text-slate-600 hover:text-slate-900 transition-colors">
              <Search className="h-5 w-5" />
            </button>
            <button className="p-2 text-slate-600 hover:text-slate-900 transition-colors">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Termómetro: conteo primero, monto secundario */}
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x hide-scrollbar">
          <Card className="min-w-[130px] snap-start border-red-100 bg-red-50/50 flex-shrink-0">
            <CardContent className="p-3">
              <p className="text-xs font-medium text-red-600 mb-0.5">Vencidos</p>
              <p className="text-2xl font-black text-red-700 leading-none">{personasConDeudaVencida}</p>
              <p className="text-[10px] text-red-400 mt-1">{formatCurrency(montoVencido)}</p>
            </CardContent>
          </Card>
          <Card className="min-w-[130px] snap-start border-amber-100 bg-amber-50/50 flex-shrink-0">
            <CardContent className="p-3">
              <p className="text-xs font-medium text-amber-600 mb-0.5">Pendientes</p>
              <p className="text-2xl font-black text-amber-700 leading-none">{personasConDeudaPendiente}</p>
              <p className="text-[10px] text-amber-400 mt-1">{formatCurrency(montoPendiente)}</p>
            </CardContent>
          </Card>
          <Card className="min-w-[130px] snap-start border-emerald-100 bg-emerald-50/50 flex-shrink-0">
            <CardContent className="p-3">
              <p className="text-xs font-medium text-emerald-600 mb-0.5">Cobrado hoy</p>
              <p className="text-2xl font-black text-emerald-700 leading-none">{pagosHoy}</p>
              <p className="text-[10px] text-emerald-400 mt-1">{formatCurrency(totalCobrado)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros Rápidos (Chips) (spec §10) */}
        <div className="flex gap-2 text-sm overflow-x-auto hide-scrollbar">
          <Link 
            href={`/pendientes${activeGroup ? `?group=${activeGroup}` : ''}`} 
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              !activeStatus ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos
          </Link>
          <Link 
            href={`/pendientes?status=vencidos${activeGroup ? `&group=${activeGroup}` : ''}`} 
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeStatus === 'vencidos' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Vencidos
          </Link>
          <Link 
            href={`/pendientes?status=pendientes${activeGroup ? `&group=${activeGroup}` : ''}`} 
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeStatus === 'pendientes' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pendientes
          </Link>
          <Link 
            href={`/pendientes?status=parciales${activeGroup ? `&group=${activeGroup}` : ''}`} 
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeStatus === 'parciales' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Parciales
          </Link>

          {/* Separador visual */}
          <div className="w-px h-6 bg-slate-200 self-center mx-1" />

          {/* Chips de Grupos */}
          {grupos?.map(grupo => (
            <Link
              key={grupo.id}
              href={`/pendientes?${activeStatus ? `status=${activeStatus}&` : ''}group=${grupo.id}`}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                activeGroup === grupo.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {grupo.nombre}
            </Link>
          ))}
        </div>
      </div>

      {/* Bloque Asistente — condicional, solo aparece cuando hay sugerencias (spec §9) */}
      {cantAvisos !== null && cantAvisos > 0 && (
        <div className="mx-4 mt-4">
          <Link href="/recordatorios" className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 hover:bg-indigo-100 transition-colors">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                <Bell className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-indigo-800">
                  {cantAvisos === 1 ? '1 recordatorio listo' : `${cantAvisos} recordatorios listos`}
                </p>
                <p className="text-xs text-indigo-500">El sistema preparó mensajes para revisar</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-indigo-600">
              <span className="text-xs font-medium">Revisar</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </Link>
        </div>
      )}

      {/* Lista de Cargos */}
      <div className="p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center mb-4">
          <Banknote className="h-4 w-4 mr-2 text-slate-500" /> Cargos Operativos
        </h2>

        {cargos?.filter(cargo => {
          // Filtrar por status
          let matchStatus = true
          if (activeStatus === 'vencidos') matchStatus = cargo.estado_financiero === 'vencido'
          if (activeStatus === 'pendientes') matchStatus = cargo.estado_financiero === 'pendiente'
          if (activeStatus === 'parciales') matchStatus = cargo.estado_financiero === 'parcial'

          // Filtrar por grupo
          let matchGroup = true
          if (activeGroup) matchGroup = personasEnGrupo.includes(cargo.persona_id)

          return matchStatus && matchGroup
        }).map(cargo => {
          const isVencido = cargo.estado_financiero === 'vencido'
          return (
            <SwipeableCargoCard key={cargo.id} cargo={cargo}>
              <Card className="overflow-hidden hover:border-indigo-200 transition-colors">
                <CardContent className="p-4 flex gap-3 items-center">
                  {/* Contenido principal (clicable para ir a Seguimiento) */}
                  <Link href={`/seguimiento/${cargo.persona_id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isVencido ? 'bg-red-500' : cargo.estado_financiero === 'parcial' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                      <h3 className="font-bold text-slate-900 truncate">
                        {cargo.persona?.nombre ?? '—'} {cargo.persona?.apellido ?? ''}
                      </h3>
                    </div>
                    
                    <p className="text-sm text-slate-600 truncate">
                      {cargo.concepto} · <span className="font-semibold text-slate-800">{formatCurrency(cargo.saldo_pendiente)}</span>
                    </p>
                    
                    <div className="flex items-center text-xs text-slate-500 mt-1">
                      <Calendar className="h-3.5 w-3.5 mr-1" />
                      Vence: {new Date(cargo.fecha_vencimiento).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </div>
                  </Link>

                  {/* Acciones Rápidas (Derecha) */}
                  <div className="flex items-center gap-1 border-l border-slate-100 pl-2">
                    {cargo.persona?.telefono_whatsapp && (
                      <a 
                        href={`https://wa.me/${cargo.persona.telefono_whatsapp}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                      >
                        <MessageCircle className="h-5 w-5" />
                      </a>
                    )}
                    
                    <RegistrarPagoDrawer cargo={cargo}>
                      <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
                        <Banknote className="h-5 w-5" />
                      </button>
                    </RegistrarPagoDrawer>
                  </div>
                </CardContent>
              </Card>
            </SwipeableCargoCard>
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

      <FabOperativo alumnos={alumnos || []} />
    </div>
  )
}
