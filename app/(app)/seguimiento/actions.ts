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
  origen: z.string().default('manual'),
  aplicar_beca: z.boolean().default(false),
})

const cargoYCobrarSchema = cargoIndividualSchema.extend({
  // "Cargar y cobrar ahora" → cobrar=true; "Solo cargar a cuenta" → cobrar=false.
  cobrar: z.boolean().default(false),
  metodo_pago: z.string().default('efectivo'),
  idempotency_key: z.string().uuid().optional(),
})

const editarAlumnoSchema = z.object({
  persona_id: z.string().uuid({ message: 'Persona inválida' }),
  nombre: z.string().min(2, { message: 'El nombre es requerido' }),
  apellido: z.string().optional(),
  telefono_whatsapp: z.string().optional(),
  email: z.string().email({ message: 'Email inválido' }).optional().or(z.literal('')),
  descuento_hermanos_activo: z.boolean().default(false),
  descuento_hermanos_monto: z.coerce.number().int().min(0).default(0),
  beca_activa: z.boolean().default(false),
  beca_porcentaje: z.coerce.number().int().refine((v) => [0, 25, 50, 100].includes(v), {
    message: 'Porcentaje de beca inválido',
  }).default(0),
}).refine((d) => !(d.descuento_hermanos_activo && d.beca_activa), {
  message: 'Un alumno no puede tener descuento de Hermanos y Beca a la vez.',
  path: ['beca_activa'],
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
  categoria: z.enum(['FINANZAS', 'OPERATIVO', 'COMUNICACION']).nullable().optional(),
})

/** Nombre legible del usuario autenticado para evento_timeline.actor_nombre. */
async function obtenerActorNombre(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string> {
  const { data: userData } = await supabase
    .from('usuario')
    .select('nombre, apellido')
    .eq('id', userId)
    .single() as { data: { nombre: string; apellido: string | null } | null }
  return userData ? `${userData.nombre} ${userData.apellido ?? ''}`.trim() : 'Operador'
}

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

  const actorNombre = await obtenerActorNombre(supabase, user.id)

  const { error } = await (supabase as any)
    .from('evento_timeline')
    .insert({
      academia_id: academiaId,
      persona_id: validatedFields.data.persona_id,
      categoria: 'OPERATIVO',
      tipo: 'NOTA',
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
    origen: (formData.get('origen') as string) || 'manual',
    aplicar_beca: formData.get('aplicar_beca') === 'true',
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
    p_origen: validatedFields.data.origen,
    p_aplicar_beca: validatedFields.data.aplicar_beca,
  })

  if (error) {
    return { message: translateRpcError(error), success: false }
  }

  revalidatePath('/seguimiento/[persona_id]', 'page')
  revalidatePath('/inicio')
  return { success: true, message: 'Cargo generado con éxito.' }
}

