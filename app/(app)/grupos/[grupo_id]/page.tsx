import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Users, Banknote, ClipboardList, Bell, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatCurrency } from '@/lib/utils/currency'

export default async function GrupoDetallePage({ params }: { params: Promise<{ grupo_id: string }> }) {
  const { grupo_id } = await params
  const supabase = await createClient()

  // Fetch grupo
  const { data: grupo } = await supabase
    .from('grupo')
    .select('*')
    .eq('id', grupo_id)
    .single() as any

  if (!grupo) {
    notFound()
  }

  // Fetch alumnos inscritos
  const { data: inscripciones } = await supabase
    .from('persona_grupo')
    .select(`
      id, estado, fecha_inscripcion,
      persona (id, nombre, apellido, telefono_whatsapp, estado_global)
    `)
    .eq('grupo_id', grupo_id)
    .eq('estado', 'activo')
    .order('fecha_inscripcion', { ascending: false }) as any

  const personaIds = inscripciones?.map((i: any) => i.persona?.id) || []

  // Fetch cargos de los alumnos para el resumen financiero
  const { data: cargos } = await supabase
    .from('cargo')
    .select('persona_id, concepto, saldo_pendiente, estado_financiero')
    .in('persona_id', personaIds)
    .in('estado_financiero', ['vencido', 'pendiente', 'parcial']) as any

  // Calcular KPIs
  const totalAlumnos = inscripciones?.length || 0
  const alCorriente = inscripciones?.filter((i: any) => i.persona?.estado_global === 'al_corriente').length || 0
  const vencidos = inscripciones?.filter((i: any) => i.persona?.estado_global === 'vencido').length || 0
  const pendienteGrupo = cargos?.reduce((acc: number, c: any) => acc + Number(c.saldo_pendiente), 0) || 0

  const getConceptoCorto = (personaId: string) => {
    const c = cargos?.find((c: any) => c.persona_id === personaId)
    return c ? c.concepto : 'Al corriente'
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-50 pb-24">
      {/* Header (spec §2.B) */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex items-center space-x-3">
        <Link href="/grupos" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{grupo.nombre}</h1>
          <p className="text-xs text-slate-500">{totalAlumnos} alumnos activos</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Snapshot Operativo (spec §2.B) */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-500">Estado del Grupo</span>
              <span className="text-xs text-slate-400">💰 Pendiente: {formatCurrency(pendienteGrupo)}</span>
            </div>
            <div className="flex gap-2 text-xs font-semibold">
              <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full flex-1 text-center">
                🟢 {alCorriente} Al corriente
              </span>
              <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full flex-1 text-center">
                🔴 {vencidos} Pendientes
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Herramientas de Acción Masiva (spec §2.B) */}
        <div className="grid grid-cols-3 gap-2">
          <button className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl p-3 hover:bg-slate-50 transition-colors">
            <Banknote className="h-5 w-5 text-indigo-600 mb-1" />
            <span className="text-[10px] font-bold text-slate-700">Nuevo cargo</span>
          </button>
          <button className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl p-3 hover:bg-slate-50 transition-colors">
            <ClipboardList className="h-5 w-5 text-indigo-600 mb-1" />
            <span className="text-[10px] font-bold text-slate-700">Resumen</span>
          </button>
          <button className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl p-3 hover:bg-slate-50 transition-colors">
            <Bell className="h-5 w-5 text-indigo-600 mb-1" />
            <span className="text-[10px] font-bold text-slate-700">Nuevo aviso</span>
          </button>
        </div>

        {/* Lista de Miembros (spec §2.B) */}
        <div>
          <h2 className="text-sm font-bold text-slate-900 mb-3">Miembros</h2>
          <div className="space-y-2">
            {inscripciones?.map(({ persona }: any) => {
              const concepto = getConceptoCorto(persona.id)
              const isVencido = persona.estado_global === 'vencido'

              return (
                <Link href={`/seguimiento/${persona.id}`} key={persona.id} className="block">
                  <div className="flex items-center justify-between bg-white border border-slate-100 rounded-lg p-3 hover:border-indigo-100 transition-colors">
                    <div className="flex items-center min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full mr-3 flex-shrink-0 ${isVencido ? 'bg-red-500' : 'bg-emerald-500'}`} />
                      <div className="truncate">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {persona.nombre} {persona.apellido}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{concepto}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 ml-2 flex-shrink-0" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
