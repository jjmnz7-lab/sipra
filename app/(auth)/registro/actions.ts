'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { redirect } from 'next/navigation'

const registroSchema = z.object({
  nombreOwner: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }),
  apellidoOwner: z.string().optional(),
  nombreAcademia: z.string().min(3, { message: 'El nombre de la academia debe tener al menos 3 caracteres' }),
  email: z.string().email({ message: 'Ingresa un email válido' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
})

export type RegistroState = {
  errors?: {
    nombreOwner?: string[]
    apellidoOwner?: string[]
    nombreAcademia?: string[]
    email?: string[]
    password?: string[]
    general?: string
  }
  message?: string | null
}

export async function registroAction(prevState: RegistroState, formData: FormData): Promise<RegistroState> {
  const payload = {
    nombreOwner: formData.get('nombreOwner') as string,
    apellidoOwner: formData.get('apellidoOwner') as string,
    nombreAcademia: formData.get('nombreAcademia') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const validatedFields = registroSchema.safeParse(payload)

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Faltan campos por completar o son inválidos.',
    }
  }

  const supabase = await createClient()

  // 1. Crear el usuario en auth.users
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: validatedFields.data.email,
    password: validatedFields.data.password,
  })

  if (authError) {
    return {
      errors: {
        general: authError.message,
      },
      message: 'Error al registrar el usuario.',
    }
  }

  if (!authData.user) {
    return {
      errors: { general: 'No se pudo crear el usuario.' },
    }
  }

  // 2. Llamar a la RPC transaccional para crear academia y ligar usuario
  const { error: rpcError } = await (supabase as any).rpc('registrar_owner_v1', {
    p_nombre_academia: validatedFields.data.nombreAcademia,
    p_nombre_owner: validatedFields.data.nombreOwner,
    p_apellido_owner: validatedFields.data.apellidoOwner || null,
  })

  if (rpcError) {
    // Idealmente, aquí deberíamos hacer rollback de auth.users si falla,
    // pero Supabase no soporta eliminar auth.users fácilmente desde el cliente.
    // Una opción es que el usuario intente loguearse y complete el perfil, 
    // pero por simplicidad de V1, asumimos que no fallará si los datos son válidos.
    return {
      errors: {
        general: `Error al configurar la academia: ${rpcError.message}`,
      },
    }
  }

  // 3. Forzar refresco de sesión para que el JWT obtenga los nuevos claims (academia_id y rol)
  await supabase.auth.refreshSession()

  // 4. Redirigir al panel principal
  redirect('/pendientes')
}
