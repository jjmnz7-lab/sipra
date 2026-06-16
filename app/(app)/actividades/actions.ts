'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { translateRpcError } from '@/lib/utils/rpc-errors'
import { alumnoSuspendido, MSG_ALUMNO_SUSPENDIDO } from '@/lib/utils/guards'
import { calcularEstadoActividad } from '@/lib/utils/actividad-estado'

const HHMM_REGEX = /^\d{2}:\d{2}$/

const actividadSchema = z.object({
  nombre: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }),
  emoji: z.string().min(1, { message: 'Selecciona un emoji para la actividad' }),
  fecha_inicio: z.string().min(1, { message: 'La fecha de inicio es requerida' }),
  fecha_fin: z.string().min(1, { message: 'La fecha de fin es requerida' }),
  costo_actividad: z.coerce.number().nonnegative({ message: 'El costo debe ser 0 o mayor' }),
  /** Días de la semana 0..6 (0=Dom). Vacío permitido. */
  dias_semana: z.array(z.number().int().min(0).max(6)).default([]),
  /** HH:MM (opcional). */
  hora_inicio: z.string().regex(HHMM_REGEX).optional().or(z.literal('').transform(() => undefined)),
  hora_fin: z.string().regex(HHMM_REGEX).optional().or(z.literal('').transform(() => undefined)),
  cupo_maximo: z.number().int().min(1).max(999).optional().nullable(),
}).refine((data) => !data.hora_fin || (data.hora_inicio && data.hora_fin > data.hora_inicio), {
  message: 'La hora de fin debe ser mayor que la de inicio.',
  path: ['hora_fin'],
})

const editarActividadSchema = z.object({
  actividad_id: z.string().uuid({ message: 'Actividad inválida' }),
  nombre: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }),
  emoji: z.string().min(1, { message: 'Selecciona un emoji para la actividad' }),
  fecha_inicio: z.string().min(1, { message: 'La fecha de inicio es requerida' }),
  fecha_fin: z.string().min(1, { message: 'La fecha de fin es requerida' }),
  costo_actividad: z.coerce.number().nonnegative({ message: 'El costo debe ser 0 o mayor' }),
  dias_semana: z.array(z.number().int().min(0).max(6)).default([]),
  hora_inicio: z.string().regex(HHMM_REGEX).optional().or(z.literal('').transform(() => undefined)),
  hora_fin: z.string().regex(HHMM_REGEX).optional().or(z.literal('').transform(() => undefined)),
  cupo_maximo: z.number().int().min(1).max(999).optional().nullable(),
}).refine((data) => !data.hora_fin || (data.hora_inicio && data.hora_fin > data.hora_inicio), {
  message: 'La hora de fin debe ser mayor que la de inicio.',
  path: ['hora_fin'],
})

function parseDiasSemana(raw: FormDataEntryValue | null): number[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw.toString())
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((v) => Number(v))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
  } catch {
    return []
  }
}

export type FormState = {
  errors?: Record<string, string[]>
  message?: string | null
  success?: boolean
}

async function obtenerTimezone(supabase: Awaited<ReturnType<typeof createClient>>, academiaId: string): Promise<string> {
  const { data: academia } = await supabase
    .from('academia')
    .select('timezone')
    .eq('id', academiaId)
    .single() as any
  return academia?.timezone || 'America/Mexico_City'
}

