'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { translateRpcError } from '@/lib/utils/rpc-errors'

const pagoSchema = z.object({
  // Puede ir vacío: un cobro a un alumno al corriente se registra como saldo a favor.
  cargo_ids: z.array(z.string().uuid()),
  persona_id: z.string().uuid({ message: 'Alumno inválido' }),
  monto_pago: z.number().min(1, { message: 'El pago debe ser mayor a 0' }),
  metodo_pago: z.string().min(2, { message: 'Método inválido' }),
  idempotency_key: z.string().uuid({ message: 'Key inválida' }),
  nota: z.string().optional(),
})

function parseCargoIds(formData: FormData): string[] {
  // Soporta cargo_ids (JSON array) y cargo_id (single, retrocompat).
  const raw = formData.get('cargo_ids')
  if (raw) {
    try {
      const parsed = JSON.parse(raw.toString())
      if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === 'string')
    } catch { /* noop */ }
  }
  const single = formData.get('cargo_id')?.toString()
  return single ? [single] : []
}

export type FormState = {
  errors?: Record<string, string[]>
  message?: string | null
  success?: boolean
}

export async function registrarPagoAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const payload = {
    cargo_ids: parseCargoIds(formData),
    persona_id: formData.get('persona_id')?.toString() || '',
    monto_pago: parseFloat(formData.get('monto_pago')?.toString() || '0'),
    metodo_pago: formData.get('metodo_pago')?.toString() || 'efectivo',
    idempotency_key: formData.get('idempotency_key')?.toString() || '',
    nota: formData.get('nota')?.toString() || undefined,
  }

  const validatedFields = pagoSchema.safeParse(payload)

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Monto inválido o faltan datos requeridos.',
      success: false
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  if (!academiaId) return { message: 'Academia no encontrada', success: false }

  const { error, data } = await (supabase as any).rpc('registrar_pago_atomico_v1', {
    p_academia_id: academiaId,
    p_persona_id: validatedFields.data.persona_id,
    p_cargo_ids: validatedFields.data.cargo_ids,
    p_monto_total: validatedFields.data.monto_pago,
    p_metodo_pago: validatedFields.data.metodo_pago,
    p_idempotency_key: validatedFields.data.idempotency_key,
    p_referencia: validatedFields.data.nota || null,
  })

  if (error) {
    // Manejo de error de constraint unique
    if (error.code === '23505') {
       return { message: 'Este pago ya fue procesado.', success: false }
    }
    return { message: translateRpcError(error), success: false }
  }

  revalidatePath('/inicio')
  revalidatePath(`/seguimiento/${validatedFields.data.persona_id}`)
  return { success: true, message: 'Pago liquidado con éxito.' }
}
