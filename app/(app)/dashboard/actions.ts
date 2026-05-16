'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

export type FormState = {
  errors?: Record<string, string[]>
  message?: string | null
  success?: boolean
  data?: { cargos_creados?: number; omitidos_duplicado?: number }
}

const generarSchema = z.object({
  concepto: z.string().min(3, { message: 'El concepto necesita al menos 3 caracteres' }),
  monto: z.coerce.number().positive({ message: 'El monto debe ser mayor a 0' }),
  fecha_vencimiento: z.string().min(1, { message: 'La fecha de vencimiento es requerida' }),
})

export async function generarMensualidadesAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const payload = {
    concepto: formData.get('concepto') as string,
    monto: formData.get('monto') as string,
    fecha_vencimiento: formData.get('fecha_vencimiento') as string,
  }

  const validated = generarSchema.safeParse(payload)

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: 'Revisa los campos requeridos.',
      success: false,
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  if (!academiaId) return { message: 'Academia no encontrada.', success: false }

  const { data, error } = await (supabase as any).rpc('generar_cargos_masivos_v1', {
    p_academia_id: academiaId,
    p_concepto: validated.data.concepto,
    p_monto: validated.data.monto,
    p_fecha_vencimiento: validated.data.fecha_vencimiento,
  })

  if (error) {
    const msg = error.message.includes('FECHA_VENCIMIENTO_PASADA')
      ? 'La fecha de vencimiento no puede ser en el pasado.'
      : error.message.includes('MONTO_INVALIDO')
      ? 'El monto debe ser mayor a cero.'
      : error.message
    return { message: msg, success: false }
  }

  revalidatePath('/dashboard')
  revalidatePath('/pendientes')

  return {
    success: true,
    message: `¡Listo! Se generaron ${(data as any)?.cargos_creados || 0} cargos.`,
    data: {
      cargos_creados: (data as any)?.cargos_creados,
      omitidos_duplicado: (data as any)?.omitidos_duplicado,
    },
  }
}
