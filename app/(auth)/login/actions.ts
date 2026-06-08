'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { redirect } from 'next/navigation'

const loginSchema = z.object({
  email: z.string().email({ message: 'Ingresa un email válido' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
})

export type LoginState = {
  errors?: {
    email?: string[]
    password?: string[]
    general?: string
  }
  message?: string | null
}

export async function loginAction(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const validatedFields = loginSchema.safeParse({ email, password })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Faltan campos por completar.',
    }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: validatedFields.data.email,
    password: validatedFields.data.password,
  })

  if (error) {
    return {
      errors: {
        general: 'Credenciales incorrectas o cuenta no existente.',
      },
      message: 'Error al iniciar sesión.',
    }
  }

  // Si es exitoso, middleware redirigirá a inicio, pero podemos hacerlo explícito aquí.
  redirect('/inicio')
}
