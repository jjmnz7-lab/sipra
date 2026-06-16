import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Agrupación de cargos generados en masa para la sección
 * "Control de cargos grupales" de Reportes.
 *
 * Familias y llave de agrupación (lote):
 *  - mensualidad: cargos origen='recurrente' con frecuencia mensual,
 *    agrupados por (plan_id, periodo). Una tarjeta por plan y mes.
 *  - grupal: cargos origen='grupal' (a grupos o actividades), agrupados por
 *    el idempotency_key de la generación.
 *  - actividad: cargos de inscripción a una actividad (origen='actividad'),
 *    agrupados por la actividad. Se crean uno a uno conforme se inscriben.
 */

export type FamiliaLote = 'mensualidad' | 'grupal' | 'actividad'
export type VisibilidadLote = 'visible' | 'archivado'

export type AlumnoEnLote = {
  personaId: string
  nombre: string
  apellido: string | null
  /** 'activo' | 'suspendido' (estado_registro de persona). */
  estadoRegistro: string
  montoOriginal: number
  saldoPendiente: number
}

export type LoteCargos = {
  clave: string
  familia: FamiliaLote
  titulo: string
  /** Contexto secundario: grupo/actividad del cargo o plan de la mensualidad. */
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
 */
export function agruparLotesCargos(
  cargos: CargoRow[],
  grupos: GrupoLite[],
  planes: GrupoLite[] = [],
  ahora: Date = new Date(),
): LoteCargos[] {
  const grupoById = new Map(grupos.map((g) => [g.id, g.nombre]))
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
      const clavePeriodo = periodo || c.concepto.toLowerCase().trim().replace(/\s+/g, '-')
      clave = `m_${meta.plan_id}_${clavePeriodo}`
      familia = 'mensualidad'
      contexto = meta.plan_nombre ?? planById.get(meta.plan_id) ?? null
    } else if (c.origen === 'grupal') {
      const grupoId = meta.grupo_id ?? c.grupo_id_origen
      const idem = meta.idempotency_key
      // Fallback para lotes históricos sin llave: concepto + día de creación.
      clave = idem
        ? `g_${idem}`
        : `g_${grupoId ?? 'x'}_${c.concepto.toLowerCase().trim()}_${c.created_at.slice(0, 10)}`
      familia = 'grupal'
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

    for (const c of acc.cargos) {
      const monto = Number(c.monto_original)
      const saldo = Number(c.saldo_pendiente)
      total += monto
      pendiente += saldo
      if (c.created_at > fechaLote) fechaLote = c.created_at
      if (c.updated_at > ultimoMovimiento) ultimoMovimiento = c.updated_at

      const prev = porPersona.get(c.persona_id)
      if (prev) {
        prev.montoOriginal += monto
        prev.saldoPendiente += saldo
      } else {
        porPersona.set(c.persona_id, {
          personaId: c.persona_id,
          nombre: c.persona?.nombre ?? 'Alumno',
          apellido: c.persona?.apellido ?? null,
          estadoRegistro: c.persona?.estado_registro ?? 'activo',
          montoOriginal: monto,
          saldoPendiente: saldo,
        })
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

    resultado.push({
      clave,
      familia: acc.familia,
      titulo: acc.titulo,
      contexto: acc.contexto,
      total,
      cobrado,
      pendiente,
      pct: Math.round((cobrado / total) * 100),
      fechaLote,
      visibilidad,
      alumnos,
    })
  }

  return resultado
}

/** Trae los cargos masivos de la academia y los devuelve agrupados en lotes. */
export async function fetchLotesCargos(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  academiaId: string,
): Promise<LoteCargos[]> {
  const [cargosRes, gruposRes, planesRes] = await Promise.all([
    supabase
      .from('cargo')
      .select(
        'id, persona_id, concepto, monto_original, saldo_pendiente, origen, metadata, created_at, updated_at, grupo_id_origen, persona:persona_id (nombre, apellido, estado_registro)',
      )
      .eq('academia_id', academiaId)
      .in('origen', ['grupal', 'recurrente', 'actividad'])
      .neq('estado_financiero', 'anulado'),
    supabase.from('grupo').select('id, nombre').eq('academia_id', academiaId),
    supabase.from('planes_cobro').select('id, nombre').eq('academia_id', academiaId),
  ])

  const cargos = (cargosRes.data ?? []) as unknown as CargoRow[]
  const grupos = (gruposRes.data ?? []) as GrupoLite[]
  const planes = (planesRes.data ?? []) as GrupoLite[]
  return agruparLotesCargos(cargos, grupos, planes)
}
