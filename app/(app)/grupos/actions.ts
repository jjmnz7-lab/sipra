'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { translateRpcError } from '@/lib/utils/rpc-errors'
import { alumnoSuspendido, MSG_ALUMNO_SUSPENDIDO } from '@/lib/utils/guards'
import type { PostgrestError } from '@supabase/supabase-js'

const HHMM_REGEX = /^\d{2}:\d{2}$/

const grupoSchema = z.object({
  nombre: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }),
  color: z.string().optional(),
  emoji: z.string().optional(),
  plan_sugerido_id: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
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

const editarGrupoSchema = z.object({
  grupo_id: z.string().uuid({ message: 'Grupo inválido' }),
  nombre: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }),
  color: z.string().optional(),
  emoji: z.string().optional(),
  plan_sugerido_id: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
  dias_semana: z.array(z.number().int().min(0).max(6)).default([]),
  hora_inicio: z.string().regex(HHMM_REGEX).optional().or(z.literal('').transform(() => undefined)),
  hora_fin: z.string().regex(HHMM_REGEX).optional().or(z.literal('').transform(() => undefined)),
  cupo_maximo: z.number().int().min(1).max(999).optional().nullable(),
}).refine((data) => !data.hora_fin || (data.hora_inicio && data.hora_fin > data.hora_inicio), {
  message: 'La hora de fin debe ser mayor que la de inicio.',
  path: ['hora_fin'],
})

const personaSchema = z.object({
  nombre: z.string().min(2, { message: 'El nombre es requerido' }),
  apellido: z.string().optional(),
  telefono_whatsapp: z.string().optional(),
  email: z.string().email({ message: 'Email inválido' }).optional().or(z.literal('')),
  // Soporta 1..N grupos y 0..N planes (modo simple usa arrays de un elemento).
  grupo_ids: z.array(z.string().uuid()).min(1, { message: 'Selecciona al menos un grupo' }),
  plan_ids: z.array(z.string().uuid()).default([]),
  // Monto inicial editable (solo modo simple, 1 plan). En avanzado se usa el monto del plan.
  monto: z.coerce.number().nonnegative().optional(),
  // Descuentos especiales (mutuamente excluyentes).
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

function parseIdArray(raw: FormDataEntryValue | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw.toString())
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
  } catch {
    return []
  }
}

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
  /** ID de la persona recién creada (lo usa el drawer para encadenar el cargo de inscripción). */
  personaId?: string
}

export async function crearGrupoAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const cupoIlimitado = formData.get('cupo_ilimitado') === 'true'
  const cupoMaximoRaw = formData.get('cupo_maximo')
  const payload = {
    nombre: formData.get('nombre') as string,
    color: (formData.get('color') as string) || undefined,
    emoji: (formData.get('emoji') as string) || undefined,
    plan_sugerido_id: (formData.get('plan_sugerido_id') as string) || '',
    dias_semana: parseDiasSemana(formData.get('dias_semana')),
    hora_inicio: (formData.get('hora_inicio') as string) || '',
    hora_fin: (formData.get('hora_fin') as string) || '',
    cupo_maximo: cupoIlimitado ? null : (cupoMaximoRaw ? Number(cupoMaximoRaw) : null),
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
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id

  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  const { error } = await supabase.from('grupo').insert({
    academia_id: academiaId,
    nombre: validatedFields.data.nombre,
    color: validatedFields.data.color || null,
    emoji: validatedFields.data.emoji || null,
    plan_sugerido_id: validatedFields.data.plan_sugerido_id ?? null,
    es_temporal: false,
    dias_semana: validatedFields.data.dias_semana.length > 0 ? validatedFields.data.dias_semana : null,
    hora_inicio: validatedFields.data.hora_inicio ?? null,
    hora_fin: validatedFields.data.hora_fin ?? null,
    cupo_maximo: validatedFields.data.cupo_maximo ?? null,
  } as any)

  if (error) {
    return { message: translateRpcError(error), success: false }
  }

  revalidatePath('/grupos')
  return { success: true, message: 'Grupo creado con éxito.' }
}

