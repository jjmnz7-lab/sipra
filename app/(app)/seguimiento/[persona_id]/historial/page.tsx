import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Database } from '@/lib/types/database.types'
import type { EventoTimeline } from '@/components/domain/timeline/evento-config'
import { HistorialClientView } from './historial-client-view'

type EventoRow = Database['public']['Tables']['evento_timeline']['Row']

const PAGE_SIZE = 20

export default async function HistorialCompletoPage({ params }: { params: Promise<{ persona_id: string }> }) {
  const { persona_id } = await params
  const supabase = await createClient()

  const { data: persona } = await supabase
    .from('persona')
    .select('id, nombre, apellido, estado_registro, share_token, telefono_whatsapp')
    .eq('id', persona_id)
    .single() as { data: { id: string; nombre: string; apellido: string | null; estado_registro: string; share_token: string; telefono_whatsapp: string | null } | null; error: unknown }

  if (!persona) notFound()

  // Primera página del historial (sin filtro). Pedimos uno extra para saber si hay más.
  const { data: eventos } = await supabase
    .from('evento_timeline')
    .select('*')
    .eq('persona_id', persona_id)
    .order('fecha_evento', { ascending: false })
    .range(0, PAGE_SIZE) as { data: EventoRow[] | null; error: unknown }

  const rows = eventos ?? []
  const hasMore = rows.length > PAGE_SIZE

  return (
    <HistorialClientView
      persona={persona}
      eventosIniciales={(hasMore ? rows.slice(0, PAGE_SIZE) : rows) as unknown as EventoTimeline[]}
      hasMoreInicial={hasMore}
      pageSize={PAGE_SIZE}
    />
  )
}
