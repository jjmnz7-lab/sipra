export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount == null) return '$0.00'
  
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (isNaN(num)) return '$0.00'

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}