export async function editarGrupoAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const cupoIlimitado = formData.get('cupo_ilimitado') === 'true'
  const cupoMaximoRaw = formData.get('cupo_maximo')
  const payload = {
    grupo_id: formData.get('grupo_id') as string,
    nombre: formData.get('nombre') as string,
    color: (formData.get('color') as string) || undefined,
    emoji: (formData.get('emoji') as string) || undefined,
    plan_sugerido_id: (formData.get('plan_sugerido_id') as string) || '',
    dias_semana: parseDiasSemana(formData.get('dias_semana')),
    hora_inicio: (formData.get('hora_inicio') as string) || '',
    hora_fin: (formData.get('hora_fin') as string) || '',
    cupo_maximo: cupoIlimitado ? null : (cupoMaximoRaw ? Number(cupoMaximoRaw) : null),
  }

  const validated = editarGrupoSchema.safeParse(payload)
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

  const { data: grupoExistente } = await supabase
    .from('grupo')
    .select('id')
    .eq('id', validated.data.grupo_id)
    .eq('academia_id', academiaId)
    .single() as any

  if (!grupoExistente) return { message: 'El grupo no existe.', success: false }

  const { error } = await (supabase as any)
    .from('grupo')
    .update({
      nombre: validated.data.nombre,
      color: validated.data.color ?? null,
      emoji: validated.data.emoji ?? null,
      plan_sugerido_id: validated.data.plan_sugerido_id ?? null,
      dias_semana: validated.data.dias_semana.length > 0 ? validated.data.dias_semana : null,
      hora_inicio: validated.data.hora_inicio ?? null,
      hora_fin: validated.data.hora_fin ?? null,
      cupo_maximo: validated.data.cupo_maximo ?? null,
    })
    .eq('id', validated.data.grupo_id)
    .eq('academia_id', academiaId)

  if (error) return { message: translateRpcError(error), success: false }

  revalidatePath('/grupos')
  revalidatePath('/grupos/[grupo_id]', 'page')
  return { success: true, message: 'Grupo actualizado.' }
}

/**
 * Archiva un grupo (estado='archivado') de forma segura. Si se pasa
 * `grupoIdDestino`, migra en lote a sus miembros activos al grupo destino; si no,
 * rompe las inscripciones (persona_grupo='removido') dejando huérfanos.
 * El Ledger no se toca (los cargos son por plan, no por grupo).
 */
export async function archivarGrupoAction(grupoId: string, grupoIdDestino?: string | null): Promise<FormState> {
  if (!grupoId) return { message: 'Grupo inválido.', success: false }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id
  if (!academiaId) return { message: 'No tienes una academia asociada.', success: false }

  const { error } = await (supabase as any).rpc('archivar_grupo_v1', {
    p_academia_id: academiaId,
    p_grupo_id: grupoId,
    p_grupo_id_destino: grupoIdDestino ?? null,
  })

  if (error) return { message: translateRpcError(error), success: false }

  revalidatePath('/grupos')
  revalidatePath('/grupos/[grupo_id]', 'page')
  revalidatePath('/alumnos')
  return {
    success: true,
    message: grupoIdDestino ? 'Grupo archivado y alumnos migrados.' : 'Grupo archivado.',
  }
}

