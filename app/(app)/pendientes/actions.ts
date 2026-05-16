'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const cargoSchema = z.object({
  persona_id: z.string().uuid({ message: 'Alumno inválido' }),
  concepto: z.string().min(2, { message: 'El concepto debe tener al menos 2 caracteres' }),
  monto_original: z.number().min(1, { message: 'El monto debe ser mayor a 0' }),
  fecha_vencimiento: z.string().min(10, { message: 'Fecha inválida' }),
})

const pagoSchema = z.object({
  cargo_id: z.string().uuid({ message: 'Cargo inválido' }),
  persona_id: z.string().uuid({ message: 'Alumno inválido' }),
  monto_pago: z.number().min(1, { message: 'El pago debe ser mayor a 0' }),
  metodo_pago: z.string().min(2, { message: 'Método inválido' }),
  idempotency_key: z.string().uuid({ message: 'Key inválida' }),
  referencia: z.string().optional(),
})

export type FormState = {
  errors?: Record<string, string[]>
  message?: string | null
  success?: boolean
}

export async function crearCargoAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const payload = {
    persona_id: formData.get('persona_id') as string,
    concepto: formData.get('concepto') as string,
    monto_original: parseFloat(formData.get('monto_original') as string),
    fecha_vencimiento: formData.get('fecha_vencimiento') as string,
  }

  const validatedFields = cargoSchema.safeParse(payload)

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Revisa los campos del cargo.',
      success: false
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  if (!academiaId) return { message: 'Academia no encontrada', success: false }

  const { error } = await supabase.from('cargo').insert({
    academia_id: academiaId,
    persona_id: validatedFields.data.persona_id,
    concepto: validatedFields.data.concepto,
    monto_original: validatedFields.data.monto_original,
    saldo_pendiente: validatedFields.data.monto_original,
    fecha_vencimiento: validatedFields.data.fecha_vencimiento,
    estado_financiero: 'pendiente', // Por defecto
    origen: 'manual'
  })

  if (error) {
    return { message: error.message, success: false }
  }

  revalidatePath('/pendientes')
  return { success: true, message: 'Cargo registrado exitosamente.' }
}

export async function registrarPagoAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const payload = {
    cargo_id: formData.get('cargo_id') as string,
    persona_id: formData.get('persona_id') as string,
    monto_pago: parseFloat(formData.get('monto_pago') as string),
    metodo_pago: formData.get('metodo_pago') as string,
    idempotency_key: formData.get('idempotency_key') as string,
    referencia: formData.get('referencia') as string,
  }

  const validatedFields = pagoSchema.safeParse(payload)

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Monto inválido o faltan datos.',
      success: false
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  if (!academiaId) return { message: 'Academia no encontrada', success: false }

  const { error, data } = await supabase.rpc('registrar_pago_atomico_v1', {
    p_academia_id: academiaId,
    p_persona_id: validatedFields.data.persona_id,
    p_cargo_ids: [validatedFields.data.cargo_id],
    p_monto_total: validatedFields.data.monto_pago,
    p_metodo_pago: validatedFields.data.metodo_pago,
    p_idempotency_key: validatedFields.data.idempotency_key,
    p_referencia: validatedFields.data.referencia || null,
  })

  if (error) {
    // Manejo de error de constraint unique
    if (error.code === '23505') {
       return { message: 'Este pago ya fue procesado.', success: false }
    }
    return { message: error.message, success: false }
  }

  revalidatePath('/pendientes')
  return { success: true, message: 'Pago liquidado con éxito.' }
}
