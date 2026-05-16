'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type FormState = {
  message?: string | null
  success?: boolean
}

export async function ejecutarMotorRecordatoriosAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  if (!academiaId) return { message: 'Academia no encontrada', success: false }

  const { data, error } = await supabase.rpc('generar_recordatorios_v1', {
    p_academia_id: academiaId
  })

  if (error) {
    return { message: error.message, success: false }
  }

  revalidatePath('/recordatorios')
  
  const generados = data?.envios_generados || 0
  
  return { 
    success: true, 
    message: generados > 0 
      ? `Motor ejecutado: ${generados} recordatorio(s) nuevo(s) en la bandeja.` 
      : 'Motor ejecutado: No hay recordatorios nuevos que generar.'
  }
}

export async function procesarEnvioAction(formData: FormData) {
  const envioId = formData.get('envio_id') as string
  const accion = formData.get('accion') as string // 'enviar' o 'ignorar'
  
  if (!envioId || !accion) return

  const supabase = await createClient()
  
  const nuevoEstado = accion === 'enviar' ? 'enviado' : 'ignorado'

  await supabase
    .from('envio_sugerido')
    .update({ 
      estado: nuevoEstado,
      fecha_procesado: new Date().toISOString()
    })
    .eq('id', envioId)

  // Opcional: registrar en el timeline que se envió un recordatorio
  // (Para simplificar, asumimos que solo marcar como enviado en el outbox es suficiente).

  revalidatePath('/recordatorios')
}
