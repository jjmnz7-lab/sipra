/**
 * Centro de alertas operativas (data layer).
 *
 * Calcula los conteos de "higiene de datos" que pueden romper la operación o el
 * motor de cobro. Se ejecuta del lado servidor (lo invoca el layout) y devuelve
 * solo números para que el header pinte el badge y el bottom sheet renderice las
 * filas activas.
 */

export type AlertasOperativas = {
  /** Alumnos activos sin grupo asignado (excluye alumnos con plan por_visita). */
  sinGrupo: number
  /** Alumnos activos sin ningún plan de cobro activo (excluye a quienes solo participan en actividades). */
  sinPlan: number
  /** Alumnos con adeudo sin teléfono/WhatsApp registrado. */
  adeudoSinTelefono: number
  /** Alumnos activos con algún plan asignado que está inactivo/archivado. */
  planInactivo: number
  /** Actividades cuya fecha de fin ya pasó pero siguen activas. */
  actividadesVencidas: number
  /** IDs de actividades vencidas (para navegación especial cuando hay solo 1). */
  actividadesVencidasIds?: string[]
  /** [info] Actividades activas cuya fecha de fin es hoy. */
  actividadesFinalizanHoy: number
  actividadesFinalizanHoyIds?: string[]
  /** [info] Actividades activas cuya fecha de fin es mañana. */
  actividadesPorFinalizar: number
  actividadesPorFinalizarIds?: string[]
  /** [info] Alumnos sin adeudo que no tienen teléfono/WhatsApp registrado. */
  sinAdeudoSinTelefono: number
  /** [info] Alumnos suspendidos con saldo en $0. */
  suspendidosSaldoCero: number
  /** Número de alertas activas (con casos > 0), contando cada alerta como 1 e incluyendo las informativas. */
  total: number
}