export async function crearActividadAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const cupoIlimitado = formData.get('cupo_ilimitado') === 'true'
  const cupoMaximoRaw = formData.get('cupo_maximo')
  const unSoloDia = formData.get('un_solo_dia') === 'true'
  const fechaInicio = (formData.get('fecha_inicio') as string) || ''
  const payload = {
    nombre: formData.get('nombre') as string,
    emoji: (formData.get('emoji') as string) || '',
    fecha_inicio: fechaInicio,
    // Actividad de un solo día: la fecha de fin es la misma que la de inicio.
    fecha_fin: unSoloDia ? fechaInicio : ((formData.get('fecha_fin') as string) || ''),
    costo_actividad: formData.get('costo_actividad'),
    dias_semana: parseDiasSemana(formData.get('dias_semana')),
    hora_inicio: (formData.get('hora_inicio') as string) || '',
    hora_fin: (formData.get('hora_fin') as string) || '',
    cupo_maximo: cupoIlimitado ? null : (cupoMaximoRaw ? Number(cupoMaximoRaw) : null),
  }

  const validated = actividadSchema.safeParse(payload)
  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: 'Faltan campos por completar o son inválidos.',
      success: false,
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id
  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  const timezone = await obtenerTimezone(supabase, academiaId)
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: timezone })

  if (validated.data.fecha_inicio < todayStr) {
    return {
      errors: { fecha_inicio: ['La fecha de inicio no debe ser anterior al día actual.'] },
      message: 'La fecha de inicio no debe ser anterior al día actual.',
      success: false,
    }
  }
  if (validated.data.fecha_fin < validated.data.fecha_inicio) {
    return {
      errors: { fecha_fin: ['La fecha de fin no puede ser anterior a la de inicio.'] },
      message: 'La fecha de fin no puede ser anterior a la de inicio.',
      success: false,
    }
  }

  const { error } = await supabase.from('grupo').insert({
    academia_id: academiaId,
    nombre: validated.data.nombre,
    color: null,
    emoji: validated.data.emoji,
    plan_sugerido_id: null,
    es_temporal: true,
    fecha_inicio: validated.data.fecha_inicio,
    fecha_fin: validated.data.fecha_fin,
    costo_actividad: validated.data.costo_actividad,
    dias_semana: validated.data.dias_semana.length > 0 ? validated.data.dias_semana : null,
    hora_inicio: validated.data.hora_inicio ?? null,
    hora_fin: validated.data.hora_fin ?? null,
    cupo_maximo: validated.data.cupo_maximo ?? null,
  } as any)

  if (error) return { message: translateRpcError(error), success: false }

  revalidatePath('/actividades')
  return { success: true, message: 'Actividad creada con éxito.' }
}

