import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Agrupación de cargos generados en masa para la sección
 * "Control de cargos grupales" de Reportes.
 *
 * Familias y llave de agrupación (lote):
 *  - mensualidad: cargos origen='recurrente' con frecuencia mensual,
 *    agrupados SOLO por periodo. Una tarjeta por mes, aunque existan varios
 *    esquemas/planes de mensualidad (ej. "1 día"/"5 días", o "Diablos"/
 *    "Hermanos"): el detalle del lote permite filtrar por esquema.
 *  - grupal: cargos origen='grupal' (a grupos o actividades), agrupados por
 *    el idempotency_key de la generación.
 *  - actividad: cargos de inscripción a una actividad (origen='actividad'),
 *    agrupados por la actividad. Se crean uno a uno conforme se inscriben.
 */

export type FamiliaLote = 'mensualidad' | 'grupal' | 'actividad'
export type VisibilidadLote = 'visible' | 'archivado'

/** Grupo incluido en un lote masivo multi-grupo (para filtros del detalle). */
export type GrupoMeta = {
  id: string
  nombre: string
  color: string | null
  emoji: string | null
}

/** Esquema (plan de cobro) incluido en un lote de mensualidad (para filtros del detalle). */
export type EsquemaMeta = {
  id: string
  nombre: string
}

/** Desglose del adeudo de un alumno dentro de un grupo concreto del lote. */
export type AlumnoGrupoEnLote = {
  grupoId: string
  montoOriginal: number
  saldoPendiente: number
}

/** Desglose del adeudo de un alumno dentro de un esquema concreto del lote (mensualidad). */
export type AlumnoEsquemaEnLote = {
  esquemaId: string
  montoOriginal: number
  saldoPendiente: number
}

export type AlumnoEnLote = {
  personaId: string
  nombre: string
  apellido: string | null
  /** 'activo' | 'suspendido' (estado_registro de persona). */
  estadoRegistro: string
  montoOriginal: number
  saldoPendiente: number
  /**
   * Desglose por grupo. En lotes grupales es un split real (cada grupo tiene
   * su propio cargo). En lotes de mensualidad NO es un split — cada entrada
   * repite el monto TOTAL del alumno, solo para "etiquetar" a qué grupo(s)
   * pertenece hoy (la mensualidad no se reparte por grupo).
   */
  grupos: AlumnoGrupoEnLote[]
  /** Desglose por esquema/plan (solo lotes de mensualidad). Split real: cada esquema es un cargo distinto. */
  esquemas: AlumnoEsquemaEnLote[]
}

export type LoteCargos = {
  clave: string
  familia: FamiliaLote
  titulo: string
  /** Contexto secundario: grupo/actividad del cargo, o esquema(s) de la mensualidad. */
  contexto: string | null
  total: number
  cobrado: number
  pendiente: number
  /** Porcentaje cobrado (0–100, redondeado). */
  pct: number
  /** Fecha del cargo más reciente del lote (ISO). Referencia de antigüedad. */
  fechaLote: string
  visibilidad: VisibilidadLote
  alumnos: AlumnoEnLote[]
  /**
   * Grupos incluidos (lotes grupales: grupos realmente cobrados; lotes de
   * mensualidad: unión de grupos actuales de los alumnos del lote). >1 ⇒
   * aparece el filtro por grupo en el detalle.
   */
  grupos: GrupoMeta[]
  /** Esquemas/planes incluidos (solo mensualidad). >1 ⇒ aparece el filtro por esquema. */
  esquemas: EsquemaMeta[]
}

type CargoRow = {
  id: string
  persona_id: string
  concepto: string
  monto_original: number | string
  saldo_pendiente: number | string
  origen: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any> | null
  created_at: string
  updated_at: string
  grupo_id_origen: string | null
  persona: { nombre: string; apellido: string | null; estado_registro: string } | null
}

type GrupoLite = { id: string; nombre: string }

function addMonths(iso: string, meses: number): Date {
  const d = new Date(iso)
  d.setMonth(d.getMonth() + meses)
  return d
}

