'use server'

import { createClient } from '@/lib/supabase/server'

export type MovimientoIngreso = {
  id: string
  fecha_pago: string
  metodo_pago: string
  monto_total: number
  estado: string
  referencia: string | null
  alumno: {
    nombre: string
    apellido: string | null
  }
  concepto: string
}

interface MovimientoRow {
  id: string
  fecha_pago: string
  metodo_pago: string
  monto_total: number
  estado: string
  referencia: string | null
  persona: {
    nombre: string
    apellido: string | null
  } | null
  aplicaciones: {
    cargo: {
      concepto: string
    } | null
  }[] | null
}

export async function listarMovimientosIngresosAction(offset: number = 0, limit: number = 20) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const academiaId = user?.app_metadata?.academia_id
  if (!academiaId) {
    throw new Error('No autorizado')
  }

  // Obtenemos los movimientos con su persona asociada, y las aplicaciones correspondientes con su cargo
  const { data, error } = await supabase
    .from('movimiento')
    .select(`
      id,
      fecha_pago,
      metodo_pago,
      monto_total,
      estado,
      referencia,
      persona:persona_id (
        nombre,
        apellido
      ),
      aplicaciones:aplicacion_movimiento (
        cargo:cargo_id (
          concepto
        )
      )
    `)
    .eq('academia_id', academiaId)
    .order('fecha_pago', { ascending: false })
    .range(offset, offset + limit) as unknown as { data: MovimientoRow[] | null; error: unknown }

  if (error) {
    console.error('Error fetching movimientos:', error)
    return { movimientos: [], hasMore: false }
  }

  const rows = (data ?? []).map((row) => {
    // Resolver el concepto del movimiento:
    // Si hay aplicaciones, unimos los conceptos de los cargos aplicados.
    // Si no hay (ej. anticipo/saldo a favor), podemos poner "Abono / Saldo a favor" o "Abono a cuenta".
    const conceptosList = row.aplicaciones
      ?.map((a) => a.cargo?.concepto)
      .filter(Boolean) ?? []
    
    let concepto = 'Abono a cuenta'
    if (conceptosList.length > 0) {
      // De-duplicar conceptos
      concepto = Array.from(new Set(conceptosList)).join(', ')
    } else if (row.referencia) {
      concepto = row.referencia
    }

    return {
      id: row.id,
      fecha_pago: row.fecha_pago,
      metodo_pago: row.metodo_pago,
      monto_total: Number(row.monto_total),
      estado: row.estado,
      referencia: row.referencia,
      alumno: {
        nombre: row.persona?.nombre ?? 'Desconocido',
        apellido: row.persona?.apellido ?? null,
      },
      concepto,
    }
  })

  const hasMore = rows.length > limit
  const movimientos = hasMore ? rows.slice(0, limit) : rows

  return { movimientos, hasMore }
}
