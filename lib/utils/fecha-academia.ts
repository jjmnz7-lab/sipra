const ACADEMIA_TZ = 'America/Mazatlan'

/**
 * Devuelve un Date "falso-UTC": sus campos getUTC*() coinciden con el
 * calendario/reloj de pared de Mazatlán para el instante dado. Debe leerse
 * SIEMPRE con getUTC*() (nunca getFullYear/getMonth/getDate locales) para
 * que el resultado no dependa del huso horario del proceso que lo ejecuta.
 * Esto importa porque Vercel corre en UTC pero el dev local puede estar en
 * otro huso (p. ej. este equipo ya está en America/Mazatlan) — si se leyera
 * con accesores locales, el resultado sería correcto en un entorno e
 * incorrecto en el otro.
 */
export function zonedAcademia(date: Date): Date {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ACADEMIA_TZ,
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
 * "Ahora" en la zona horaria de las academias. Ver zonedAcademia() para las
 * reglas de lectura (getUTC*() siempre).
 */
export function ahoraAcademia(): Date {
  return zonedAcademia(new Date())
}
