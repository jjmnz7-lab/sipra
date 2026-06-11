/**
 * Guards de negocio reutilizables para las server actions.
 */

/**
 * Devuelve true si el alumno NO está activo (suspendido / dado de baja).
 * Se usa para impedir la generación de cargos $ a alumnos suspendidos
 * (cargos manuales, individuales, masivos, visitas, inscripciones a actividades).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function alumnoSuspendido(supabase: any, academiaId: string, personaId: string): Promise<boolean> {
  if (!personaId) return false
  const { data } = await supabase
    .from('persona')
    .select('estado_registro')
    .eq('id', personaId)
    .eq('academia_id', academiaId)
    .single()
  return !!data && data.estado_registro !== 'activo'
}

export const MSG_ALUMNO_SUSPENDIDO =
  'El alumno está suspendido: no se le pueden generar cargos. Reactívalo primero.'