export async function crearPersonaAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const payload = {
    nombre: formData.get('nombre') as string,
    apellido: (formData.get('apellido') as string) || '',
    telefono_whatsapp: (formData.get('telefono_whatsapp') as string) || '',
    email: (formData.get('email') as string) || '',
    grupo_ids: parseIdArray(formData.get('grupo_ids')),
    plan_ids: parseIdArray(formData.get('plan_ids')),
    monto: formData.get('monto') != null && formData.get('monto') !== '' ? Number(formData.get('monto')) : undefined,
    descuento_hermanos_activo: formData.get('descuento_hermanos_activo') === 'true',
    descuento_hermanos_monto: Number(formData.get('descuento_hermanos_monto') || '0'),
    beca_activa: formData.get('beca_activa') === 'true',
    beca_porcentaje: Number(formData.get('beca_porcentaje') || '0'),
  }

  const validatedFields = personaSchema.safeParse(payload)

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Faltan campos por completar o son inválidos.',
      success: false
    }
  }

  const { grupo_ids, plan_ids, monto } = validatedFields.data
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
    // Descuentos especiales (mutuamente excluyentes; ya validado en el schema).
    descuento_hermanos_activo: validatedFields.data.descuento_hermanos_activo,
    descuento_hermanos_monto: validatedFields.data.descuento_hermanos_activo ? validatedFields.data.descuento_hermanos_monto : 0,
    beca_activa: validatedFields.data.beca_activa,
    beca_porcentaje: validatedFields.data.beca_activa ? validatedFields.data.beca_porcentaje : 0,
  } as any).select('id').single() as any

  if (personaError || !personaData) {
    return { message: personaError ? translateRpcError(personaError) : 'Error al crear persona', success: false }
  }

  const personaId = personaData.id
  const anchorGrupo = grupo_ids[0]

  // 1.b Evento OPERATIVO: alta inicial del alumno.
  await (supabase as any)
    .from('evento_timeline')
    .insert({
      academia_id: academiaId,
      persona_id: personaId,
      categoria: 'OPERATIVO',
      tipo: 'REGISTRO',
      titulo: 'Alumno registrado',
      descripcion: 'Alta inicial del alumno',
      actor_id: user.id,
    })

  // 2. Montos por plan: en modo simple (1 plan) se respeta el monto editado;
  //    en avanzado (varios planes) se cobra el monto de cada plan.
  let montoPorPlan: Record<string, number> = {}
  if (plan_ids.length > 0) {
    const { data: planesData } = await supabase
      .from('planes_cobro')
      .select('id, monto')
      .in('id', plan_ids)
      .eq('academia_id', academiaId) as any
    montoPorPlan = Object.fromEntries((planesData ?? []).map((p: any) => [p.id, Number(p.monto)]))
    if (plan_ids.length === 1 && monto != null) {
      montoPorPlan[plan_ids[0]] = monto
    }
  }

  // 3. Inscribir a todos los grupos (solo logística, sin cargo).
  for (const grupoId of grupo_ids) {
    const { error } = await (supabase as any).rpc('inscribir_alumno_a_grupo_v1', {
      p_academia_id: academiaId,
      p_persona_id: personaId,
      p_grupo_id: grupoId,
      p_plan_cobro_id: null,
      p_monto: 0,
      p_concepto: null,
    })
    if (error) {
      return { message: 'Alumno creado, pero falló la inscripción al grupo: ' + translateRpcError(error), success: false }
    }
  }

  // 4. Vincular cada plan + cargo inicial (ancla en el primer grupo).
  for (const planId of plan_ids) {
    const { error } = await (supabase as any).rpc('inscribir_alumno_a_grupo_v1', {
      p_academia_id: academiaId,
      p_persona_id: personaId,
      p_grupo_id: anchorGrupo,
      p_plan_cobro_id: planId,
      p_monto: montoPorPlan[planId] ?? 0,
      p_concepto: null,
    })
    if (error) {
      return { message: 'Alumno inscrito, pero falló la asignación de un plan: ' + translateRpcError(error), success: false }
    }
  }

  revalidatePath('/grupos')
  revalidatePath('/alumnos')
  return { success: true, message: 'Alumno inscrito con éxito.', personaId }
}

// Server action ligera: devuelve preview del primer cargo de un plan para el drawer
// (calcula prorrateo del lado de la BD para usar la misma lógica que la RPC final).
export async function calcularCargoPlanAction(plan_cobro_id: string, fecha_inscripcion?: string) {
  if (!plan_cobro_id) return null
  const supabase = await createClient()
  const { data, error } = await (supabase as any).rpc('calcular_cargo_plan_v1', {
    p_plan_cobro_id: plan_cobro_id,
    p_fecha_inscripcion: fecha_inscripcion ?? new Date().toISOString().slice(0, 10),
  })
  if (error) return null
  return data as {
    plan_cobro_id: string
    plan_nombre: string
    frecuencia: 'mensual' | 'semanal' | 'por_visita' | 'pago_unico'
    monto_plan: number
    modo_prorrateo: 'proporcional' | 'completo'
    dias_mes: number
    dias_restantes: number
    monto_calculado: number
    fecha_vencimiento: string
  }
}

const cargoGrupalSchema = z.object({
  grupo_id: z.string().uuid(),
  concepto: z.string().min(2, { message: 'El concepto es muy corto' }),
  monto: z.coerce.number().positive({ message: 'El monto debe ser mayor a 0' }),
  excluded_persona_ids: z.array(z.string().uuid()).default([]),
  idempotency_key: z.string().uuid(),
  aplicar_becas: z.boolean().default(false),
})

