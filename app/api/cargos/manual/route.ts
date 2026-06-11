import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { translateRpcError } from '@/lib/utils/rpc-errors'

// Motor B/C: Cargo manual único (inscripción, actividad, uniforme, ensayo extra...).
// Si el operador modificó el precio estándar (ej. descuento 2x1), `nota_modificacion`
// queda concatenada al concepto del cargo y guardada en metadata para auditoría.
const payloadSchema = z.object({
  alumno_id: z.string().uuid({ message: 'Alumno inválido' }),
  monto: z.number().positive({ message: 'El monto debe ser mayor a 0' }),
  concepto: z.string().trim().min(2, { message: 'Concepto requerido' }),
  nota_modificacion: z.string().trim().min(1).max(500).optional(),
  fecha_vencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  origen: z.enum(['manual', 'inscripcion', '1er mensualidad', 'ajuste', 'grupal']).optional(),
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
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  const academiaId = (user.app_metadata as any)?.academia_id as string | undefined
  if (!academiaId) {
    return NextResponse.json({ error: 'Academia no resuelta' }, { status: 403 })
  }

  const { data, error } = await (supabase as any).rpc('crear_cargo_manual_v2', {
    p_academia_id: academiaId,
    p_alumno_id: parsed.data.alumno_id,
    p_monto: parsed.data.monto,
    p_concepto: parsed.data.concepto,
    p_nota_modificacion: parsed.data.nota_modificacion ?? null,
    p_fecha_vencimiento: parsed.data.fecha_vencimiento ?? null,
    p_origen: parsed.data.origen ?? 'manual',
  })

  if (error) {
    const msg = translateRpcError(error)
    const status = error.message?.includes('ACCESO_DENEGADO') ? 403 : 400
    return NextResponse.json({ error: msg, code: error.code ?? null }, { status })
  }

  return NextResponse.json({ success: true, ...(data as object) }, { status: 201 })
}