export async function editarActividadAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const cupoIlimitado = formData.get('cupo_ilimitado') === 'true'
  const cupoMaximoRaw = formData.get('cupo_maximo')
  const unSoloDia = formData.get('un_solo_dia') === 'true'
  const fechaInicio = (formData.get('fecha_inicio') as string) || ''
  const payload = {
    actividad_id: formData.get('actividad_id') as string,
    nombre: formData.get('nombre') as string,
    emoji: (formData.get('emoji') as string) || '',
    fecha_inicio: fechaInicio,
    fecha_fin: unSoloDia ? fechaInicio : ((formData.get('fecha_fin') as string) || ''),
    costo_actividad: formData.get('costo_actividad'),
    dias_semana: parseDiasSemana(formData.get('dias_semana')),
    hora_inicio: (formData.get('hora_inicio') as string) || '',
    hora_fin: (formData.get('hora_fin') as string) || '',
    cupo_maximo: cupoIlimitado ? null : (cupoMaximoRaw ? Number(cupoMaximoRaw) : null),
  }

  const validated = editarActividadSchema.safeParse(payload)
  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: 'Revisa los campos.',
      success: false,
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id
  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  const { data: existente } = await supabase
    .from('grupo')
    .select('id, es_temporal, estado, fecha_inicio, fecha_fin')
    .eq('id', validated.data.actividad_id)
    .eq('academia_id', academiaId)
    .single() as any
  if (!existente || !existente.es_temporal) {
    return { message: 'La actividad no existe.', success: false }
  }

  const estadoExistente = calcularEstadoActividad(existente.fecha_inicio, existente.fecha_fin, existente.estado)
  if (estadoExistente.archivada) {
    return { message: 'No se puede editar una actividad archivada.', success: false }
  }
  if (estadoExistente.yaFinalizo) {
    return { message: 'No se puede editar una actividad que ya finalizó.', success: false }
  }

  const timezone = await obtenerTimezone(supabase, academiaId)
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: timezone })

  if (estadoExistente.yaInicio && validated.data.fecha_inicio !== existente.fecha_inicio) {
    return {
      errors: { fecha_inicio: ['No se puede modificar la fecha de inicio: la actividad ya inició.'] },
      message: 'No se puede modificar la fecha de inicio: la actividad ya inició.',
      success: false,
    }
  }
  if (!estadoExistente.yaInicio && validated.data.fecha_inicio < todayStr) {
    return {
      errors: { fecha_inicio: ['La fecha de inicio no debe ser anterior al día actual.'] },
      message: 'La fecha de inicio no debe ser anterior al día actual.',
      success: false,
    }
  }
  if (validated.data.fecha_fin < validated.data.fecha_inicio) {
    return {
      errors: { fecha_fin: ['La fecha de fin no puede ser anterior a la de inicio.'] },
      message: 'La fecha de fin no puede ser anterior a la de inicio.',
      success: false,
    }
  }

  const { error } = await (supabase as any)
    .from('grupo')
    .update({
      nombre: validated.data.nombre,
      emoji: validated.data.emoji,
      fecha_inicio: validated.data.fecha_inicio,
      fecha_fin: validated.data.fecha_fin,
      costo_actividad: validated.data.costo_actividad,
      dias_semana: validated.data.dias_semana.length > 0 ? validated.data.dias_semana : null,
      hora_inicio: validated.data.hora_inicio ?? null,
      hora_fin: validated.data.hora_fin ?? null,
      cupo_maximo: validated.data.cupo_maximo ?? null,
    })
    .eq('id', validated.data.actividad_id)
    .eq('academia_id', academiaId)

  if (error) return { message: translateRpcError(error), success: false }

  revalidatePath('/actividades')
  revalidatePath('/actividades/[actividad_id]', 'page')
  return { success: true, message: 'Actividad actualizada.' }
}

/**
 * Archiva una actividad (estado='archivado'). Las inscripciones activas se
 * rompen (persona_grupo='removido'); los cargos/pagos históricos no se tocan.
 * No hay migración a otro destino: una actividad simplemente termina.
 */
export async function archivarActividadAction(actividadId: string): Promise<FormState> {
  if (!actividadId) return { message: 'Actividad inválida.', success: false }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id
  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  const { data: existente } = await supabase
    .from('grupo')
    .select('id, es_temporal, estado, fecha_inicio, fecha_fin')
    .eq('id', actividadId)
    .eq('academia_id', academiaId)
    .single() as any
  if (!existente || !existente.es_temporal) {
    return { message: 'La actividad no existe.', success: false }
  }

  const estadoExistente = calcularEstadoActividad(existente.fecha_inicio, existente.fecha_fin, existente.estado)
  if (estadoExistente.archivada) {
    return { message: 'Esta actividad ya está archivada.', success: false }
  }
  if (estadoExistente.activa) {
    return { message: 'No se puede archivar una actividad que no ha terminado. Primero finalízala.', success: false }
  }

  const { error } = await (supabase as any).rpc('archivar_grupo_v1', {
    p_academia_id: academiaId,
    p_grupo_id: actividadId,
    p_grupo_id_destino: null,
  })

  if (error) return { message: translateRpcError(error), success: false }

  revalidatePath('/actividades')
  revalidatePath('/actividades/[actividad_id]', 'page')
  revalidatePath('/alumnos')
  return { success: true, message: 'Actividad archivada.' }
}

/**
 * "Finalizar" no agrega un estado nuevo: mueve fecha_fin a hoy (cierre
 * anticipado). A partir de ahí el cálculo de fechas ya existente la trata
 * como terminada en toda la app. Si archivarTambien=true, además rompe las
 * inscripciones activas (mismo RPC que archivarActividadAction).
 */
