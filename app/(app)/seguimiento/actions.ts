'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { translateRpcError } from '@/lib/utils/rpc-errors'
import { alumnoSuspendido, MSG_ALUMNO_SUSPENDIDO } from '@/lib/utils/guards'

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

const cargoIndividualSchema = z.object({
  persona_id: z.string().uuid({ message: 'Persona inválida' }),
  concepto: z.string().min(2, { message: 'El concepto es requerido' }),
  monto: z.coerce.number().positive({ message: 'El monto debe ser mayor a 0' }),
  fecha_vencimiento: z.string().refine(val => !isNaN(Date.parse(val)), { message: 'Fecha inválida' }),
  origen: z.string().default('manual'),
})

const editarAlumnoSchema = z.object({
  persona_id: z.string().uuid({ message: 'Persona inválida' }),
  nombre: z.string().min(2, { message: 'El nombre es requerido' }),
  apellido: z.string().optional(),
  telefono_whatsapp: z.string().optional(),
  email: z.string().email({ message: 'Email inválido' }).optional().or(z.literal('')),
})

const personaIdSchema = z.object({
  persona_id: z.string().uuid({ message: 'Persona inválida' }),
})

const anularCargoSchema = z.object({
  cargo_id: z.string().uuid({ message: 'Cargo inválido' }),
  motivo: z.string().min(5, { message: 'El motivo debe tener al menos 5 caracteres' }),
})

const timelinePageSchema = z.object({
  persona_id: z.string().uuid(),
  offset: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().positive().max(50).default(20),
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
  revalidatePath('/inicio')

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
      categoria: 'operativo',
      tipo: 'nota',
      titulo: 'Nota de seguimiento',
      descripcion: validatedFields.data.contenido,
      actor_id: user.id,
      actor_nombre: actorNombre,
    })

  if (error) {
    return { message: error.message, success: false }
  }

  revalidatePath('/seguimiento/[persona_id]', 'page')

  return { success: true, message: 'Nota guardada exitosamente.' }
}

export async function crearCargoIndividualAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const payload = {
    persona_id: formData.get('persona_id') as string,
    concepto: formData.get('concepto') as string,
    monto: formData.get('monto'),
    fecha_vencimiento: formData.get('fecha_vencimiento') as string,
    origen: (formData.get('origen') as string) || 'manual',
  }

  const validatedFields = cargoIndividualSchema.safeParse(payload)
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Revisa los campos requeridos.',
      success: false,
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id
  if (!academiaId) return { message: 'Academia no encontrada', success: false }

  if (await alumnoSuspendido(supabase, academiaId, validatedFields.data.persona_id)) {
    return { message: MSG_ALUMNO_SUSPENDIDO, success: false }
  }

  const { error } = await (supabase as any).rpc('crear_cargo_individual_v1', {
    p_academia_id: academiaId,
    p_persona_id: validatedFields.data.persona_id,
    p_concepto: validatedFields.data.concepto,
    p_monto: validatedFields.data.monto,
    p_fecha_vencimiento: validatedFields.data.fecha_vencimiento,
    p_origen: validatedFields.data.origen,
  })

  if (error) {
    return { message: translateRpcError(error), success: false }
  }

  revalidatePath('/seguimiento/[persona_id]', 'page')
  revalidatePath('/inicio')
  return { success: true, message: 'Cargo generado con éxito.' }
}

/**
 * Helper para inyectar un cargo único inmediato (taller temporal, uniforme,
 * ensayo extra, etc.) directamente al saldo del alumno SIN alterar sus planes
 * recurrentes. Vence hoy y el saldo_acumulado se ajusta vía trigger.
 */
