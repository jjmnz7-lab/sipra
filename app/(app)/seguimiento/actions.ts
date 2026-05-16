'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const anularSchema = z.object({
  movimiento_id: z.string().uuid({ message: 'Movimiento inválido' }),
  motivo: z.string().min(5, { message: 'El motivo debe tener al menos 5 caracteres' }),
})

export type FormState = {
  errors?: Record<string, string[]>
  message?: string | null
  success?: boolean
}

export async function anularPagoAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const payload = {
    movimiento_id: formData.get('movimiento_id') as string,
    motivo: formData.get('motivo') as string,
  }

  const validatedFields = anularSchema.safeParse(payload)

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Revisa los campos requeridos.',
      success: false
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  if (!academiaId) return { message: 'Academia no encontrada', success: false }

  const { error } = await (supabase as any).rpc('revertir_pago_atomico_v1', {
    p_academia_id: academiaId,
    p_movimiento_id: validatedFields.data.movimiento_id,
    p_motivo: validatedFields.data.motivo
  })

  if (error) {
    return { message: error.message, success: false }
  }

  // Refrescar vistas
  revalidatePath('/seguimiento/[persona_id]', 'page')
  revalidatePath('/pendientes')

  return { success: true, message: 'Pago anulado exitosamente.' }
}
