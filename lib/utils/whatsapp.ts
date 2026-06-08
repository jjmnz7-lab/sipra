import { formatCurrency } from './currency'

export type TonoRecordatorio = 'amigable' | 'formal' | 'urgente'

export interface CargoRecordatorio {
  id: string
  concepto: string
  monto_original: number | string
  saldo_pendiente: number | string
  fecha_vencimiento: string
  aplicacion_movimiento?: {
    id: string
    monto_aplicado: number | string
    estado: string
    movimiento?: {
      id: string
      fecha_pago: string
      metodo_pago: string
    } | null
  }[] | null
}

function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date()
  if (dateStr.includes('T')) return new Date(dateStr)
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const year = parseInt(parts[0] || '0', 10)
    const month = parseInt(parts[1] || '0', 10) - 1
    const day = parseInt(parts[2] || '0', 10)
    return new Date(year, month, day)
  }
  return new Date(dateStr)
}

function formatCompactDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = parseLocalDate(dateStr)
    if (isNaN(d.getTime())) return ''
    const day = d.getDate()
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    const month = months[d.getMonth()]
    return `${day}/${month}`
  } catch {
    return ''
  }
}

export function formatDesgloseCargos(cargos: CargoRecordatorio[]): string {
  if (!cargos || cargos.length === 0) return ''

  let text = '*Detalle del saldo:*\n'
  cargos.forEach((c) => {
    const monto = formatCurrency(Number(c.monto_original))
    const fecha = formatCompactDate(c.fecha_vencimiento)
    const fechaPart = fecha ? ` (${fecha})` : ''
    text += `• ${c.concepto}${fechaPart}: ${monto}\n`

    // Filtrar abonos activos
    const abonos = c.aplicacion_movimiento?.filter(am => am.estado === 'activa') || []
    abonos.forEach((ab) => {
      const montoAb = formatCurrency(Number(ab.monto_aplicado))
      const fechaPagoStr = ab.movimiento?.fecha_pago
      const fechaAb = fechaPagoStr ? formatCompactDate(fechaPagoStr) : ''
      const fechaAbPart = fechaAb ? ` (${fechaAb})` : ''
      text += `  ↳ Abono${fechaAbPart}: -${montoAb}\n`
    })
  })

  return text
}

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
  desglose?: string
}): string {
  return buildRecordatorioConTono(params, 'amigable')
}

export function buildRecordatorioConTono(
  params: {
    nombre: string
    academia: string
    monto: number
    concepto: string
    desglose?: string
  },
  tono: TonoRecordatorio
): string {
  const { academia, monto, desglose } = params
  const montoStr = formatCurrency(monto)

  let base = ''
  switch (tono) {
    case 'amigable':
      base = `Hola 😊, te escribimos de ${academia} para recordarte que tenemos un saldo pendiente de ${montoStr} de *${params.nombre}*. ¡Cualquier duda quedamos a tus órdenes, gracias! 🙌`
      break
    case 'formal':
      base = `Buen día. Por medio del presente le informamos de parte de ${academia} que se registra un saldo pendiente de ${montoStr} para el alumno *${params.nombre}*. Le invitamos a regularizar su situación a la brevedad posible. Quedamos a su disposición para cualquier aclaración.`
      break
    case 'urgente':
      base = `Aviso importante de ${academia}. Se registra un adeudo vencido de ${montoStr} en la cuenta de *${params.nombre}*. Es necesario regularizar el pago a la brevedad para evitar afectaciones. Por favor contáctanos lo antes posible.`
      break
  }

  if (desglose && desglose.trim()) {
    return `${base}\n\n${desglose.trim()}`
  }
  return base
}
