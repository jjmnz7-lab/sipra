import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Phone, ArrowLeft, Users } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function GrupoDetallePage({ params }: { params: Promise<{ grupo_id: string }> }) {
  const { grupo_id } = await params
  const supabase = await createClient()

  // Fetch grupo
  const { data: grupo } = await supabase
    .from('grupo')
    .select('*')
    .eq('id', grupo_id)
    .single()

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
    .order('fecha_inscripcion', { ascending: false })

  return (
    <div className="flex flex-col h-full min-h-screen pb-20">
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex items-center space-x-3">
        <Link href="/grupos" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{grupo.nombre}</h1>
          <p className="text-xs text-slate-500">{inscripciones?.length || 0} alumnos activos</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {grupo.descripcion && (
          <div className="p-4 bg-slate-100 rounded-xl text-sm text-slate-700">
            {grupo.descripcion}
          </div>
        )}

        <h2 className="text-sm font-semibold text-slate-800 flex items-center mt-6">
          <Users className="h-4 w-4 mr-2 text-slate-500" /> Alumnos Inscritos
        </h2>

        <div className="space-y-3">
          {inscripciones?.map(({ persona }: any) => (
            <Card key={persona.id} className="overflow-hidden">
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
              </CardContent>
            </Card>
          ))}

          {(!inscripciones || inscripciones.length === 0) && (
            <div className="text-center py-12 text-slate-500 text-sm">
              No hay alumnos inscritos en esta clase.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