function addDays(iso: string, dias: number): Date {
  const d = new Date(iso)
  d.setDate(d.getDate() + dias)
  return d
}

/**
 * Agrupa cargos crudos en lotes con totales y visibilidad. Reglas:
 *  - Lote 100% cobrado: visible 10 días después del último pago; luego se
 *    descarta por completo (no aparece ni en archivados).
 *  - Con deuda pero sin deudores activos (solo suspendidos) → archivado.
 *  - Con deudores activos y más de 3 meses de antigüedad → archivado.
 *  - Con deudores activos dentro de los últimos 3 meses → visible.
 *
 * @param personaGruposActuales Grupos regulares ACTUALES de cada alumno
 *   (persona_id → grupos). Solo se usa para etiquetar por grupo los lotes de
 *   mensualidad (esos cargos no guardan grupo_id); no afecta a los grupales,
 *   que ya traen su propio grupo_id en cada cargo.
 */
export function agruparLotesCargos(
  cargos: CargoRow[],
  grupos: GrupoMeta[],
  planes: GrupoLite[] = [],
  personaGruposActuales: Map<string, GrupoMeta[]> = new Map(),
  ahora: Date = new Date(),
): LoteCargos[] {
  const grupoById = new Map(grupos.map((g) => [g.id, g.nombre]))
  const grupoMetaById = new Map(grupos.map((g) => [g.id, g]))
  const planById = new Map(planes.map((p) => [p.id, p.nombre]))

  type Acc = {
    familia: FamiliaLote
    titulo: string
    contexto: string | null
    cargos: CargoRow[]
  }
  const lotes = new Map<string, Acc>()

  for (const c of cargos) {
    const meta = c.metadata ?? {}
    let clave: string
    let familia: FamiliaLote
    let titulo = c.concepto
    let contexto: string | null = null

    if (c.origen === 'recurrente') {
      // Solo mensualidades; las cuotas semanales no se reportan aquí.
      const periodo = String(meta.periodo ?? '')
      if (meta.frecuencia === 'semanal' || periodo.startsWith('W')) continue
      if (!meta.plan_id) continue
      // Cargos históricos sin metadata.periodo: el concepto ya identifica el mes.
      // Clave SOLO por periodo (no por plan): todos los esquemas del mes
      // colapsan en una sola tarjeta; el detalle permite filtrar por esquema.
      const clavePeriodo = periodo || c.concepto.toLowerCase().trim().replace(/\s+/g, '-')
      clave = `m_${clavePeriodo}`
      familia = 'mensualidad'
      contexto = meta.plan_nombre ?? planById.get(meta.plan_id) ?? null
    } else if (c.origen === 'grupal') {
      const grupoId = meta.grupo_id ?? c.grupo_id_origen
      const loteId = meta.lote_id
      const idem = meta.idempotency_key
      // Lotes masivos multi-grupo comparten lote_id ⇒ colapsan en una sola
      // tarjeta. Fallback histórico: idempotency_key; o concepto + día.
      clave = loteId
        ? `g_lote_${loteId}`
        : idem
          ? `g_${idem}`
          : `g_${grupoId ?? 'x'}_${c.concepto.toLowerCase().trim()}_${c.created_at.slice(0, 10)}`
      familia = 'grupal'
      // El contexto/grupos definitivos se calculan al cerrar el lote (puede ser
      // multi-grupo). Aquí se deja el nombre del primer grupo como provisional.
      contexto = grupoId ? (grupoById.get(grupoId) ?? null) : null
    } else if (c.origen === 'actividad') {
      const grupoId = meta.grupo_id ?? c.grupo_id_origen
      if (!grupoId) continue
      clave = `a_${grupoId}`
      familia = 'actividad'
      titulo = grupoById.get(grupoId) ?? c.concepto
      contexto = 'Inscripciones'
    } else {
      continue
    }

    const acc = lotes.get(clave)
    if (acc) acc.cargos.push(c)
    else lotes.set(clave, { familia, titulo, contexto, cargos: [c] })
  }

  const resultado: LoteCargos[] = []

  for (const [clave, acc] of lotes) {
    let total = 0
    let pendiente = 0
    let fechaLote = ''
    let ultimoMovimiento = ''
    const porPersona = new Map<string, AlumnoEnLote>()
    const grupoIds = new Set<string>()
    const esquemaIds = new Set<string>()

    for (const c of acc.cargos) {
      const monto = Number(c.monto_original)
      const saldo = Number(c.saldo_pendiente)
      total += monto
      pendiente += saldo
      if (c.created_at > fechaLote) fechaLote = c.created_at
      if (c.updated_at > ultimoMovimiento) ultimoMovimiento = c.updated_at

      const grupoId: string | null = (c.metadata?.grupo_id as string | undefined) ?? c.grupo_id_origen ?? null
      if (grupoId) grupoIds.add(grupoId)
      const esquemaId: string | null = (c.metadata?.plan_id as string | undefined) ?? null
      if (esquemaId) esquemaIds.add(esquemaId)

      let alumno = porPersona.get(c.persona_id)
      if (alumno) {
        alumno.montoOriginal += monto
        alumno.saldoPendiente += saldo
      } else {
        alumno = {
          personaId: c.persona_id,
          nombre: c.persona?.nombre ?? 'Alumno',
          apellido: c.persona?.apellido ?? null,
          estadoRegistro: c.persona?.estado_registro ?? 'activo',
          montoOriginal: monto,
          saldoPendiente: saldo,
          grupos: [],
          esquemas: [],
        }
        porPersona.set(c.persona_id, alumno)
      }

      // Desglose por grupo (para filtros del detalle en lotes grupales multi-grupo).
      if (grupoId) {
        const gb = alumno.grupos.find((x) => x.grupoId === grupoId)
        if (gb) {
          gb.montoOriginal += monto
          gb.saldoPendiente += saldo
        } else {
          alumno.grupos.push({ grupoId, montoOriginal: monto, saldoPendiente: saldo })
        }
      }

      // Desglose por esquema (para filtros del detalle en lotes de mensualidad multi-esquema).
      if (esquemaId) {
        const eb = alumno.esquemas.find((x) => x.esquemaId === esquemaId)
        if (eb) {
          eb.montoOriginal += monto
          eb.saldoPendiente += saldo
        } else {
          alumno.esquemas.push({ esquemaId, montoOriginal: monto, saldoPendiente: saldo })
        }
      }
    }

    // Mensualidad: el cargo no guarda grupo_id (no se reparte por grupo), así
    // que se etiqueta cada alumno con sus grupos ACTUALES. No es un split: se
    // repite el total del alumno en cada grupo al que pertenece hoy.
    if (acc.familia === 'mensualidad') {
      for (const alumno of porPersona.values()) {
        const gruposDelAlumno = personaGruposActuales.get(alumno.personaId) ?? []
        for (const g of gruposDelAlumno) {
          grupoIds.add(g.id)
          alumno.grupos.push({ grupoId: g.id, montoOriginal: alumno.montoOriginal, saldoPendiente: alumno.saldoPendiente })
        }
      }
    }

    if (total <= 0) continue
    const cobrado = total - pendiente

    let visibilidad: VisibilidadLote
    if (pendiente <= 0) {
      // Liquidado al 100%: 10 días de gracia desde el último pago y desaparece.
      if (addDays(ultimoMovimiento, 10) < ahora) continue
      visibilidad = 'visible'
    } else {
      const hayDeudorActivo = Array.from(porPersona.values()).some(
        (a) => a.saldoPendiente > 0 && a.estadoRegistro === 'activo',
      )
      if (!hayDeudorActivo) visibilidad = 'archivado'
      else if (addMonths(fechaLote, 3) < ahora) visibilidad = 'archivado'
      else visibilidad = 'visible'
    }

    const alumnos = Array.from(porPersona.values()).sort((a, b) =>
      `${a.nombre} ${a.apellido ?? ''}`.localeCompare(`${b.nombre} ${b.apellido ?? ''}`, 'es'),
    )

    // Grupos del lote (grupal: grupos realmente cobrados; mensualidad: unión
    // de grupos actuales de sus alumnos). Orden estable por nombre.
    const gruposLote: GrupoMeta[] =
      acc.familia === 'grupal' || acc.familia === 'mensualidad'
        ? Array.from(grupoIds)
            .map((id) => grupoMetaById.get(id) ?? { id, nombre: grupoById.get(id) ?? 'Grupo', color: null, emoji: null })
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        : []

    // Esquemas del lote (solo mensualidad). Orden estable por nombre.
    const esquemasLote: EsquemaMeta[] =
      acc.familia === 'mensualidad'
        ? Array.from(esquemaIds)
            .map((id) => ({ id, nombre: planById.get(id) ?? 'Esquema' }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        : []

    // Contexto: si tiene >1 grupo (masivo), "N grupos"; si no, para mensualidad
    // multi-esquema, "N esquemas"; con uno solo, su nombre.
    const contexto =
      gruposLote.length > 1
        ? `${gruposLote.length} grupos`
        : acc.familia === 'grupal'
          ? (gruposLote[0]?.nombre ?? acc.contexto)
          : acc.familia === 'mensualidad'
            ? esquemasLote.length > 1
              ? `${esquemasLote.length} esquemas`
              : (esquemasLote[0]?.nombre ?? acc.contexto)
            : acc.contexto

    resultado.push({
      clave,
      familia: acc.familia,
      titulo: acc.titulo,
      contexto,
      total,
      cobrado,
      pendiente,
      pct: Math.round((cobrado / total) * 100),
      fechaLote,
      visibilidad,
      alumnos,
      grupos: gruposLote,
      esquemas: esquemasLote,
    })
  }

  return resultado
}

type PersonaGrupoRow = { persona_id: string; grupo: { id: string; nombre: string; color: string | null; emoji: string | null; es_temporal: boolean } | null }

/** Trae los cargos masivos de la academia y los devuelve agrupados en lotes. */
export async function fetchLotesCargos(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  academiaId: string,
): Promise<LoteCargos[]> {
  const [cargosRes, gruposRes, planesRes, personasRes] = await Promise.all([
    supabase
      .from('cargo')
      .select(
        'id, persona_id, concepto, monto_original, saldo_pendiente, origen, metadata, created_at, updated_at, grupo_id_origen, persona:persona_id (nombre, apellido, estado_registro)',
      )
      .eq('academia_id', academiaId)
      .in('origen', ['grupal', 'recurrente', 'actividad'])
      .neq('estado_financiero', 'anulado'),
    supabase.from('grupo').select('id, nombre, color, emoji').eq('academia_id', academiaId),
    supabase.from('planes_cobro').select('id, nombre').eq('academia_id', academiaId),
    // Membresía ACTUAL de grupo por alumno (solo grupos regulares, no actividades),
    // usada para etiquetar por grupo los lotes de mensualidad.
    supabase
      .from('persona')
      .select('id, grupo:grupo_id (id, nombre, color, emoji, es_temporal)')
      .eq('academia_id', academiaId)
      .eq('etiqueta', 'alumno')
      .eq('estado_registro', 'activo'),
  ])

  const cargos = (cargosRes.data ?? []) as unknown as CargoRow[]
  const grupos = (gruposRes.data ?? []) as GrupoMeta[]
  const planes = (planesRes.data ?? []) as GrupoLite[]

  const personaGruposActuales = new Map<string, GrupoMeta[]>()
  for (const row of (personasRes.data ?? []) as any) {
    const g = row.grupo
    if (!g || g.es_temporal) continue // solo grupos regulares (mismo criterio que el resto de la app)
    personaGruposActuales.set(row.id, [{ id: g.id, nombre: g.nombre, color: g.color, emoji: g.emoji }])
  }

  return agruparLotesCargos(cargos, grupos, planes, personaGruposActuales)
}
