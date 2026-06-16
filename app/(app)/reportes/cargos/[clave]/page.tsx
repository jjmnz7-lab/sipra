import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { fetchLotesCargos } from '@/lib/reportes/cargos-grupales'
import { LoteClientView } from './lote-client-view'

export const dynamic = 'force-dynamic'

export default async function LoteCargosPage({ params }: { params: Promise<{ clave: string }> }) {
  const { clave } = await params
  const claveLote = decodeURIComponent(clave)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  const lotes = await fetchLotesCargos(supabase, academiaId)
  const lote = lotes.find((l) => l.clave === claveLote)
  if (!lote) notFound()

  return <LoteClientView lote={lote} />
}
