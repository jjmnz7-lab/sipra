'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { translateRpcError } from '@/lib/utils/rpc-errors'

/* -------------------------------------------------------------------------- */
/* Tipos compartidos                                                          */
/* -------------------------------------------------------------------------- */

export type FormState = {
  errors?: Record<string, string[]>
  message?: string | null
  success?: boolean
}

/* -------------------------------------------------------------------------- */
/* Schemas Zod                                                                */
/* -------------------------------------------------------------------------- */

const miAcademiaSchema = z.object({
  nombre_academia: z.string().min(2, { message: 'El nombre de la academia es requerido' }),
})

const planCobroSchema = z.object({
  nombre: z.string().min(2, { message: 'El nombre del plan es muy corto' }),
  monto: z.coerce.number().nonnegative({ message: 'El monto no puede ser negativo' }),
  frecuencia: z.enum(['mensual', 'semanal', 'por_visita', 'pago_unico']).default('mensual'),
})

const reglaDiasSchema = z.object({
  dia_inicio: z.number().int().min(1).max(31),
  dia_fin: z.union([z.number().int().min(1).max(31), z.literal('fin_mes')]),
  accion: z.enum(['completo', 'proporcional', 'no_cobrar']),
})

const cobroConfigSchema = z
  .object({
    regimen_alta: z.enum(['completo', 'proporcional', 'no_cobrar', 'reglas_dias']),
    proporcional_redondeo: z.enum(['ninguno', '1', '5', '10', '50', '100']).default('ninguno'),
    reglas_dias: z.array(reglaDiasSchema).min(2).max(3),
  })
  .superRefine((data, ctx) => {
    const r = data.reglas_dias
    if (r[0].dia_inicio !== 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La primera regla debe iniciar el día 1' })
    }
    if (r[r.length - 1].dia_fin !== 'fin_mes') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La última regla debe terminar en "fin_mes"' })
    }
    for (let i = 1; i < r.length; i++) {
      const prevFin = r[i - 1].dia_fin === 'fin_mes' ? 28 : (r[i - 1].dia_fin as number)
      if (r[i].dia_inicio !== prevFin + 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `La regla ${i + 1} no encadena con la anterior`,
        })
      }
    }
  })

const reglaRecargoSchema = z.object({
  dia: z.number().int().min(1).max(31),
  tipo: z.enum(['porcentaje', 'monto_fijo']),
  valor: z.number().min(0).max(100000),
})

