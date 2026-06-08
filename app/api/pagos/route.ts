import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { translateRpcError } from '@/lib/utils/rpc-errors'

// POST /api/pagos
// ==============================================================================
// Registra un pago contra uno o varios cargos del alumno.
//
// La RPC `registrar_pago_atomico_v1` resuelve TODO atómicamente:
//   - lee `academia.allow_partial_payments`
//   - si es false y monto_total < Σ saldo_pendiente de los cargos seleccionados,
//     levanta `PAGO_PARCIAL_NO_PERMITIDO` (lo traducimos a 400)
//   - inserta movimiento, aplicaciones y actualiza cargos
//   - el trigger trg_cargo_sync_saldo ajusta persona.saldo_acumulado
// ==============================================================================

const payloadSchema = z.object({
  persona_id: z.string().uuid({ message: 'Alumno inválido' }),
  cargo_ids: z.array(z.string().uuid()).min(1, { message: 'Selecciona al menos un cargo' }),
  monto_total: z.number().positive({ message: 'monto_total debe ser > 0' }),
  metodo_pago: z.string().trim().min(1).max(40),
  idempotency_key: z.string().uuid({ message: 'idempotency_key debe ser UUID' }),
  referencia: z.string().trim().max(200).optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = payloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido', detalles: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const academiaId = (user.app_metadata as any)?.academia_id as string | undefined
  if (!academiaId) return NextResponse.json({ error: 'Academia no resuelta' }, { status: 403 })

  const { data, error } = await (supabase as any).rpc('registrar_pago_atomico_v1', {
    p_academia_id: academiaId,
    p_persona_id: parsed.data.persona_id,
    p_cargo_ids: parsed.data.cargo_ids,
    p_monto_total: parsed.data.monto_total,
    p_metodo_pago: parsed.data.metodo_pago,
    p_idempotency_key: parsed.data.idempotency_key,
    p_referencia: parsed.data.referencia ?? null,
  })

  if (error) {
    const msg = error.message ?? ''
    if (msg.includes('PAGO_PARCIAL_NO_PERMITIDO')) {
      return NextResponse.json(
        { error: 'La academia no permite abonos parciales', code: 'PAGO_PARCIAL_NO_PERMITIDO' },
        { status: 400 }
      )
    }
    if (msg.includes('ACCESO_DENEGADO')) {
      return NextResponse.json({ error: translateRpcError(error), code: 'ACCESO_DENEGADO' }, { status: 403 })
    }
    // 23505 = idempotency_key duplicada → ya procesado
    if (error.code === '23505') {
      return NextResponse.json(
        { error: translateRpcError(error), code: 'DUPLICATE_IDEMPOTENCY_KEY' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: translateRpcError(error), code: error.code ?? null }, { status: 400 })
  }

  return NextResponse.json({ success: true, ...(data as object) }, { status: 201 })
}