export async function finalizarActividadAction(actividadId: string, archivarTambien: boolean): Promise<FormState> {
  if (!actividadId) return { message: 'Actividad inválida.', success: false }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id
  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  const { data: existente } = await supabase
    .from('grupo')
    .select('id, es_temporal, estado, fecha_inicio, fecha_fin')
    .eq('id', actividadId)
    .eq('academia_id', academiaId)
    .single() as any
  if (!existente || !existente.es_temporal) {
    return { message: 'La actividad no existe.', success: false }
  }

  const estadoExistente = calcularEstadoActividad(existente.fecha_inicio, existente.fecha_fin, existente.estado)
  if (estadoExistente.archivada) {
    return { message: 'Esta actividad ya está archivada.', success: false }
  }
  if (!estadoExistente.activa) {
    return { message: 'Esta actividad ya finalizó.', success: false }
  }

  const timezone = await obtenerTimezone(supabase, academiaId)
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: timezone })

  const { error } = await (supabase as any)
    .from('grupo')
    .update({ fecha_fin: todayStr })
    .eq('id', actividadId)
    .eq('academia_id', academiaId)

  if (error) return { message: translateRpcError(error), success: false }

  if (archivarTambien) {
    const { error: errorArchivar } = await (supabase as any).rpc('archivar_grupo_v1', {
      p_academia_id: academiaId,
      p_grupo_id: actividadId,
      p_grupo_id_destino: null,
    })
    if (errorArchivar) return { message: translateRpcError(errorArchivar), success: false }
  }

  revalidatePath('/actividades')
  revalidatePath('/actividades/[actividad_id]', 'page')
  revalidatePath('/alumnos')
  return { success: true, message: archivarTambien ? 'Actividad finalizada y archivada.' : 'Actividad finalizada.' }
}

/**
 * Inscribe a un alumno EXISTENTE en una actividad. La RPC genera, en una sola
 * transacción, la inscripción y el cargo único por el costo (editable, sin
 * fecha de vencimiento). Las actividades no asignan planes de cobro.
 */
const asignarAlumnoActividadSchema = z.object({
  actividad_id: z.string().uuid({ message: 'Actividad inválida' }),
  persona_id: z.string().uuid({ message: 'Alumno inválido' }),
  monto: z.coerce.number().min(0).default(0),
})

export async function asignarAlumnoAActividadAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const payload = {
    actividad_id: formData.get('actividad_id') as string,
    persona_id: formData.get('persona_id') as string,
    monto: formData.get('monto'),
  }

  const validated = asignarAlumnoActividadSchema.safeParse(payload)
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
  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  const { data: actividadExistente } = await supabase
    .from('grupo')
    .select('id, es_temporal, estado, fecha_inicio, fecha_fin')
    .eq('id', validated.data.actividad_id)
    .eq('academia_id', academiaId)
    .single() as any
  if (!actividadExistente || !actividadExistente.es_temporal) {
    return { message: 'La actividad no existe.', success: false }
  }
  const estadoActividad = calcularEstadoActividad(actividadExistente.fecha_inicio, actividadExistente.fecha_fin, actividadExistente.estado)
  if (!estadoActividad.activa) {
    return { message: 'No se puede inscribir: la actividad ya finalizó.', success: false }
  }

  // No se inscribe a un alumno suspendido (no se le pueden generar cargos).
  if (await alumnoSuspendido(supabase, academiaId, validated.data.persona_id)) {
    return { message: MSG_ALUMNO_SUSPENDIDO, success: false }
  }

  const { error } = await (supabase as any).rpc('inscribir_alumno_a_actividad_v1', {
    p_academia_id: academiaId,
    p_persona_id: validated.data.persona_id,
    p_grupo_id: validated.data.actividad_id,
    p_monto: validated.data.monto,
  })

  if (error) return { message: translateRpcError(error), success: false }

  revalidatePath('/actividades')
  revalidatePath(`/actividades/${validated.data.actividad_id}`)
  revalidatePath('/alumnos')
  revalidatePath('/inicio')
  return { success: true, message: 'Alumno inscrito a la actividad.' }
}
