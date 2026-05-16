import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CrearGrupoDrawer } from '@/components/domain/grupo/crear-grupo-drawer'
import { CrearPersonaDrawer } from '@/components/domain/persona/crear-persona-drawer'
import { Users, Phone, ChevronRight } from 'lucide-react'
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

  // Data fetching
  const { data: personas } = await supabase
    .from('persona')
    .select(`
      id, nombre, apellido, telefono_whatsapp, estado_global,
      persona_grupo (grupo (id, nombre))
    `)
    .eq('etiqueta', 'alumno')
    .order('created_at', { ascending: false }) as { data: PersonaRow[] | null; error: unknown }

  const { data: grupos } = await supabase
    .from('grupo')
    .select(`
      id, nombre, descripcion, estado,
      persona_grupo (count)
    `)
    .order('orden_visual', { ascending: true }) as { data: GrupoRow[] | null; error: unknown }

  return (
    <div className="flex flex-col h-full min-h-screen">
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 mb-4">Directorio</h1>
        <Tabs defaultValue="alumnos" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="alumnos">Alumnos ({personas?.length || 0})</TabsTrigger>
            <TabsTrigger value="grupos">Clases ({grupos?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="alumnos" className="mt-4 space-y-4 pb-20">
            {personas?.map(persona => (
              <Link href={`/seguimiento/${persona.id}`} key={persona.id} className="block">
                <Card className="overflow-hidden hover:border-indigo-200 transition-colors">
                  <CardContent className="p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-base">
                        {persona.nombre} {persona.apellido}
                      </h3>
                      {persona.telefono_whatsapp && (
                        <a href={`https://wa.me/${persona.telefono_whatsapp}`} className="flex items-center text-sm text-slate-500 mt-1 hover:text-emerald-600 transition-colors">
                          <Phone className="h-3 w-3 mr-1" /> {persona.telefono_whatsapp}
                        </a>
                      )}
                    </div>
                    <Badge variant={persona.estado_global === 'al_corriente' ? 'default' : 'destructive'}>
                      {persona.estado_global === 'al_corriente' ? 'Al corriente' : 'Vencido'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {persona.persona_grupo?.map((pg: any) => (
                      <Badge key={pg.grupo.id} variant="secondary" className="text-xs font-normal">
                        {pg.grupo.nombre}
                      </Badge>
                    ))}
                    {(!persona.persona_grupo || persona.persona_grupo.length === 0) && (
                      <span className="text-xs text-slate-400">Sin grupo asignado</span>
                    )}
                  </div>
                </CardContent>
              </Card>
              </Link>
            ))}
            {personas?.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm">
                No tienes alumnos registrados aún.
              </div>
            )}
          </TabsContent>

          <TabsContent value="grupos" className="mt-4 space-y-4 pb-20">
            {grupos?.map(grupo => (
              <Link href={`/grupos/${grupo.id}`} key={grupo.id} className="block">
                <Card className="hover:border-indigo-200 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-base">{grupo.nombre}</h3>
                      <div className="flex items-center text-sm text-slate-500 mt-1">
                        <Users className="h-3 w-3 mr-1" />
                        {grupo.persona_grupo?.[0]?.count || 0} alumnos inscritos
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </CardContent>
                </Card>
              </Link>
            ))}
            
            <div className="pt-4">
              <CrearGrupoDrawer />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CrearPersonaDrawer grupos={(grupos || []) as GrupoRow[]} />
    </div>
  )
}