export async function crearCargoManual(
  alumno_id: string,
  monto: number,
  concepto: string,
): Promise<FormState> {
  if (!alumno_id) return { message: 'Alumno inválido.', success: false }
  if (!Number.isFinite(monto) || monto <= 0) return { message: 'El monto debe ser mayor a 0.', success: false }
  if (!concepto || concepto.trim().length === 0) return { message: 'El concepto es obligatorio.', success: false }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id
  if (!academiaId) return { message: 'Academia no encontrada', success: false }

  if (await alumnoSuspendido(supabase, academiaId, alumno_id)) {
    return { message: MSG_ALUMNO_SUSPENDIDO, success: false }
  }

  const { error } = await (supabase as any).rpc('crear_cargo_manual_v1', {
    p_academia_id: academiaId,
    p_alumno_id: alumno_id,
    p_monto: monto,
    p_concepto: concepto.trim(),
  })

  if (error) return { message: translateRpcError(error), success: false }

  revalidatePath('/seguimiento/[persona_id]', 'page')
  revalidatePath('/inicio')
  return { success: true, message: 'Cargo manual generado con éxito.' }
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
      categoria: 'financiero',
      tipo: 'promesa_pago',
      titulo: 'Promesa de pago',
      descripcion: `Prometió pagar el ${new Date(validatedFields.data.fecha_promesa).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}. ${validatedFields.data.comentario}`,
      metadata: {
        fecha_promesa: validatedFields.data.fecha_promesa,
        comentario: validatedFields.data.comentario
      },
      actor_id: user.id,
      actor_nombre: actorNombre,
    })

  if (error) {
    return { message: error.message, success: false }
  }

  revalidatePath('/seguimiento/[persona_id]', 'page')

  return { success: true, message: 'Promesa guardada exitosamente.' }
}

function parseIdArray(raw: FormDataEntryValue | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw.toString())
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
  } catch {
    return []
  }
}

export async function editarAlumnoAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const payload = {
    persona_id: formData.get('persona_id') as string,
    nombre: formData.get('nombre') as string,
    apellido: (formData.get('apellido') as string) || '',
    telefono_whatsapp: (formData.get('telefono_whatsapp') as string) || '',
    email: (formData.get('email') as string) || '',
  }

  const validated = editarAlumnoSchema.safeParse(payload)
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
  if (!academiaId) return { message: 'Academia no encontrada', success: false }

  const { error } = await (supabase as any)
    .from('persona')
    .update({
      nombre: validated.data.nombre,
      apellido: validated.data.apellido || null,
      telefono_whatsapp: validated.data.telefono_whatsapp || null,
      // El email ya no se edita desde el UI: se preserva el valor existente.
    })
    .eq('id', validated.data.persona_id)
    .eq('academia_id', academiaId)

  if (error) return { message: translateRpcError(error), success: false }

  // Update M2M groups and plans
  const grupoIds = parseIdArray(formData.get('grupo_ids'))
  const planIds = parseIdArray(formData.get('plan_ids'))

  // 1. Update groups
  const { data: activeGps } = await supabase
    .from('persona_grupo')
    .select('grupo_id')
    .eq('persona_id', validated.data.persona_id)
    .eq('estado', 'activo') as any
  const currentGps = (activeGps ?? []).map((g: any) => g.grupo_id)

  const gpsToRemove = currentGps.filter((id: string) => !grupoIds.includes(id))
  const gpsToAdd = grupoIds.filter((id: string) => !currentGps.includes(id))

  if (gpsToRemove.length > 0) {
    await supabase
      .from('persona_grupo')
      .update({ estado: 'removido', fecha_remocion: new Date().toISOString() } as any)
      .eq('persona_id', validated.data.persona_id)
      .in('grupo_id', gpsToRemove)
  }

  for (const gId of gpsToAdd) {
    await supabase
      .from('persona_grupo')
      .upsert({
        academia_id: academiaId,
        persona_id: validated.data.persona_id,
        grupo_id: gId,
        estado: 'activo',
        fecha_inscripcion: new Date().toISOString().slice(0, 10),
      } as any, { onConflict: 'persona_id,grupo_id' })
  }

  // 2. Update plans
  const { data: activePls } = await supabase
    .from('alumno_planes')
    .select('plan_cobro_id')
    .eq('alumno_id', validated.data.persona_id) as any
  const currentPls = (activePls ?? []).map((p: any) => p.plan_cobro_id)

  const plsToRemove = currentPls.filter((id: string) => !planIds.includes(id))
  const plsToAdd = planIds.filter((id: string) => !currentPls.includes(id))

  if (plsToRemove.length > 0) {
    await supabase
      .from('alumno_planes')
      .delete()
      .eq('alumno_id', validated.data.persona_id)
      .in('plan_cobro_id', plsToRemove)
  }

  for (const pId of plsToAdd) {
    await supabase
      .from('alumno_planes')
      .insert({
        academia_id: academiaId,
        alumno_id: validated.data.persona_id,
        plan_cobro_id: pId,
      } as any)
  }

  revalidatePath('/seguimiento/[persona_id]', 'page')
  revalidatePath('/inicio')
  return { success: true, message: 'Alumno actualizado.' }
}

