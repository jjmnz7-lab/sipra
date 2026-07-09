'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const onboardingSchema = z.object({
  // Cuenta
  nombreOwner: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }),
  apellidoOwner: z.string().optional(),
  email: z.string().email({ message: 'Ingresa un email válido' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
  // Paso 0 — academia
  nombreAcademia: z.string().min(3, { message: 'El nombre de la academia debe tener al menos 3 caracteres' }),
  telefono: z.string().optional(),
  // Paso 1 — plan
  planNombre: z.string().default('Mensualidad Regular'),
  planMonto: z.coerce.number().nonnegative({ message: 'El monto no puede ser negativo' }).default(300),
  mesesSinCobro: z.string().default('[]'),
  // Paso 2 — recargos y excepciones
  criticoActivo: z.coerce.boolean().default(false),
  criticoDia: z.coerce.number().int().min(6).max(25).default(10),
  regimenAlta: z.enum(['completo', 'proporcional', 'no_cobrar']).default('completo'),
  // Paso 3 — políticas
  allowPartial: z.coerce.boolean().default(true),
  allowOverpayment: z.coerce.boolean().default(true),
})

export type RegistroState = {
  errors?: {
    nombreOwner?: string[]
    apellidoOwner?: string[]
    nombreAcademia?: string[]
    email?: string[]
    password?: string[]
    telefono?: string[]
    planNombre?: string[]
    planMonto?: string[]
    mesesSinCobro?: string[]
    criticoActivo?: string[]
    criticoDia?: string[]
    regimenAlta?: string[]
    allowPartial?: string[]
    allowOverpayment?: string[]
    general?: string
  }
  message?: string | null
  success?: boolean
  academiaId?: string
}

export async function registroAction(prevState: RegistroState, formData: FormData): Promise<RegistroState> {
  const payload = {
    nombreOwner: (formData.get('nombreOwner') as string) || '',
    apellidoOwner: (formData.get('apellidoOwner') as string) || '',
    email: (formData.get('email') as string) || '',
    password: (formData.get('password') as string) || '',
    nombreAcademia: (formData.get('nombreAcademia') as string) || '',
    telefono: (formData.get('telefono') as string) || '',
    planNombre: (formData.get('planNombre') as string) || 'Mensualidad Regular',
    planMonto: formData.get('planMonto') ? Number(formData.get('planMonto')) : 300,
    mesesSinCobro: (formData.get('mesesSinCobro') as string) || '[]',
    criticoActivo: formData.get('criticoActivo') === 'true',
    criticoDia: formData.get('criticoDia') ? Number(formData.get('criticoDia')) : 10,
    regimenAlta: (formData.get('regimenAlta') as string) || 'completo',
    allowPartial: formData.get('allowPartial') === 'true',
    allowOverpayment: formData.get('allowOverpayment') === 'true',
  }

  const validatedFields = onboardingSchema.safeParse(payload)

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Faltan campos por completar o son inválidos.',
      success: false,
    }
  }

  const data = validatedFields.data
  const supabase = await createClient()

  // 1. Crear el usuario en auth.users
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  })

  if (authError) {
    return { errors: { general: authError.message }, message: 'Error al registrar el usuario.', success: false }
  }
  if (!authData.user) {
    return { errors: { general: 'No se pudo crear el usuario.' }, success: false }
  }

  // 2. RPC transaccional registrar_owner_v3
  const { data: rpcData, error: rpcError } = await (supabase as any).rpc('registrar_owner_v3', {
    p_nombre_academia: data.nombreAcademia,
    p_nombre_owner: data.nombreOwner,
    p_apellido_owner: data.apellidoOwner || null,
    p_telefono: data.telefono || null,
    p_plan_nombre: data.planNombre || 'Mensualidad Regular',
    p_plan_monto: data.planMonto,
    p_meses_sin_cobro: JSON.parse(data.mesesSinCobro),
    p_critico_activo: data.criticoActivo,
    p_critico_dia: data.criticoDia,
    p_regimen_alta: data.regimenAlta,
    p_allow_partial: data.allowPartial,
    p_allow_overpayment: data.allowOverpayment,
  })

  if (rpcError) {
    return { errors: { general: `Error al configurar la academia: ${rpcError.message}` }, success: false }
  }

  // 3. Refrescar sesión para que el JWT obtenga los claims (academia_id, rol).
  await supabase.auth.refreshSession()

  // 4. Devolver éxito
  return {
    success: true,
    academiaId: rpcData?.academia_id as string | undefined,
  }
}
