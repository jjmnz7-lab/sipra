import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Cron: corre DIARIO. Itera todas las academias activas y dispara
// generar_cargos_recurrentes_v1 con la fecha de hoy. La RPC decide qué planes
// vencen hoy (mensual = día 1, semanal = lunes) e ignora por_visita/pago_unico.
// Vercel Cron envía el header `Authorization: Bearer <CRON_SECRET>`.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'missing_supabase_env' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Solo academias activas con automatización recurrente encendida. Las academias
  // de modelo "puros cargos manuales" (automatizacion_recurrente=false) se omiten;
  // la RPC tiene el mismo guard como red de seguridad.
  const { data: academias, error: errAcademias } = await supabase
    .from('academia')
    .select('id, nombre')
    .eq('estado_tenant', 'activa')
    .eq('automatizacion_recurrente', true)

  if (errAcademias) {
    return NextResponse.json({ error: errAcademias.message }, { status: 500 })
  }

  const fecha = new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)

  const resultados: Array<{ academia_id: string; nombre: string; cargos_creados?: number; omitidos?: number; error?: string }> = []

  for (const academia of academias ?? []) {
    const { data, error } = await supabase.rpc('generar_cargos_recurrentes_v1' as any, {
      p_academia_id: academia.id,
      p_fecha: fecha,
    })
    if (error) {
      resultados.push({ academia_id: academia.id, nombre: academia.nombre, error: error.message })
    } else {
      const r = data as { cargos_creados: number; omitidos_duplicado: number } | null
      resultados.push({
        academia_id: academia.id,
        nombre: academia.nombre,
        cargos_creados: r?.cargos_creados ?? 0,
        omitidos: r?.omitidos_duplicado ?? 0,
      })
    }
  }

  return NextResponse.json({
    success: true,
    fecha,
    procesadas: resultados.length,
    resultados,
  })
}