// Motor único del bottom sheet "Nuevo cargo": crea el cargo y, si cobrar=true,
// registra el pago completo en la misma transacción (RPC crear_cargo_y_cobrar_v1).
export async function crearCargoYCobrarAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const payload = {
    persona_id: formData.get('persona_id') as string,
    concepto: formData.get('concepto') as string,
    monto: formData.get('monto'),
    origen: (formData.get('origen') as string) || 'manual',
    aplicar_beca: formData.get('aplicar_beca') === 'true',
    cobrar: formData.get('cobrar') === 'true',
    metodo_pago: (formData.get('metodo_pago') as string) || 'efectivo',
    idempotency_key: (formData.get('idempotency_key') as string) || undefined,
  }

  const validated = cargoYCobrarSchema.safeParse(payload)
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
  if (!academiaId) return { message: 'Academia no encontrada', success: false }

  if (await alumnoSuspendido(supabase, academiaId, validated.data.persona_id)) {
    return { message: MSG_ALUMNO_SUSPENDIDO, success: false }
  }

  // "Cargar y cobrar" exige idempotency_key (protege el movimiento contra doble cobro).
  if (validated.data.cobrar && !validated.data.idempotency_key) {
    return { message: 'Falta la clave de idempotencia del cobro.', success: false }
  }

  const { data, error } = await (supabase as any).rpc('crear_cargo_y_cobrar_v1', {
    p_academia_id: academiaId,
    p_persona_id: validated.data.persona_id,
    p_concepto: validated.data.concepto,
    p_monto: validated.data.monto,
    p_origen: validated.data.origen,
    p_aplicar_beca: validated.data.aplicar_beca,
    p_cobrar: validated.data.cobrar,
    p_metodo_pago: validated.data.metodo_pago,
    p_idempotency_key: validated.data.idempotency_key ?? null,
  })

  if (error) {
    return { message: translateRpcError(error), success: false }
  }

  revalidatePath('/seguimiento/[persona_id]', 'page')
  revalidatePath('/inicio')

  const exento = (data as { exento?: boolean } | null)?.exento === true
  const message = exento
    ? 'Alumno exento por beca: no se generó cargo.'
    : validated.data.cobrar
      ? `Cargo generado y cobrado ${validated.data.metodo_pago === 'transferencia' ? 'por transferencia.' : 'en efectivo.'}`
      : 'Cargo generado.'
  return { success: true, message }
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

  const actorNombre = await obtenerActorNombre(supabase, user.id)

  const fechaPactada = new Date(validatedFields.data.fecha_promesa).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })

  const { error } = await (supabase as any)
    .from('evento_timeline')
    .insert({
      academia_id: academiaId,
      persona_id: validatedFields.data.persona_id,
      categoria: 'FINANZAS',
      tipo: 'PROMESA',
      titulo: 'Promesa de pago',
      descripcion: `Compromiso para el: ${fechaPactada} • ${validatedFields.data.comentario}`,
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
    descuento_hermanos_activo: formData.get('descuento_hermanos_activo') === 'true',
    descuento_hermanos_monto: Number(formData.get('descuento_hermanos_monto') || '0'),
    beca_activa: formData.get('beca_activa') === 'true',
    beca_porcentaje: Number(formData.get('beca_porcentaje') || '0'),
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
      // Descuentos especiales (mutuamente excluyentes; ya validado arriba).
      descuento_hermanos_activo: validated.data.descuento_hermanos_activo,
      descuento_hermanos_monto: validated.data.descuento_hermanos_activo ? validated.data.descuento_hermanos_monto : 0,
      beca_activa: validated.data.beca_activa,
      beca_porcentaje: validated.data.beca_activa ? validated.data.beca_porcentaje : 0,
    })
    .eq('id', validated.data.persona_id)
    .eq('academia_id', academiaId)

  if (error) return { message: translateRpcError(error), success: false }

  // Update M2M groups and plans
  const grupoIds = parseIdArray(formData.get('grupo_ids'))
  const planIds = parseIdArray(formData.get('plan_ids'))

  // 1. Update groups.
  // La sincronización solo considera grupos REGULARES: las inscripciones a
  // actividades (es_temporal) no se tocan desde la edición del alumno.
  const { data: activeGps } = await supabase
    .from('persona_grupo')
    .select('grupo_id, grupo:grupo_id (es_temporal)')
    .eq('persona_id', validated.data.persona_id)
    .eq('estado', 'activo') as any
  const currentGps = (activeGps ?? [])
    .filter((g: any) => g.grupo && g.grupo.es_temporal === false)
    .map((g: any) => g.grupo_id)

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

  // 3. Eventos OPERATIVO: mutaciones de grupos y esquemas de cobro.
  const grupoIdsAfectados = [...gpsToAdd, ...gpsToRemove]
  const planIdsAfectados = [...plsToAdd, ...plsToRemove]
  if (grupoIdsAfectados.length > 0 || planIdsAfectados.length > 0) {
    const actorNombre = await obtenerActorNombre(supabase, user!.id)

    const nombreGrupo: Record<string, string> = {}
    if (grupoIdsAfectados.length > 0) {
      const { data: gruposData } = await supabase
        .from('grupo')
        .select('id, nombre')
        .in('id', grupoIdsAfectados) as any
      for (const g of gruposData ?? []) nombreGrupo[g.id] = g.nombre
    }

    const nombrePlan: Record<string, string> = {}
    if (planIdsAfectados.length > 0) {
      const { data: planesData } = await supabase
        .from('planes_cobro')
        .select('id, nombre')
        .in('id', planIdsAfectados) as any
      for (const p of planesData ?? []) nombrePlan[p.id] = p.nombre
    }

    const base = {
      academia_id: academiaId,
      persona_id: validated.data.persona_id,
      categoria: 'OPERATIVO',
      actor_id: user!.id,
      actor_nombre: actorNombre,
    }
    const eventos = [
      ...gpsToAdd.map((id: string) => ({
        ...base, tipo: 'GRUPO_MUTACION', titulo: 'Grupo asignado',
        descripcion: nombreGrupo[id] ?? null, metadata: { grupo_id: id },
      })),
      ...gpsToRemove.map((id: string) => ({
        ...base, tipo: 'GRUPO_MUTACION', titulo: 'Grupo removido',
        descripcion: nombreGrupo[id] ?? null, metadata: { grupo_id: id },
      })),
      ...plsToAdd.map((id: string) => ({
        ...base, tipo: 'ESQUEMA_MUTACION', titulo: 'Esquema asignado',
        descripcion: nombrePlan[id] ?? null, metadata: { plan_id: id },
      })),
      ...plsToRemove.map((id: string) => ({
        ...base, tipo: 'ESQUEMA_MUTACION', titulo: 'Esquema removido',
        descripcion: nombrePlan[id] ?? null, metadata: { plan_id: id },
      })),
    ]
    if (eventos.length > 0) {
      await (supabase as any).from('evento_timeline').insert(eventos)
    }
  }

  // 4. Mensualidad del mes en curso para esquemas recién asignados: el cron solo
  //    materializa mensualidades el día 1, así que quien recibe su esquema después
  //    quedaría sin cargo hasta el próximo mes. La RPC decide monto según las
  //    reglas de la academia y deduplica por persona+periodo (no genera nada si
  //    el mes ya está cubierto, es mes sin cobro, el plan no es mensual, etc.).
  const avisosCargo: string[] = []
  for (const pId of plsToAdd) {
    const { data: gen } = await (supabase as any).rpc('generar_mensualidad_esquema_v1', {
      p_academia_id: academiaId,
      p_persona_id: validated.data.persona_id,
      p_plan_cobro_id: pId,
    })
    if (gen?.generado) {
      avisosCargo.push(`Se generó ${gen.concepto} por $${Math.round(Number(gen.monto))}.`)
    } else if (gen?.motivo === 'exento') {
      avisosCargo.push(`${gen.concepto}: alumno exento por beca.`)
    }
  }

  revalidatePath('/seguimiento/[persona_id]', 'page')
  revalidatePath('/inicio')
  const message = ['Alumno actualizado.', ...avisosCargo].join(' ')
  return { success: true, message }
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

  // Evento OPERATIVO: cambio de estatus de la cuenta.
  const tituloEstatus =
    nuevoEstado === 'inactivo' ? 'Cuenta suspendida'
    : nuevoEstado === 'activo' ? 'Cuenta reactivada'
    : 'Baja definitiva'

  const actorNombre = await obtenerActorNombre(supabase, user!.id)
  await (supabase as any)
    .from('evento_timeline')
    .insert({
      academia_id: academiaId,
      persona_id,
      categoria: 'OPERATIVO',
      tipo: 'ESTATUS_CAMBIO',
      titulo: tituloEstatus,
      descripcion: null,
      metadata: { estado_registro: nuevoEstado },
      actor_id: user!.id,
      actor_nombre: actorNombre,
    })

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

  const actorNombre = await obtenerActorNombre(supabase, user!.id)

  await (supabase as any)
    .from('evento_timeline')
    .insert({
      academia_id: academiaId,
      persona_id: cargo.persona_id,
      categoria: 'FINANZAS',
      tipo: 'ANULACION_CARGO',
      titulo: 'Cargo anulado',
      descripcion: `${cargo.concepto} • ${validated.data.motivo}`,
      monto: Number(cargo.saldo_pendiente),
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

// ============================================================================
// Enlace de historial compartible
// ============================================================================

/** Genera un nuevo código corto (invalida el anterior) para el enlace público. */
export async function regenerarEnlaceHistorialAction(
  persona_id: string,
): Promise<{ success: boolean; code?: string; message?: string }> {
  const validated = personaIdSchema.safeParse({ persona_id })
  if (!validated.success) return { success: false, message: 'Persona inválida' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id
  if (!academiaId) return { success: false, message: 'Academia no encontrada' }

  // Delegar la generación de código único al RPC de Postgres (garantía de unicidad).
  const { data: nuevoCode, error: genError } = await (supabase as any)
    .rpc('generar_share_code')
  if (genError || !nuevoCode) return { success: false, message: 'No se pudo generar el código' }

  const { error } = await (supabase as any)
    .from('persona')
    .update({ share_code: nuevoCode })
    .eq('id', persona_id)
    .eq('academia_id', academiaId)

  if (error) return { success: false, message: translateRpcError(error) }

  revalidatePath('/seguimiento/[persona_id]', 'page')
  return { success: true, code: nuevoCode }
}

/** Activa o desactiva el bloqueo manual del enlace público. */
export async function toggleBloqueoEnlaceAction(
  persona_id: string,
  bloquear: boolean,
): Promise<{ success: boolean; bloqueado?: boolean; message?: string }> {
  const validated = personaIdSchema.safeParse({ persona_id })
  if (!validated.success) return { success: false, message: 'Persona inválida' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id
  if (!academiaId) return { success: false, message: 'Academia no encontrada' }

  const { error } = await (supabase as any)
    .from('persona')
    .update({ share_link_bloqueado: bloquear })
    .eq('id', persona_id)
    .eq('academia_id', academiaId)

  if (error) return { success: false, message: translateRpcError(error) }

  revalidatePath('/seguimiento/[persona_id]', 'page')
  return { success: true, bloqueado: bloquear }
}

export async function listarTimelineAction(
  persona_id: string,
  offset: number,
  limit: number,
  categoria?: 'FINANZAS' | 'OPERATIVO' | 'COMUNICACION' | null,
) {
  const validated = timelinePageSchema.safeParse({ persona_id, offset, limit, categoria: categoria ?? null })
  if (!validated.success) return { eventos: [], hasMore: false }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id
  if (!academiaId) return { eventos: [], hasMore: false }

  let query = supabase
    .from('evento_timeline')
    .select('*')
    .eq('persona_id', validated.data.persona_id)
    .eq('academia_id', academiaId)

  if (validated.data.categoria) {
    query = query.eq('categoria', validated.data.categoria)
  }

  const { data } = await query
    .order('fecha_evento', { ascending: false })
    .range(validated.data.offset, validated.data.offset + validated.data.limit) as any

  const rows = data ?? []
  const hasMore = rows.length > validated.data.limit
  return {
    eventos: hasMore ? rows.slice(0, validated.data.limit) : rows,
    hasMore,
  }
}
