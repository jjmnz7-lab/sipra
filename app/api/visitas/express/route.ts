import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { translateRpcError } from '@/lib/utils/rpc-errors'
import { alumnoSuspendido, MSG_ALUMNO_SUSPENDIDO } from '@/lib/utils/guards'

// Cobro Express de Visita
// =====================================================================
// "Solo Cargar"     → monto_pago null o 0 → inyecta cargo, sube saldo_acumulado.
// "Cargar y Cobrar" → monto_pago > 0      → cargo + pago aplicado atómicamente,
//                                          saldo_acumulado neto sin cambio.
//
// Si no llega `alumno_id`, se crea el alumno al vuelo (etiqueta='alumno'). El
// vínculo al plan 'por_visita' es opcional vía `plan_cobro_id`.
//
// La transacción atómica cargo+pago vive en la RPC `procesar_visita_express_v1`.

const alumnoNuevoSchema = z.object({
  nombre: z.string().trim().min(1),
  apellido: z.string().trim().optional(),
  telefono_whatsapp: z.string().trim().optional(),
  plan_cobro_id: z.string().uuid().optional(), // típicamente un plan 'por_visita'
})

const payloadSchema = z.object({
  alumno_id: z.string().uuid().optional(),
  alumno_nuevo: alumnoNuevoSchema.optional(),
  monto_cargo: z.number().positive({ message: 'monto_cargo debe ser > 0' }),
  concepto: z.string().trim().min(1).max(200).optional(),
  monto_pago: z.number().nonnegative().optional(),
  metodo_pago: z.string().trim().min(1).max(40).optional(),
  idempotency_key: z.string().uuid().optional(),
  referencia: z.string().trim().max(200).optional(),
}).refine(
  (v) => Boolean(v.alumno_id) !== Boolean(v.alumno_nuevo),
  { message: 'Debes enviar alumno_id O alumno_nuevo (uno solo).' }
)

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
  const data = parsed.data

  // "Cargar y Cobrar" requiere idempotency_key.
  if ((data.monto_pago ?? 0) > 0 && !data.idempotency_key) {
    return NextResponse.json(
      { error: 'idempotency_key es obligatorio cuando se registra un pago.' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const academiaId = (user.app_metadata as any)?.academia_id as string | undefined
  if (!academiaId) return NextResponse.json({ error: 'Academia no resuelta' }, { status: 403 })

  // 1) Resolver alumno_id (existente o creación al vuelo).
  let alumnoId = data.alumno_id ?? null

  if (!alumnoId && data.alumno_nuevo) {
    const { data: persona, error: errPersona } = await (supabase as any)
      .from('persona')
      .insert({
        academia_id: academiaId,
        nombre: data.alumno_nuevo.nombre,
        apellido: data.alumno_nuevo.apellido ?? null,
        telefono_whatsapp: data.alumno_nuevo.telefono_whatsapp ?? null,
        etiqueta: 'alumno',
        estado_registro: 'activo',
        plan_cobro_id: data.alumno_nuevo.plan_cobro_id ?? null,
      })
      .select('id')
      .single()

    if (errPersona || !persona) {
      return NextResponse.json(
        { error: translateRpcError(errPersona ?? { message: 'No se pudo crear el alumno' }) },
        { status: 400 }
      )
    }
    alumnoId = persona.id
  }

  if (!alumnoId) {
    return NextResponse.json({ error: 'No se pudo resolver el alumno.' }, { status: 400 })
  }

  // No registrar visitas (que generan cargo) a alumnos suspendidos.
  if (data.alumno_id && (await alumnoSuspendido(supabase, academiaId, alumnoId))) {
    return NextResponse.json({ error: MSG_ALUMNO_SUSPENDIDO, alumno_id: alumnoId }, { status: 400 })
  }

  // 2) Procesar cargo (+ pago opcional) atómicamente vía RPC.
  const { data: rpcData, error: errRpc } = await (supabase as any).rpc(
    'procesar_visita_express_v1',
    {
      p_academia_id: academiaId,
      p_alumno_id: alumnoId,
      p_monto_cargo: data.monto_cargo,
      p_concepto: data.concepto ?? 'Visita / Clase suelta',
      p_monto_pago: data.monto_pago ?? null,
      p_metodo_pago: data.metodo_pago ?? 'efectivo',
      p_idempotency_key: data.idempotency_key ?? null,
      p_referencia: data.referencia ?? null,
    }
  )

  if (errRpc) {
    const status = errRpc.message?.includes('ACCESO_DENEGADO') ? 403 : 400
    return NextResponse.json(
      { error: translateRpcError(errRpc), alumno_id: alumnoId },
      { status }
    )
  }

  return NextResponse.json(
    { success: true, alumno_id: alumnoId, ...(rpcData as object) },
    { status: 201 }
  )
}