const VACIO: AlertasOperativas = {
  sinGrupo: 0,
  sinPlan: 0,
  adeudoSinTelefono: 0,
  planInactivo: 0,
  actividadesVencidas: 0,
  actividadesVencidasIds: [],
  actividadesFinalizanHoy: 0,
  actividadesFinalizanHoyIds: [],
  actividadesPorFinalizar: 0,
  actividadesPorFinalizarIds: [],
  sinAdeudoSinTelefono: 0,
  suspendidosSaldoCero: 0,
  total: 0,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function computeAlertasOperativas(supabase: any, academiaId?: string | null): Promise<AlertasOperativas> {
  if (!academiaId) return VACIO

  const hoy = new Date().toISOString().slice(0, 10)
  const mananaDate = new Date()
  mananaDate.setDate(mananaDate.getDate() + 1)
  const manana = mananaDate.toISOString().slice(0, 10)

  const [
    personasRes,
    planesRes,
    cargosRes,
    actividadesRes,
    actividadesPorFinalizarRes,
  ] = await Promise.all([
    supabase
      .from('persona')
      .select('id, estado_registro, telefono_whatsapp, grupo_id, plan_cobro_id, grupo:grupo_id (es_temporal)')
      .eq('academia_id', academiaId)
      .eq('etiqueta', 'alumno'),
    supabase
      .from('planes_cobro')
      .select('id, activo, frecuencia')
      .eq('academia_id', academiaId),
    supabase
      .from('cargo')
      .select('persona_id, saldo_pendiente')
      .in('estado_financiero', ['vencido', 'pendiente', 'parcial']),
    supabase
      .from('grupo')
      .select('id')
      .eq('academia_id', academiaId)
      .eq('es_temporal', true)
      .eq('estado', 'activo')
      .lt('fecha_fin', hoy),
    supabase
      .from('grupo')
      .select('id, fecha_fin')
      .eq('academia_id', academiaId)
      .eq('es_temporal', true)
      .eq('estado', 'activo')
      .in('fecha_fin', [hoy, manana]),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const personas: any[] = personasRes.data ?? []
  const activos = personas.filter((p) => p.estado_registro === 'activo')
  const inactivos = personas.filter((p) => p.estado_registro !== 'activo')
  const telById = new Map<string, string | null>(personas.map((p) => [p.id, p.telefono_whatsapp]))

  // Membresías activas: cualquier vínculo cuenta como "con grupo"; además se
  // distingue quién tiene al menos un grupo REGULAR (no actividad).
  const conGrupo = new Set<string>()
  const conGrupoRegular = new Set<string>()
  const planesPorAlumno = new Map<string, string[]>()

  for (const p of personas) {
    if (p.grupo_id) {
      conGrupo.add(p.id)
      if (p.grupo && p.grupo.es_temporal === false) {
        conGrupoRegular.add(p.id)
      }
    }
    if (p.plan_cobro_id) {
      planesPorAlumno.set(p.id, [p.plan_cobro_id])
    }
  }

  const planes: any[] = planesRes.data ?? []
  const planActivo = new Map<string, boolean>(planes.map((p) => [p.id, !!p.activo]))
  const planFrec = new Map<string, string>(planes.map((p) => [p.id, p.frecuencia]))

  const conAdeudo = new Set<string>()
  for (const c of (cargosRes.data ?? []) as { persona_id: string; saldo_pendiente: number | string }[]) {
    if (c.persona_id && Number(c.saldo_pendiente) > 0) conAdeudo.add(c.persona_id)
  }

  const tienePlanActivo = (id: string) =>
    (planesPorAlumno.get(id) ?? []).some((pid) => planActivo.get(pid) === true)
  const tienePorVisitaActivo = (id: string) =>
    (planesPorAlumno.get(id) ?? []).some((pid) => planActivo.get(pid) === true && planFrec.get(pid) === 'por_visita')
  const tienePlanInactivo = (id: string) =>
    (planesPorAlumno.get(id) ?? []).some((pid) => planActivo.get(pid) === false)

  const tieneTelefono = (id: string) => !!(telById.get(id) ?? '').toString().trim()

  // REGLA ESTRICTA: un alumno con plan por_visita no necesita grupo → no es falso positivo.
  const sinGrupo = activos.filter((p) => !conGrupo.has(p.id) && !tienePorVisitaActivo(p.id)).length
  // Un alumno cuyo único vínculo activo son actividades no requiere plan
  // (las actividades cobran por cargo único, no por esquema).
  const soloActividades = (id: string) => conGrupo.has(id) && !conGrupoRegular.has(id)
  const sinPlan = activos.filter((p) => !tienePlanActivo(p.id) && !soloActividades(p.id)).length
  const adeudoSinTelefono = personas.filter((p) => conAdeudo.has(p.id) && !tieneTelefono(p.id)).length
  const planInactivo = activos.filter((p) => tienePlanInactivo(p.id)).length
  const actividadesVencidasIds = (actividadesRes.data ?? []).map((t: { id: string }) => t.id)
  const actividadesVencidas = actividadesVencidasIds.length
  const actividadesFinalizanHoyIds = ((actividadesPorFinalizarRes.data ?? []) as { id: string; fecha_fin: string }[])
    .filter((t) => t.fecha_fin === hoy)
    .map((t) => t.id)
  const actividadesPorFinalizarIds = ((actividadesPorFinalizarRes.data ?? []) as { id: string; fecha_fin: string }[])
    .filter((t) => t.fecha_fin === manana)
    .map((t) => t.id)
  const actividadesFinalizanHoy = actividadesFinalizanHoyIds.length
  const actividadesPorFinalizar = actividadesPorFinalizarIds.length
  const sinAdeudoSinTelefono = personas.filter((p) => !conAdeudo.has(p.id) && !tieneTelefono(p.id)).length
  const suspendidosSaldoCero = inactivos.filter((p) => !conAdeudo.has(p.id)).length

  // Se cuentan ALERTAS (cada una vale 1 si tiene casos), incluidas las informativas — no los casos.
  const total = [
    sinGrupo,
    sinPlan,
    adeudoSinTelefono,
    planInactivo,
    actividadesVencidas,
    actividadesFinalizanHoy,
    actividadesPorFinalizar,
    sinAdeudoSinTelefono,
    suspendidosSaldoCero,
  ].filter((c) => c > 0).length

  return {
    sinGrupo,
    sinPlan,
    adeudoSinTelefono,
    planInactivo,
    actividadesVencidas,
    actividadesVencidasIds,
    actividadesFinalizanHoy,
    actividadesFinalizanHoyIds,
    actividadesPorFinalizar,
    actividadesPorFinalizarIds,
    sinAdeudoSinTelefono,
    suspendidosSaldoCero,
    total,
  }
}