const recargosConfigSchema = z
  .object({
    marcar_critico: z.object({
      activo: z.boolean(),
      dia_umbral: z.number().int().min(6).max(25),
    }),
    aplicar_recargos: z.boolean(),
    reglas: z.array(reglaRecargoSchema).max(2),
  })
  .superRefine((data, ctx) => {
    if (data.reglas.length === 2 && data.reglas[1].dia <= data.reglas[0].dia) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La 2da regla debe aplicar después de la 1ra (día mayor).',
      })
    }
    data.reglas.forEach((r, i) => {
      if (r.tipo === 'porcentaje' && r.valor > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Regla ${i + 1}: el porcentaje no puede exceder 100.`,
        })
      }
    })
  })

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

async function getAcademiaId() {
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id as string | undefined
  return { supabase, academiaId }
}

/* -------------------------------------------------------------------------- */
/* 1. Mi Academia — guarda sólo el nombre                                     */
/* -------------------------------------------------------------------------- */

export async function guardarMiAcademiaAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const payload = { nombre_academia: (formData.get('nombre_academia') as string) || '' }
  const parsed = miAcademiaSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'El nombre de la academia es inválido.',
      success: false,
    }
  }

  const { supabase, academiaId } = await getAcademiaId()
  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  const { error } = await supabase
    .from('academia')
    .update({ nombre: parsed.data.nombre_academia } as any)
    .eq('id', academiaId)

  if (error) return { message: translateRpcError(error), success: false }

  revalidatePath('/configuracion')
  return { success: true, message: 'Nombre actualizado.' }
}

/* -------------------------------------------------------------------------- */
/* 2. Cobranza — guarda config_cobro                                          */
/* -------------------------------------------------------------------------- */

export async function guardarCobranzaAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = (formData.get('config_cobro_json') as string) || ''
  if (!raw) return { message: 'La configuración de cobranza es inválida.', success: false }

  let parsedCobro: z.infer<typeof cobroConfigSchema>
  try {
    const obj = JSON.parse(raw)
    const result = cobroConfigSchema.safeParse(obj)
    if (!result.success) {
      return { message: 'La configuración de cobranza es inválida.', success: false }
    }
    parsedCobro = result.data
  } catch {
    return { message: 'La configuración de cobranza no se pudo leer.', success: false }
  }

  const { supabase, academiaId } = await getAcademiaId()
  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  // Merge sobre la config existente para no pisar claves legacy
  // (cobra_inscripcion, dias_generacion, horas_minimas_recordatorio, etc.).
  const { data: academiaData } = await supabase
    .from('academia')
    .select('config_cobro')
    .eq('id', academiaId)
    .single() as any

  const currentConfig = academiaData?.config_cobro || {}
  const updatedConfig = {
    ...currentConfig,
    regimen_alta: parsedCobro.regimen_alta,
    proporcional_redondeo: parsedCobro.proporcional_redondeo,
    reglas_dias: parsedCobro.reglas_dias,
    modo_prorrateo: parsedCobro.regimen_alta === 'completo' ? 'completo' : 'proporcional',
  }

  const { error } = await supabase
    .from('academia')
    .update({ config_cobro: updatedConfig } as any)
    .eq('id', academiaId)

  if (error) return { message: translateRpcError(error), success: false }

  revalidatePath('/configuracion')
  return { success: true, message: 'Cobranza guardada.' }
}

/* -------------------------------------------------------------------------- */
/* 3. Pagos atrasados — guarda config_recargos                                */
/* -------------------------------------------------------------------------- */

export async function guardarPagosAtrasadosAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = (formData.get('config_recargos_json') as string) || ''
  if (!raw) return { message: 'La configuración de pagos atrasados es inválida.', success: false }

  let parsed: z.infer<typeof recargosConfigSchema>
  try {
    const obj = JSON.parse(raw)
    const result = recargosConfigSchema.safeParse(obj)
    if (!result.success) {
      return { message: 'La configuración de pagos atrasados es inválida.', success: false }
    }
    parsed = result.data
  } catch {
    return { message: 'La configuración de pagos atrasados no se pudo leer.', success: false }
  }

  const { supabase, academiaId } = await getAcademiaId()
  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  // Mantener compatibilidad con claves legacy (`activo`, `escalones`):
  // ya no las escribimos, pero las preservamos por si quedan en la BD para
  // alguna academia migrada parcialmente.
  const { data: academiaData } = await supabase
    .from('academia')
    .select('config_recargos')
    .eq('id', academiaId)
    .single() as any

  const currentConfig = academiaData?.config_recargos || {}
  const updatedConfig = {
    ...currentConfig,
    marcar_critico: parsed.marcar_critico,
    aplicar_recargos: parsed.aplicar_recargos,
    reglas: parsed.reglas,
  }

  const { error } = await supabase
    .from('academia')
    .update({ config_recargos: updatedConfig } as any)
    .eq('id', academiaId)

  if (error) return { message: translateRpcError(error), success: false }

  revalidatePath('/configuracion')
  return { success: true, message: 'Pagos atrasados guardados.' }
}

/* -------------------------------------------------------------------------- */
/* Logo (sin dirty: guarda al instante)                                       */
/* -------------------------------------------------------------------------- */

export async function guardarLogoAction(logoUrl: string | null): Promise<FormState> {
  const { supabase, academiaId } = await getAcademiaId()
  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  const { data: academiaData } = await supabase
    .from('academia')
    .select('metadata')
    .eq('id', academiaId)
    .single() as any

  const currentMetadata = academiaData?.metadata || {}

  const { error } = await supabase
    .from('academia')
    .update({ metadata: { ...currentMetadata, logo_url: logoUrl || null } } as any)
    .eq('id', academiaId)

  if (error) return { message: translateRpcError(error), success: false }

  revalidatePath('/', 'layout')
  return { success: true, message: logoUrl ? 'Logo actualizado.' : 'Logo eliminado.' }
}

/* -------------------------------------------------------------------------- */
/* Planes de cobro — catálogo de tarifas recurrentes                          */
/* -------------------------------------------------------------------------- */

export async function crearPlanCobroAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const payload = {
    nombre: formData.get('nombre') as string,
    monto: formData.get('monto'),
    frecuencia: (formData.get('frecuencia') as string) || 'mensual',
  }

  const parsed = planCobroSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Revisa los datos del plan.',
      success: false,
    }
  }

  const { supabase, academiaId } = await getAcademiaId()
  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  const { error } = await supabase.from('planes_cobro').insert({
    academia_id: academiaId,
    nombre: parsed.data.nombre,
    monto: parsed.data.monto,
    frecuencia: parsed.data.frecuencia,
  } as any)

  if (error) return { message: translateRpcError(error), success: false }

  revalidatePath('/configuracion')
  revalidatePath('/grupos')
  revalidatePath('/alumnos')
  return { success: true, message: 'Plan de cobro creado.' }
}

/**
 * Archiva un plan (soft-delete) protegiendo el Ledger. Si se pasa
 * `planIdDestino`, migra en lote a los alumnos del plan viejo al nuevo; si no,
 * rompe las relaciones dejando huérfanos (el cron deja de generarles cargos).
 */
export async function archivarPlanCobroAction(
  planId: string,
  planIdDestino?: string | null,
): Promise<FormState> {
  if (!planId) return { message: 'Plan inválido.', success: false }

  const { supabase, academiaId } = await getAcademiaId()
  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  const { error } = await (supabase as any).rpc('archivar_plan_v1', {
    p_academia_id: academiaId,
    p_plan_id: planId,
    p_plan_id_destino: planIdDestino ?? null,
  })

  if (error) return { message: translateRpcError(error), success: false }

  revalidatePath('/configuracion')
  revalidatePath('/grupos')
  revalidatePath('/alumnos')
  return {
    success: true,
    message: planIdDestino ? 'Plan archivado y alumnos migrados.' : 'Plan archivado.',
  }
}

/** Compat: el botón actual de la UI ahora archiva (soft-delete) en vez de borrar. */
export async function eliminarPlanCobroAction(planId: string): Promise<FormState> {
  return archivarPlanCobroAction(planId, null)
}



/**
 * Crea o edita un plan de cobro mensual (concepto + monto). Los planes que se
 * crean/editan aquí son siempre de recurrencia mensual. Editar el monto NO afecta
 * cargos históricos: cada cargo guarda su propio `monto_original`.
 */
const planEditSchema = z.object({
  nombre: z.string().trim().min(2, { message: 'El nombre del plan es muy corto' }),
  monto: z.coerce.number().nonnegative({ message: 'El monto no puede ser negativo' }),
})

export async function guardarPlanCobroAction(input: {
  id?: string | null
  nombre: string
  monto: number
}): Promise<FormState> {
  const parsed = planEditSchema.safeParse({ nombre: input.nombre, monto: input.monto })
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Revisa los datos del plan.', success: false }
  }

  const { supabase, academiaId } = await getAcademiaId()
  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  if (input.id) {
    const { error } = await supabase
      .from('planes_cobro')
      .update({ nombre: parsed.data.nombre, monto: parsed.data.monto } as any)
      .eq('id', input.id)
      .eq('academia_id', academiaId)
    if (error) return { message: translateRpcError(error), success: false }
  } else {
    const { error } = await supabase.from('planes_cobro').insert({
      academia_id: academiaId,
      nombre: parsed.data.nombre,
      monto: parsed.data.monto,
      frecuencia: 'mensual',
    } as any)
    if (error) return { message: translateRpcError(error), success: false }
  }

  revalidatePath('/configuracion')
  revalidatePath('/grupos')
  revalidatePath('/alumnos')
  return { success: true, message: input.id ? 'Plan actualizado.' : 'Plan creado.' }
}

/**
 * Elimina DEFINITIVAMENTE un plan de cobro. Solo permitido cuando no hay ningún
 * alumno (activo o inactivo) vinculado al plan en `alumno_planes`. El ledger de
 * cargos no referencia al plan, por lo que el historial no se ve afectado.
 */
export async function eliminarPlanDefinitivoAction(planId: string): Promise<FormState> {
  if (!planId) return { message: 'Plan inválido.', success: false }

  const { supabase, academiaId } = await getAcademiaId()
  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  const { count, error: countError } = await supabase
    .from('persona')
    .select('id', { count: 'exact', head: true })
    .eq('academia_id', academiaId)
    .eq('plan_cobro_id', planId)
  if (countError) return { message: translateRpcError(countError), success: false }
  if ((count ?? 0) > 0) {
    return { message: 'No se puede eliminar: el plan tiene alumnos relacionados. Archívalo en su lugar.', success: false }
  }

  const { error } = await supabase
    .from('planes_cobro')
    .delete()
    .eq('id', planId)
    .eq('academia_id', academiaId)
  if (error) return { message: translateRpcError(error), success: false }

  revalidatePath('/configuracion')
  revalidatePath('/grupos')
  revalidatePath('/alumnos')
  return { success: true, message: 'Plan eliminado.' }
}

/* -------------------------------------------------------------------------- */
/* Meses de cobro — config_cobro.meses_sin_cobro (1..12 que NO generan cargo)  */
/* -------------------------------------------------------------------------- */

const mesesSinCobroSchema = z.array(z.number().int().min(1).max(12)).max(12)

export async function guardarMesesCobroAction(meses: number[]): Promise<FormState> {
  const parsed = mesesSinCobroSchema.safeParse(meses)
  if (!parsed.success) return { message: 'Selección de meses inválida.', success: false }
  const unicos = Array.from(new Set(parsed.data)).sort((a, b) => a - b)

  const { supabase, academiaId } = await getAcademiaId()
  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  const { data: academiaData } = await supabase
    .from('academia')
    .select('config_cobro')
    .eq('id', academiaId)
    .single() as any

  const currentConfig = academiaData?.config_cobro || {}
  const updatedConfig = { ...currentConfig, meses_sin_cobro: unicos }

  const { error } = await supabase
    .from('academia')
    .update({ config_cobro: updatedConfig } as any)
    .eq('id', academiaId)
  if (error) return { message: translateRpcError(error), success: false }

  revalidatePath('/configuracion')
  return { success: true, message: 'Meses de cobro guardados.' }
}

/* -------------------------------------------------------------------------- */
/* Políticas de cobro — allow_partial_payments + allow_overpayment             */
/* -------------------------------------------------------------------------- */

export async function guardarPoliticasCobroAction(input: {
  allowPartial: boolean
  allowOverpayment: boolean
}): Promise<FormState> {
  const { supabase, academiaId } = await getAcademiaId()
  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  const { error } = await supabase
    .from('academia')
    .update({
      allow_partial_payments: !!input.allowPartial,
      allow_overpayment: !!input.allowOverpayment,
    } as any)
    .eq('id', academiaId)
  if (error) return { message: translateRpcError(error), success: false }

  revalidatePath('/configuracion')
  revalidatePath('/inicio')
  return { success: true, message: 'Políticas de cobro guardadas.' }
}

/* -------------------------------------------------------------------------- */
/* Catálogo de Cobros Frecuentes                                               */
/* -------------------------------------------------------------------------- */

const cobroFrecuenteSchema = z.object({
  concepto: z.string().trim().min(2, { message: 'El concepto es muy corto' }),
  monto: z.coerce.number().nonnegative({ message: 'El monto no puede ser negativo' }),
})

export async function guardarCobroFrecuenteAction(input: {
  id?: string | null
  concepto: string
  monto: number
}): Promise<FormState> {
  const parsed = cobroFrecuenteSchema.safeParse({ concepto: input.concepto, monto: input.monto })
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Revisa los datos del cobro.', success: false }
  }

  const { supabase, academiaId } = await getAcademiaId()
  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  if (input.id) {
    const { error } = await supabase
      .from('cobros_frecuentes')
      .update({ concepto: parsed.data.concepto, monto: parsed.data.monto } as any)
      .eq('id', input.id)
      .eq('academia_id', academiaId)
    if (error) return { message: translateRpcError(error), success: false }
  } else {
    const { error } = await supabase.from('cobros_frecuentes').insert({
      academia_id: academiaId,
      concepto: parsed.data.concepto,
      monto: parsed.data.monto,
    } as any)
    if (error) return { message: translateRpcError(error), success: false }
  }

  revalidatePath('/configuracion')
  return { success: true, message: input.id ? 'Cobro frecuente actualizado.' : 'Cobro frecuente creado.' }
}

/** Archiva (soft-delete) un cobro frecuente: deja de estar disponible pero
 *  permanece en BD para los historiales. */
export async function archivarCobroFrecuenteAction(id: string): Promise<FormState> {
  if (!id) return { message: 'Cobro inválido.', success: false }
  const { supabase, academiaId } = await getAcademiaId()
  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  const { error } = await supabase
    .from('cobros_frecuentes')
    .update({ activo: false } as any)
    .eq('id', id)
    .eq('academia_id', academiaId)
  if (error) return { message: translateRpcError(error), success: false }

  revalidatePath('/configuracion')
  return { success: true, message: 'Cobro frecuente archivado.' }
}

/** Elimina DEFINITIVAMENTE un cobro frecuente. Solo cuando no tiene registros
 *  de movimientos relacionados (cargos generados a partir de él). */
export async function eliminarCobroFrecuenteAction(id: string): Promise<FormState> {
  if (!id) return { message: 'Cobro inválido.', success: false }
  const { supabase, academiaId } = await getAcademiaId()
  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  const { count, error: countError } = await supabase
    .from('cargo')
    .select('id', { count: 'exact', head: true })
    .eq('academia_id', academiaId)
    .eq('metadata->>cobro_frecuente_id', id)
  if (countError) return { message: translateRpcError(countError), success: false }
  if ((count ?? 0) > 0) {
    return { message: 'No se puede eliminar: este cobro ya tiene registros. Archívalo en su lugar.', success: false }
  }

  const { error } = await supabase
    .from('cobros_frecuentes')
    .delete()
    .eq('id', id)
    .eq('academia_id', academiaId)
  if (error) return { message: translateRpcError(error), success: false }

  revalidatePath('/configuracion')
  return { success: true, message: 'Cobro frecuente eliminado.' }
}

/* -------------------------------------------------------------------------- */
/* Logout                                                                     */
/* -------------------------------------------------------------------------- */

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