async function _cambiarEstadoRegistro(persona_id: string, nuevoEstado: 'activo' | 'inactivo' | 'archivado'): Promise<FormState> {
  const validated = personaIdSchema.safeParse({ persona_id })
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, message: 'Persona inválida', success: false }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id
  if (!academiaId) return { message: 'Academia no encontrada', success: false }

  const { error } = await (supabase as any)
    .from('persona')
    .update({ estado_registro: nuevoEstado })
    .eq('id', persona_id)
    .eq('academia_id', academiaId)

  if (error) return { message: translateRpcError(error), success: false }

  revalidatePath('/seguimiento/[persona_id]', 'page')
  revalidatePath('/inicio')
  revalidatePath('/grupos')
  return { success: true }
}

export async function suspenderAlumnoAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const persona_id = formData.get('persona_id') as string
  const result = await _cambiarEstadoRegistro(persona_id, 'inactivo')
  if (result.success) return { ...result, message: 'Alumno suspendido.' }
  return result
}

export async function reactivarAlumnoAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const persona_id = formData.get('persona_id') as string
  const result = await _cambiarEstadoRegistro(persona_id, 'activo')
  if (result.success) return { ...result, message: 'Alumno reactivado.' }
  return result
}

export async function darDeBajaAlumnoAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const persona_id = formData.get('persona_id') as string
  const result = await _cambiarEstadoRegistro(persona_id, 'archivado')
  if (result.success) return { ...result, message: 'Alumno dado de baja. El historial queda intacto.' }
  return result
}

export async function eliminarAlumnoAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const persona_id = formData.get('persona_id') as string
  const validated = personaIdSchema.safeParse({ persona_id })
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, message: 'Persona inválida', success: false }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id
  if (!academiaId) return { message: 'Academia no encontrada', success: false }

  // Verificar que NO tenga movimientos (pagos) registrados.
  const { count: movimientosCount } = await supabase
    .from('movimiento')
    .select('id', { count: 'exact', head: true })
    .eq('persona_id', persona_id)
    .eq('academia_id', academiaId)

  if ((movimientosCount ?? 0) > 0) {
    return {
      message: 'Este alumno ya tiene movimientos registrados. Usa "Dar de baja definitiva" para preservar el historial.',
      success: false,
    }
  }

  // Borrar dependencias en orden seguro.
  await (supabase as any).from('evento_timeline').delete().eq('persona_id', persona_id).eq('academia_id', academiaId)
  await (supabase as any).from('cargo').delete().eq('persona_id', persona_id).eq('academia_id', academiaId)
  await (supabase as any).from('persona_grupo').delete().eq('persona_id', persona_id).eq('academia_id', academiaId)

  const { error } = await (supabase as any)
    .from('persona')
    .delete()
    .eq('id', persona_id)
    .eq('academia_id', academiaId)

  if (error) return { message: translateRpcError(error), success: false }

  revalidatePath('/inicio')
  revalidatePath('/grupos')
  return { success: true, message: 'Alumno eliminado.' }
}

