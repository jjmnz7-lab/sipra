export const ACADEMIA_TZ_FALLBACK = 'America/Mexico_City'

/**
 * Devuelve un Date "falso-UTC": sus campos getUTC*() coinciden con el
 * calendario/reloj de pared de la zona horaria dada para el instante dado.
 * Debe leerse SIEMPRE con getUTC*() (nunca getFullYear/getMonth/getDate
 * locales) para que el resultado no dependa del huso horario del proceso
 * que lo ejecuta. Esto importa porque Vercel corre en UTC pero el dev local
 * puede estar en otro huso (p. ej. este equipo ya está en America/Mazatlan)
 * — si se leyera con accesores locales, el resultado sería correcto en un
 * entorno e incorrecto en el otro.
 */
export function zonedAcademia(date: Date, timezone: string): Date {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type: string) => Number(partes.find((p) => p.type === type)?.value ?? 0)

  return new Date(
    Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second')),
  )
}

/**
 * "Ahora" en la zona horaria dada. Ver zonedAcademia() para las reglas de
 * lectura (getUTC*() siempre). Cada academia tiene su propio timezone
 * (columna academia.timezone) — no todas están en la misma zona, así que el
 * caller SIEMPRE debe pasar el timezone real de la academia en cuestión
 * (usar obtenerTimezoneAcademia() para obtenerlo).
 */
export function ahoraAcademia(timezone: string): Date {
  return zonedAcademia(new Date(), timezone)
}

/**
 * Lee academia.timezone. Usar cuando la página no necesita ninguna otra
 * columna de `academia` (si ya se hace un select de `academia` por otra
 * razón, agregar `timezone` a ese select y evitar esta segunda consulta).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function obtenerTimezoneAcademia(supabase: any, academiaId: string): Promise<string> {
  const { data } = await supabase
    .from('academia')
    .select('timezone')
    .eq('id', academiaId)
    .single()
  return data?.timezone || ACADEMIA_TZ_FALLBACK
}