export async function crearCargoGrupalAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const payload = {
    grupo_id: formData.get('grupo_id') as string,
    concepto: formData.get('concepto') as string,
    monto: formData.get('monto'),
    excluded_persona_ids: JSON.parse((formData.get('excluded_persona_ids') as string) || '[]'),
    idempotency_key: formData.get('idempotency_key') as string,
    aplicar_becas: formData.get('aplicar_becas') === 'true',
  }

  const validatedFields = cargoGrupalSchema.safeParse(payload)

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

  // Excluir del cargo masivo a los alumnos suspendidos del grupo: no se les generan cargos $.
  const { data: miembrosGrupo } = await (supabase as any)
    .from('persona_grupo')
    .select('persona_id, persona ( estado_registro )')
    .eq('academia_id', academiaId)
    .eq('grupo_id', validatedFields.data.grupo_id)
    .eq('estado', 'activo')
  const suspendidosIds: string[] = (miembrosGrupo ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((m: any) => m.persona && m.persona.estado_registro !== 'activo')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((m: any) => m.persona_id)
  const excluidosFinal = Array.from(
    new Set<string>([...validatedFields.data.excluded_persona_ids, ...suspendidosIds]),
  )

  type CrearCargoGrupalRpc = (
    fn: 'crear_cargo_grupal_v1',
    args: {
      p_academia_id: string
      p_grupo_id: string
      p_concepto: string
      p_monto: number
      p_excluded_persona_ids: string[]
      p_idempotency_key: string
      p_aplicar_becas: boolean
    }
  ) => Promise<{
    data: { idempotent_hit: boolean; cargos_creados: number } | null
    error: PostgrestError | null
  }>

  const rpcCrearCargo = supabase.rpc.bind(supabase) as unknown as CrearCargoGrupalRpc
  const { data, error } = await rpcCrearCargo('crear_cargo_grupal_v1', {
    p_academia_id: academiaId,
    p_grupo_id: validatedFields.data.grupo_id,
    p_concepto: validatedFields.data.concepto,
    p_monto: validatedFields.data.monto,
    p_excluded_persona_ids: excluidosFinal,
    p_idempotency_key: validatedFields.data.idempotency_key,
    p_aplicar_becas: validatedFields.data.aplicar_becas,
  })

  if (error) {
    return { message: translateRpcError(error), success: false }
  }

  // El drawer de cargo grupal se comparte entre Grupos y Actividades.
  revalidatePath('/grupos')
  revalidatePath(`/grupos/${validatedFields.data.grupo_id}`)
  revalidatePath('/actividades')
  revalidatePath(`/actividades/${validatedFields.data.grupo_id}`)
  // Superficies globales de saldo: el cargo afecta el adeudo del alumno en
  // Inicio, la lista de Alumnos, el detalle de cada alumno y los reportes.
  revalidatePath('/inicio')
  revalidatePath('/alumnos')
  revalidatePath('/seguimiento/[persona_id]', 'page')
  revalidatePath('/reportes')

  if (data?.idempotent_hit) {
     return { success: true, message: 'El cargo ya había sido procesado (Idempotencia).' }
  }

  return { success: true, message: `Se generaron ${data?.cargos_creados || 0} cargos masivos con éxito.` }
}

// ── Cargo masivo multi-grupo ─────────────────────────────────────────────────
// Aplica un mismo concepto/monto a varios grupos en una sola operación. Todos
// los cargos comparten un `lote_id` (para que Reportes los muestre como UNA
// tarjeta), pero cada grupo conserva su propio idempotency_key (estable por
// lote+grupo) para que los reenvíos sigan siendo idempotentes.
//
// La de-duplicación de alumnos que están en más de un grupo se resuelve en el
// cliente vía las listas de exclusión por grupo (cuando "duplicar" está apagado,
// el alumno se excluye de todos sus grupos salvo el primero seleccionado).
const cargoMasivoGrupoSchema = z.object({
  grupo_id: z.string().uuid(),
  excluded_persona_ids: z.array(z.string().uuid()).default([]),
})

const cargoMasivoMultigrupoSchema = z.object({
  lote_id: z.string().uuid(),
  concepto: z.string().min(2, { message: 'El concepto es muy corto' }),
  monto: z.coerce.number().positive({ message: 'El monto debe ser mayor a 0' }),
  grupos: z.array(cargoMasivoGrupoSchema).min(1, { message: 'Selecciona al menos un grupo' }),
  aplicar_becas: z.boolean().default(false),
})

