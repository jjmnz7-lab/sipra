'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { translateRpcError } from '@/lib/utils/rpc-errors'

const grupoSchema = z.object({
  nombre: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }),
  descripcion: z.string().optional(),
})

const personaSchema = z.object({
  nombre: z.string().min(2, { message: 'El nombre es requerido' }),
  apellido: z.string().optional(),
  telefono_whatsapp: z.string().optional(),
  email: z.string().email({ message: 'Email inválido' }).optional().or(z.literal('')),
  grupo_id: z.string().optional(),
})

export type FormState = {
  errors?: Record<string, string[]>
  message?: string | null
  success?: boolean
}

export async function crearGrupoAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const payload = {
    nombre: formData.get('nombre') as string,
    descripcion: formData.get('descripcion') as string,
  }

  const validatedFields = grupoSchema.safeParse(payload)

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Faltan campos por completar o son inválidos.',
      success: false
    }
  }

  const supabase = await createClient()
  
  // Extraer tenant
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  const { error } = await supabase.from('grupo').insert({
    academia_id: academiaId,
    nombre: validatedFields.data.nombre,
    descripcion: validatedFields.data.descripcion || null,
  } as any)

  if (error) {
    return { message: translateRpcError(error), success: false }
  }

  revalidatePath('/grupos')
  return { success: true, message: 'Grupo creado con éxito.' }
}

export async function crearPersonaAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const payload = {
    nombre: formData.get('nombre') as string,
    apellido: formData.get('apellido') as string,
    telefono_whatsapp: formData.get('telefono_whatsapp') as string,
    email: formData.get('email') as string,
    grupo_id: formData.get('grupo_id') as string,
  }

  const validatedFields = personaSchema.safeParse(payload)

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Faltan campos por completar o son inválidos.',
      success: false
    }
  }

  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  // 1. Insertar persona
  const { data: personaData, error: personaError } = await supabase.from('persona').insert({
    academia_id: academiaId,
    nombre: validatedFields.data.nombre,
    apellido: validatedFields.data.apellido || null,
    telefono_whatsapp: validatedFields.data.telefono_whatsapp || null,
    email: validatedFields.data.email || null,
  } as any).select('id').single() as any

  if (personaError || !personaData) {
    return { message: personaError ? translateRpcError(personaError) : 'Error al crear persona', success: false }
  }

  // 2. Si hay un grupo, inscribirlo atómicamente
  if (validatedFields.data.grupo_id && validatedFields.data.grupo_id !== 'none') {
    const { error: pgError } = await supabase.from('persona_grupo').insert({
      academia_id: academiaId,
      persona_id: personaData.id,
      grupo_id: validatedFields.data.grupo_id,
    } as any)

    if (pgError) {
       return { message: 'Alumno creado, pero hubo error al inscribirlo al grupo: ' + pgError.message, success: false }
    }
  }

  revalidatePath('/grupos')
  return { success: true, message: 'Alumno creado con éxito.' }
}
