import { createClient } from '@/lib/supabase/server'
import { FabOperativo } from '@/components/layout/fab-operativo'
import { InicioClientView, type AlumnoConDeuda } from './inicio-client-view'
import { clasificarAlumno } from '@/lib/constants/alumno-finanzas'
import { ahoraAcademia } from '@/lib/utils/fecha-academia'

export default async function InicioPage() {
  const supabase = await createClient()

  // 0. Bandera de abonos parciales de la academia
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id
  const { data: academia } = await supabase
    .from('academia')
    .select('allow_partial_payments, allow_overpayment, timezone')
    .eq('id', academiaId)
    .single() as any
  const allowPartial = academia?.allow_partial_payments ?? true
  const allowOverpayment = academia?.allow_overpayment ?? true
  const timezone = academia?.timezone || 'America/Mexico_City'

  // 1. Alumnos activos (para el FAB: cargo individual y búsqueda de visita)
  const { data: alumnos } = await supabase
    .from('persona')
    .select('id, nombre, apellido, plan_cobro_id')
    .eq('etiqueta', 'alumno')
    .eq('estado_registro', 'activo')
    .order('nombre') as any

  // 1c. Grupos regulares activos + miembros (para el FAB: cargo masivo).
  // Las actividades se gestionan desde su propia pantalla.
  const { data: gruposRaw } = await supabase
    .from('grupo')
    .select('id, nombre, color, emoji')
    .eq('estado', 'activo')
    .eq('es_temporal', false)
    .order('nombre') as any

  // 1d. Catálogo completo de planes activos (para el drawer de edición de alumno)
  const { data: planesCatalogo } = await supabase
    .from('planes_cobro')
    .select('id, nombre, monto, frecuencia')
    .eq('academia_id', academiaId)
    .eq('activo', true)
    .order('nombre') as any

  // 1e. Planes asignados por alumno
  const planIdsPorAlumno = new Map<string, string[]>()
  for (const a of (alumnos ?? [])) {
    if (a.plan_cobro_id) {
      planIdsPorAlumno.set(a.id, [a.plan_cobro_id])
    }
  }

  const gruposParaEditar = (gruposRaw ?? []).map((g: any) => ({
    id: g.id,
    nombre: g.nombre,
    color: g.color ?? null,
    emoji: g.emoji ?? null,
    plan_sugerido_id: null,
  }))
  const planesParaEditar = (planesCatalogo ?? []).map((p: any) => ({
    id: p.id,
    nombre: p.nombre,
    monto: Number(p.monto ?? 0),
    frecuencia: p.frecuencia,
  }))

  const { data: pgMiembros } = await supabase
    .from('persona')
    .select('grupo_id, id, nombre, apellido, estado_registro, beca_activa, beca_porcentaje')
    .eq('academia_id', academiaId)
    .eq('etiqueta', 'alumno')
    .eq('estado_registro', 'activo')
    .not('grupo_id', 'is', null) as any

  // Solo alumnos activos: a los suspendidos no se les pueden generar cargos.
  const miembrosPorGrupo = new Map<string, { persona: { id: string; nombre: string; apellido: string | null; beca_activa?: boolean; beca_porcentaje?: number } }[]>()
  for (const r of (pgMiembros ?? [])) {
    if (!r.grupo_id) continue
    const arr = miembrosPorGrupo.get(r.grupo_id) ?? []
    arr.push({ persona: {
      id: r.id,
      nombre: r.nombre,
      apellido: r.apellido ?? '',
      beca_activa: !!r.beca_activa,
      beca_porcentaje: r.beca_porcentaje ?? 0,
    } })
    miembrosPorGrupo.set(r.grupo_id, arr)
  }

  // Catálogo de cobros frecuentes (para el combobox de concepto en el FAB).
  const { data: cobrosFrecuentes } = await supabase
    .from('cobros_frecuentes')
    .select('id, concepto, monto')
    .eq('academia_id', academiaId)
    .eq('activo', true)
    .order('concepto', { ascending: true }) as any

  const gruposParaCargo = (gruposRaw ?? []).map((g: any) => ({
    id: g.id,
    nombre: g.nombre,
    color: g.color ?? null,
    emoji: g.emoji ?? null,
    inscripciones: miembrosPorGrupo.get(g.id) ?? [],
  }))

  // 2. Cargos vencidos, parciales o pendientes con abonos
  const { data: cargos } = await supabase
    .from('cargo')
    .select(`
      id, concepto, monto_original, saldo_pendiente, fecha_vencimiento, estado_financiero, persona_id,
      persona (
        nombre,
        apellido,
        telefono_whatsapp,
        codigo_pais,
        email,
        estado_registro,
        grupo:grupo_id (
          id,
          nombre,
          color,
          emoji
        )
      ),
      aplicacion_movimiento (
        id,
        monto_aplicado,
        estado,
        movimiento (
          id,
          fecha_pago,
          metodo_pago
        )
      )
    `)
    .in('estado_financiero', ['vencido', 'pendiente', 'parcial'])
    .order('fecha_vencimiento', { ascending: true }) as { data: any[] | null; error: unknown }

  // 3. Agrupar cargos por alumno (persona_id)
  const alumnosConDeudaMap: Record<string, AlumnoConDeuda> = {}
  if (cargos) {
    for (const cargo of cargos) {
      if (!cargo.persona_id) continue
      if (!alumnosConDeudaMap[cargo.persona_id]) {
        const grupo = cargo.persona?.grupo ?? null
        const grupoNombre = grupo?.nombre ?? 'Sin grupo'

        alumnosConDeudaMap[cargo.persona_id] = {
          persona_id: cargo.persona_id,
          persona: {
            nombre: cargo.persona?.nombre ?? '—',
            apellido: cargo.persona?.apellido ?? '',
            telefono_whatsapp: cargo.persona?.telefono_whatsapp ?? null,
            codigo_pais: cargo.persona?.codigo_pais ?? null,
            estado_registro: cargo.persona?.estado_registro ?? 'activo',
            grupo_nombre: grupoNombre,
            grupo: grupo
              ? { id: grupo.id ?? null, nombre: grupo.nombre ?? grupoNombre, color: grupo.color ?? null, emoji: grupo.emoji ?? null }
              : null,
          },
          email: cargo.persona?.email ?? null,
          planIds: planIdsPorAlumno.get(cargo.persona_id) ?? [],
          cargos: [],
          totalAdeudado: 0,
          cargosCount: 0,
          estado: 'pendiente',
          estadoFinanciero: 'pendiente',
        }
      }

      const alumno = alumnosConDeudaMap[cargo.persona_id]
      alumno.cargos.push(cargo)
      alumno.totalAdeudado += Number(cargo.saldo_pendiente)
      alumno.cargosCount += 1
    }
  }

  // 4. Clasificar con la misma escala financiera usada en /alumnos.
  const now = ahoraAcademia(timezone)
  const alumnosConDeudaList: AlumnoConDeuda[] = Object.values(alumnosConDeudaMap).map((alumno) => {
    const estadoFinanciero = clasificarAlumno(alumno.cargos, now)
    alumno.estadoFinanciero = estadoFinanciero
    alumno.estado = estadoFinanciero === 'urgente' ? 'critico' : 'pendiente'
    return alumno
  })

  // 5. Lista para "Registrar cobro" del FAB. Permite cobrar a CUALQUIER alumno
  //    activo (con o sin adeudo: si no debe, el cobro queda como saldo a favor),
  //    más los suspendidos que tengan adeudo (para poder liquidarles).
  const deudaPorPersona = new Map<string, { cargoIds: string[]; saldoTotal: number }>()
  for (const a of alumnosConDeudaList) {
    deudaPorPersona.set(a.persona_id, { cargoIds: a.cargos.map((c: any) => c.id), saldoTotal: a.totalAdeudado })
  }
  const activosIds = new Set<string>((alumnos ?? []).map((a: any) => a.id))
  const alumnosParaCobro = [
    ...(alumnos ?? []).map((a: any) => ({
      persona_id: a.id,
      nombre: a.nombre,
      apellido: a.apellido ?? '',
      ...(deudaPorPersona.get(a.id) ?? { cargoIds: [], saldoTotal: 0 }),
    })),
    ...alumnosConDeudaList
      .filter((a) => !activosIds.has(a.persona_id))
      .map((a) => ({
        persona_id: a.persona_id,
        nombre: a.persona.nombre,
        apellido: a.persona.apellido,
        cargoIds: a.cargos.map((c: any) => c.id),
        saldoTotal: a.totalAdeudado,
      })),
  ]

  return (
    <>
      <InicioClientView
        alumnos={alumnosConDeudaList}
        allowPartial={allowPartial}
        allowOverpayment={allowOverpayment}
        gruposEditar={gruposParaEditar}
        planesEditar={planesParaEditar}
      />

      <FabOperativo
        alumnos={alumnos || []}
        alumnosConDeuda={alumnosParaCobro}
        grupos={gruposParaCargo}
        cobros={cobrosFrecuentes || []}
        allowPartial={allowPartial}
        allowOverpayment={allowOverpayment}
      />
    </>
  )
}