// ============================================================================
// Anular / cancelar cargo
// ============================================================================

export async function anularCargoAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const payload = {
    cargo_id: formData.get('cargo_id') as string,
    motivo: formData.get('motivo') as string,
  }

  const validated = anularCargoSchema.safeParse(payload)
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, message: 'Revisa los campos.', success: false }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id
  if (!academiaId) return { message: 'Academia no encontrada', success: false }

  // Validar que el cargo no tenga pagos aplicados registrados.
  const { data: cargo, error: cargoErr } = await supabase
    .from('cargo')
    .select('id, persona_id, estado_financiero, monto_original, concepto, saldo_pendiente')
    .eq('id', validated.data.cargo_id)
    .eq('academia_id', academiaId)
    .single() as any

  if (cargoErr || !cargo) return { message: 'Cargo no encontrado.', success: false }
  if (cargo.estado_financiero === 'liquidado') {
    return { message: 'No se puede anular un cargo liquidado. Anula primero el pago.', success: false }
  }
  if (cargo.estado_financiero === 'anulado') {
    return { message: 'El cargo ya está anulado.', success: false }
  }

  const { count: aplicacionesActivas } = await supabase
    .from('aplicacion_movimiento')
    .select('id', { count: 'exact', head: true })
    .eq('cargo_id', validated.data.cargo_id)
    .eq('estado', 'registrado')

  if ((aplicacionesActivas ?? 0) > 0) {
    return { message: 'Este cargo tiene pagos aplicados. Anula primero los pagos.', success: false }
  }

  const { error: updErr } = await (supabase as any)
    .from('cargo')
    .update({ estado_financiero: 'anulado', saldo_pendiente: 0 })
    .eq('id', validated.data.cargo_id)
    .eq('academia_id', academiaId)

  if (updErr) return { message: translateRpcError(updErr), success: false }

  // Obtener nombre del usuario
  const { data: userData } = await supabase
    .from('usuario')
    .select('nombre, apellido')
    .eq('id', user!.id)
    .single() as any

  const actorNombre = userData ? `${userData.nombre} ${userData.apellido ?? ''}`.trim() : 'Operador'

  await (supabase as any)
    .from('evento_timeline')
    .insert({
      academia_id: academiaId,
      persona_id: cargo.persona_id,
      categoria: 'financiero',
      tipo: 'cargo_anulado',
      titulo: 'Cargo anulado',
      descripcion: `Se anuló el cargo "${cargo.concepto}" por $${Number(cargo.monto_original).toFixed(2)}. Motivo: ${validated.data.motivo}`,
      metadata: {
        cargo_id: cargo.id,
        monto_original: cargo.monto_original,
        concepto: cargo.concepto,
        motivo: validated.data.motivo,
      },
      actor_id: user!.id,
      actor_nombre: actorNombre,
    })

  revalidatePath('/seguimiento/[persona_id]', 'page')
  revalidatePath('/inicio')
  return { success: true, message: 'Cargo anulado exitosamente.' }
}

// ============================================================================
// Paginación del timeline (para el modal "Ver todo")
// ============================================================================

export async function listarTimelineAction(persona_id: string, offset: number, limit: number) {
  const validated = timelinePageSchema.safeParse({ persona_id, offset, limit })
  if (!validated.success) return { eventos: [], hasMore: false }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id
  if (!academiaId) return { eventos: [], hasMore: false }

  const { data } = await supabase
    .from('evento_timeline')
    .select('*')
    .eq('persona_id', validated.data.persona_id)
    .eq('academia_id', academiaId)
    .order('fecha_evento', { ascending: false })
    .range(validated.data.offset, validated.data.offset + validated.data.limit) as any

  const rows = data ?? []
  const hasMore = rows.length > validated.data.limit
  return {
    eventos: hasMore ? rows.slice(0, validated.data.limit) : rows,
    hasMore,
  }
}
