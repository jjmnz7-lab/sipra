'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { translateRpcError } from '@/lib/utils/rpc-errors'

const anularSchema = z.object({
  movimiento_id: z.string().uuid({ message: 'Movimiento inválido' }),
  motivo: z.string().min(5, { message: 'El motivo debe tener al menos 5 caracteres' }),
})

const notaSchema = z.object({
  persona_id: z.string().uuid({ message: 'Persona inválida' }),
  contenido: z.string().min(3, { message: 'La nota debe tener al menos 3 caracteres' }),
})

const promesaSchema = z.object({
  persona_id: z.string().uuid({ message: 'Persona inválida' }),
  fecha_promesa: z.string().refine(val => !isNaN(Date.parse(val)), { message: 'Fecha inválida' }),
  comentario: z.string().min(3, { message: 'El comentario debe tener al menos 3 caracteres' }),
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
    return { message: translateRpcError(error), success: false }
  }

  // Refrescar vistas
  revalidatePath('/seguimiento/[persona_id]', 'page')
  revalidatePath('/pendientes')

  return { success: true, message: 'Pago anulado exitosamente.' }
}

export async function crearNotaAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const payload = {
    persona_id: formData.get('persona_id') as string,
    contenido: formData.get('contenido') as string,
  }

  const validatedFields = notaSchema.safeParse(payload)

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

  // Obtener nombre del usuario para el actor_nombre
  const { data: userData } = await supabase
    .from('usuario')
    .select('nombre, apellido')
    .eq('id', user.id)
    .single()

  const actorNombre = userData ? `${(userData as { nombre: string; apellido: string | null }).nombre} ${(userData as { nombre: string; apellido: string | null }).apellido ?? ''}` : 'Operador'

  const { error } = await (supabase as any)
    .from('evento_timeline')
    .insert({
      academia_id: academiaId,
      persona_id: validatedFields.data.persona_id,
      tipo: 'nota',
      titulo: 'Nota de seguimiento',
      descripcion: validatedFields.data.contenido,
      actor_nombre: actorNombre,
      created_by: user.id
    })

  if (error) {
    return { message: error.message, success: false }
  }

  revalidatePath('/seguimiento/[persona_id]', 'page')

  return { success: true, message: 'Nota guardada exitosamente.' }
}

export async function crearPromesaAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const payload = {
    persona_id: formData.get('persona_id') as string,
    fecha_promesa: formData.get('fecha_promesa') as string,
    comentario: formData.get('comentario') as string,
  }

  const validatedFields = promesaSchema.safeParse(payload)

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

  const { data: userData } = await supabase
    .from('usuario')
    .select('nombre, apellido')
    .eq('id', user.id)
    .single()

  const actorNombre = userData ? `${(userData as { nombre: string; apellido: string | null }).nombre} ${(userData as { nombre: string; apellido: string | null }).apellido ?? ''}` : 'Operador'

  const { error } = await (supabase as any)
    .from('evento_timeline')
    .insert({
      academia_id: academiaId,
      persona_id: validatedFields.data.persona_id,
      tipo: 'promesa_pago',
      titulo: 'Promesa de pago',
      descripcion: `Prometió pagar el ${new Date(validatedFields.data.fecha_promesa).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}. ${validatedFields.data.comentario}`,
      metadata: {
        fecha_promesa: validatedFields.data.fecha_promesa,
        comentario: validatedFields.data.comentario
      },
      actor_nombre: actorNombre,
      created_by: user.id
    })

  if (error) {
    return { message: error.message, success: false }
  }

  revalidatePath('/seguimiento/[persona_id]', 'page')

  return { success: true, message: 'Promesa guardada exitosamente.' }
}