export async function crearCargoMasivoMultigrupoAction(prevState: FormState, formData: FormData): Promise<FormState> {
  let gruposParsed: unknown = []
  try {
    gruposParsed = JSON.parse((formData.get('grupos') as string) || '[]')
  } catch {
    return { message: 'Datos de grupos inválidos.', success: false }
  }

  const payload = {
    lote_id: formData.get('lote_id') as string,
    concepto: formData.get('concepto') as string,
    monto: formData.get('monto'),
    grupos: gruposParsed,
    aplicar_becas: formData.get('aplicar_becas') === 'true',
  }

  const validated = cargoMasivoMultigrupoSchema.safeParse(payload)
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

  type CrearCargoGrupalRpc = (
    fn: 'crear_cargo_grupal_v1',
    args: {
      p_academia_id: string
      p_grupo_id: string
      p_concepto: string
      p_monto: number
      p_excluded_persona_ids: string[]
      p_idempotency_key: string
      p_lote_id: string
      p_aplicar_becas: boolean
    }
  ) => Promise<{
    data: { idempotent_hit: boolean; cargos_creados: number } | null
    error: PostgrestError | null
  }>

  const rpcCrearCargo = supabase.rpc.bind(supabase) as unknown as CrearCargoGrupalRpc
  const { lote_id, concepto, monto, grupos, aplicar_becas } = validated.data

  let totalCreados = 0
  let huboCreacion = false
  for (const g of grupos) {
    const { data, error } = await rpcCrearCargo('crear_cargo_grupal_v1', {
      p_academia_id: academiaId,
      p_grupo_id: g.grupo_id,
      p_concepto: concepto,
      p_monto: monto,
      p_excluded_persona_ids: g.excluded_persona_ids,
      // Llave estable por lote+grupo: reenviar la operación no duplica cargos.
      p_idempotency_key: `${lote_id}_${g.grupo_id}`,
      p_lote_id: lote_id,
      p_aplicar_becas: aplicar_becas,
    })
    if (error) return { message: translateRpcError(error), success: false }
    totalCreados += data?.cargos_creados ?? 0
    if (!data?.idempotent_hit) huboCreacion = true
  }

  revalidatePath('/inicio')
  revalidatePath('/grupos')
  revalidatePath('/grupos/[grupo_id]', 'page')
  revalidatePath('/actividades')
  revalidatePath('/actividades/[actividad_id]', 'page')
  revalidatePath('/reportes')
  // Superficies globales de saldo: el cargo afecta el adeudo del alumno en la
  // lista de Alumnos y en el detalle de cada alumno.
  revalidatePath('/alumnos')
  revalidatePath('/seguimiento/[persona_id]', 'page')

  if (!huboCreacion && totalCreados === 0) {
    return { success: true, message: 'El cargo ya había sido procesado (Idempotencia).' }
  }

  return {
    success: true,
    message: `Se generaron ${totalCreados} ${totalCreados === 1 ? 'cargo' : 'cargos'} en ${grupos.length} ${grupos.length === 1 ? 'grupo' : 'grupos'}.`,
  }
}

const avisoGrupalSchema = z.object({
  grupo_id: z.string().uuid(),
  titulo: z.string().min(2, { message: 'El título es muy corto' }),
  descripcion: z.string().optional(),
})

export async function crearAvisoGrupalAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const payload = {
    grupo_id: formData.get('grupo_id') as string,
    titulo: formData.get('titulo') as string,
    descripcion: formData.get('descripcion') as string,
  }

  const validatedFields = avisoGrupalSchema.safeParse(payload)

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

  type CrearAvisoGrupalRpc = (
    fn: 'crear_aviso_grupal_v1',
    args: {
      p_academia_id: string
      p_grupo_id: string
      p_titulo: string
      p_descripcion: string
    }
  ) => Promise<{
    data: null
    error: PostgrestError | null
  }>

  const rpcCrearAviso = supabase.rpc.bind(supabase) as unknown as CrearAvisoGrupalRpc
  const { error } = await rpcCrearAviso('crear_aviso_grupal_v1', {
    p_academia_id: academiaId,
    p_grupo_id: validatedFields.data.grupo_id,
    p_titulo: validatedFields.data.titulo,
    p_descripcion: validatedFields.data.descripcion || '',
  })

  if (error) {
    return { message: translateRpcError(error), success: false }
  }

  revalidatePath('/grupos')
  revalidatePath(`/grupos/${validatedFields.data.grupo_id}`)
  return { success: true, message: 'Aviso grupal generado con éxito.' }
}

