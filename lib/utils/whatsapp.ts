import { formatCurrency } from './currency'

export function buildWhatsAppUrl(telefono: string | null | undefined, mensaje: string): string {
  if (!telefono) return '#'
  const clean = telefono.replace(/\D/g, '')
  return `https://wa.me/${clean}?text=${encodeURIComponent(mensaje)}`
}

export function buildRecordatorioMensaje(params: {
  nombre: string
  academia: string
  monto: number
  concepto: string
}): string {
  return `Hola ${params.nombre}, te escribimos de ${params.academia} para recordarte tu pago pendiente de ${formatCurrency(params.monto)} por concepto de: ${params.concepto}. ¡Gracias!`
}
