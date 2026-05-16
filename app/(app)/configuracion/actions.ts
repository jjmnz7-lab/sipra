'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type FormState = {
  message?: string | null
  success?: boolean
}

export async function guardarConfiguracionRecargosAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  if (!academiaId) return { message: 'Academia no encontrada', success: false }

  const activo = formData.get('activo') === 'on'
  
  // Extraemos dinámicamente los escalones (dias_1, monto_1, dias_2, monto_2...)
  const escalones = []
  for (let i = 1; i <= 5; i++) {
    const dias = formData.get(`dias_${i}`)
    const monto = formData.get(`monto_${i}`)
    
    if (dias && monto) {
      escalones.push({
        nivel: i,
        dias_retraso: parseInt(dias as string),
        monto: parseFloat(monto as string)
      })
    }
  }

  const newConfig = {
    activo,
    escalones
  }

  const { error } = await (supabase
    .from('academia') as any)
    .update({ config_recargos: newConfig })
    .eq('id', academiaId)

  if (error) {
    return { message: error.message, success: false }
  }

  revalidatePath('/configuracion')
  return { success: true, message: 'Configuración guardada.' }
}

export async function ejecutarMotorRecargosAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  if (!academiaId) return { message: 'Academia no encontrada', success: false }

  const { data, error } = await (supabase as any).rpc('procesar_recargos_v1', {
    p_academia_id: academiaId
  })

  if (error) {
    return { message: error.message, success: false }
  }

  revalidatePath('/configuracion')
  revalidatePath('/pendientes')
  
  const generados = data?.recargos_generados || 0
  
  return { 
    success: true, 
    message: generados > 0 
      ? `Motor ejecutado: ${generados} recargo(s) generado(s).` 
      : 'Motor ejecutado: No hubo recargos nuevos que aplicar.'
  }
}