/**
 * Inscribe a un alumno EXISTENTE en un grupo. Si el grupo tiene plan_sugerido y
 * la academia cobra inscripción (o el plan la requiere), se puede generar el
 * cargo de inscripción con un monto editable.
 *
 * Reglas:
 *   - El alumno NO debe estar suspendido (no se le pueden generar cargos $).
 *   - El plan_sugerido se AGREGA al alumno (no reemplaza los que ya tiene).
 *   - Si la inscripción no aplica, plan_id es null o inscripcion_monto = 0,
 *     solo se hace la inscripción al grupo sin cargo.
 */
const asignarAlumnoSchema = z.object({
  grupo_id: z.string().uuid({ message: 'Grupo inválido' }),
  persona_id: z.string().uuid({ message: 'Alumno inválido' }),
  plan_id: z.string().uuid().nullable(),
  /** Si > 0, se inyecta un cargo de inscripción inmediato. */
  inscripcion_monto: z.coerce.number().min(0).default(0),
})

export async function asignarAlumnoAGrupoAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const payload = {
    grupo_id: formData.get('grupo_id') as string,
    persona_id: formData.get('persona_id') as string,
    plan_id: (formData.get('plan_id') as string) || null,
    inscripcion_monto: formData.get('inscripcion_monto'),
  }

  const validated = asignarAlumnoSchema.safeParse(payload)
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

  // No se inscribe a un alumno suspendido (no se le pueden generar cargos).
  if (await alumnoSuspendido(supabase, academiaId, validated.data.persona_id)) {
    return { message: MSG_ALUMNO_SUSPENDIDO, success: false }
  }

  // 1. Inscribir al grupo (logística, sin cargo).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: errGrupo } = await (supabase as any).rpc('inscribir_alumno_a_grupo_v1', {
    p_academia_id: academiaId,
    p_persona_id: validated.data.persona_id,
    p_grupo_id: validated.data.grupo_id,
    p_plan_cobro_id: null,
    p_monto: 0,
    p_concepto: null,
  })
  if (errGrupo) return { message: translateRpcError(errGrupo), success: false }

  // 2. Si hay plan sugerido, agregarlo al alumno (sin duplicar si ya lo tiene).
  if (validated.data.plan_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: yaAsignado } = await (supabase as any)
      .from('alumno_planes')
      .select('plan_cobro_id')
      .eq('academia_id', academiaId)
      .eq('alumno_id', validated.data.persona_id)
      .eq('plan_cobro_id', validated.data.plan_id)
      .maybeSingle()

    if (!yaAsignado) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: errPlan } = await (supabase as any).from('alumno_planes').insert({
        academia_id: academiaId,
        alumno_id: validated.data.persona_id,
        plan_cobro_id: validated.data.plan_id,
      })
      if (errPlan) {
        return { message: 'Inscrito al grupo, pero falló al agregar el plan: ' + translateRpcError(errPlan), success: false }
      }

      // Evento OPERATIVO: esquema de cobro asignado.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: planInfo } = await (supabase as any)
        .from('planes_cobro')
        .select('nombre')
        .eq('id', validated.data.plan_id)
        .single()
      await (supabase as any).from('evento_timeline').insert({
        academia_id: academiaId,
        persona_id: validated.data.persona_id,
        categoria: 'OPERATIVO',
        tipo: 'ESQUEMA_MUTACION',
        titulo: 'Esquema asignado',
        descripcion: planInfo?.nombre ?? null,
        metadata: { plan_id: validated.data.plan_id },
        actor_id: user.id,
      })
    }
  }

  // 3. Si hay monto de inscripción > 0, inyectar cargo único.
  if (validated.data.inscripcion_monto > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: errCargo } = await (supabase as any).rpc('crear_cargo_manual_v1', {
      p_academia_id: academiaId,
      p_alumno_id: validated.data.persona_id,
      p_monto: validated.data.inscripcion_monto,
      p_concepto: 'Inscripción',
    })
    if (errCargo) {
      return { message: 'Inscrito, pero falló el cargo de inscripción: ' + translateRpcError(errCargo), success: false }
    }
  }

  revalidatePath('/grupos')
  revalidatePath(`/grupos/${validated.data.grupo_id}`)
  revalidatePath('/alumnos')
  revalidatePath('/inicio')
  return { success: true, message: 'Alumno inscrito al grupo.' }
}
