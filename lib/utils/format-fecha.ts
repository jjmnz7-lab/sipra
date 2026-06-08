/**
 * Formatea una fecha YYYY-MM-DD a "DD MMM" en es-MX (sin punto final).
 * Devuelve string vacío si la fecha es inválida o nula.
 */
export function formatFechaCorta(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) return dateStr
  const date = new Date(year, month - 1, day)
  const formatted = date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  return formatted.replace(/\.$/, '')
}
