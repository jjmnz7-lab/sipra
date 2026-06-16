export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount == null) return '$0'
  
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (isNaN(num)) return '$0'

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

/** "$5,500" sin centavos para espacios compactos. */
export function formatCurrencyCompact(amount: number | string | null | undefined): string {
  if (amount == null) return '$0'

  const num = typeof amount === 'string' ? parseFloat(amount) : amount

  if (isNaN(num)) return '$0'

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}
