import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CrearGrupoDrawer } from '@/components/domain/grupo/crear-grupo-drawer'
import { CrearPersonaDrawer } from '@/components/domain/persona/crear-persona-drawer'
import { Users, Phone, ChevronRight, Search } from 'lucide-react'
import Link from 'next/link'
import type { Database } from '@/lib/types/database.types'

type PersonaRow = Database['public']['Tables']['persona']['Row'] & {
  persona_grupo: { grupo: { id: string; nombre: string } | null }[] | null
}
type GrupoRow = Database['public']['Tables']['grupo']['Row'] & {
  persona_grupo: { count: number }[] | null
}

export default async function GruposPage() {
  const supabase = await createClient()

  // Fetch grupos con el estado de sus miembros
  const { data: grupos } = await supabase
    .from('grupo')
    .select(`
      id, nombre, descripcion, estado,
      persona_grupo (
        persona (estado_global)
      )
    `)
    .eq('estado', 'activo')
    .order('nombre', { ascending: true }) as any

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-50 pb-24">
      {/* Header (spec §8) */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Grupos</h1>
        <div className="flex gap-1">
          <button className="p-2 text-slate-600 hover:text-slate-900 transition-colors">
            <Search className="h-5 w-5" />
          </button>
          <CrearGrupoDrawer />
        </div>
      </div>

      {/* Lista de Grupos (spec §9) */}
      <div className="p-4 space-y-3">
        {grupos?.map((grupo: any) => {
          const members = grupo.persona_grupo || []
          const totalAlumnos = members.length
          
          // Calcular semáforo
          const alCorriente = members.filter((m: any) => m.persona?.estado_global === 'al_corriente').length
          const vencidos = members.filter((m: any) => m.persona?.estado_global === 'vencido').length
          const parciales = totalAlumnos - alCorriente - vencidos

          return (
            <Link href={`/grupos/${grupo.id}`} key={grupo.id} className="block">
              <Card className="overflow-hidden hover:border-indigo-200 transition-colors">
                <CardContent className="p-4 flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{grupo.nombre}</h3>
                    <div className="flex items-center text-xs text-slate-500 mt-1">
                      <Users className="h-3.5 w-3.5 mr-1" />
                      {totalAlumnos} {totalAlumnos === 1 ? 'alumno' : 'alumnos'}
                    </div>
                  </div>

                  {/* Semáforo Suave (spec §2.B) */}
                  <div className="flex gap-1.5 text-xs font-semibold">
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">🟢 {alCorriente}</span>
                    {parciales > 0 && (
                      <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">🟡 {parciales}</span>
                    )}
                    <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full">🔴 {vencidos}</span>
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-400 ml-2 flex-shrink-0" />
                </CardContent>
              </Card>
            </Link>
          )
        })}

        {(!grupos || grupos.length === 0) && (
          <div className="text-center py-16 px-4 text-slate-500 text-sm">
            No hay grupos activos.
          </div>
        )}
      </div>

      <CrearPersonaDrawer grupos={(grupos || []) as any} />
    </div>
  )
}
