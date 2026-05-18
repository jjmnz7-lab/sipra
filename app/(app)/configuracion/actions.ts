'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { translateRpcError } from '@/lib/utils/rpc-errors'

const ajustesSchema = z.object({
  nombre_academia: z.string().min(2, { message: 'El nombre de la academia es requerido' }),
  nombre_responsable: z.string().min(2, { message: 'El nombre del responsable es requerido' }),
  telefono_recordatorios: z.string().min(8, { message: 'El teléfono es requerido' }),
  nivel_automatizacion: z.enum(['asistido', 'semi-automatico', 'automatico']),
  ventana_cobro_inicio: z.coerce.number().min(1).max(31),
  ventana_cobro_fin: z.coerce.number().min(1).max(31),
  template_recordatorio: z.string().min(10, { message: 'La plantilla debe ser más descriptiva' }),
})

export type FormState = {
  errors?: Record<string, string[]>
  message?: string | null
  success?: boolean
}

export async function guardarAjustesAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const payload = {
    nombre_academia: formData.get('nombre_academia') as string,
    nombre_responsable: formData.get('nombre_responsable') as string,
    telefono_recordatorios: formData.get('telefono_recordatorios') as string,
    nivel_automatizacion: formData.get('nivel_automatizacion') as string,
    ventana_cobro_inicio: formData.get('ventana_cobro_inicio') as string,
    ventana_cobro_fin: formData.get('ventana_cobro_fin') as string,
    template_recordatorio: formData.get('template_recordatorio') as string,
  }

  const validatedFields = ajustesSchema.safeParse(payload)

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Faltan campos por completar o son inválidos.',
      success: false
    }
  }

  const supabase = (await createClient()) as any
  
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  // 1. Actualizar nombre de la academia (en la tabla academia)
  const { error: academiaError } = await supabase
    .from('academia')
    .update({ nombre: validatedFields.data.nombre_academia } as any)
    .eq('id', academiaId)

  if (academiaError) {
    return { message: translateRpcError(academiaError), success: false }
  }

  // 2. Actualizar config_cobro (en la tabla academia)
  // Primero leemos la config actual para no borrar otros campos (como dias_generacion)
  const { data: academiaData } = await supabase
    .from('academia')
    .select('config_cobro')
    .eq('id', academiaId)
    .single() as any

  const currentConfig = academiaData?.config_cobro || {}
  
  const updatedConfig = {
    ...currentConfig,
    nombre_responsable: validatedFields.data.nombre_responsable,
    telefono_recordatorios: validatedFields.data.telefono_recordatorios,
    nivel_automatizacion: validatedFields.data.nivel_automatizacion,
    ventana_cobro_inicio: validatedFields.data.ventana_cobro_inicio,
    ventana_cobro_fin: validatedFields.data.ventana_cobro_fin,
    template_recordatorio: validatedFields.data.template_recordatorio,
  }

  const { error: configError } = await supabase
    .from('academia')
    .update({ config_cobro: updatedConfig } as any)
    .eq('id', academiaId)

  if (configError) {
    return { message: translateRpcError(configError), success: false }
  }

  revalidatePath('/configuracion')
  return { success: true, message: 'Ajustes guardados con éxito.' }
}

export async function guardarConfiguracionRecargosAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  const activo = formData.get('activo') === 'on'
  
  const escalones = []
  for (let i = 1; i <= 5; i++) {
    const dias = formData.get(`dias_${i}`)
    const monto = formData.get(`monto_${i}`)
    if (dias && monto) {
      escalones.push({ nivel: i, dias_retraso: Number(dias), monto: Number(monto) })
    }
  }

  const { error } = await supabase
    .from('academia')
    .update({ config_recargos: { activo, escalones } } as any)
    .eq('id', academiaId)

  if (error) {
    return { message: translateRpcError(error), success: false }
  }

  revalidatePath('/configuracion')
  return { success: true, message: 'Reglas de recargos guardadas con éxito.' }
}

export async function ejecutarMotorRecargosAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  const { data, error } = await supabase.rpc('procesar_recargos_v1', { p_academia_id: academiaId })

  if (error) {
    return { message: translateRpcError(error), success: false }
  }

  revalidatePath('/configuracion')
  return { success: true, message: 'Motor ejecutado con éxito. Se procesaron las deudas.' }
}
