import { formatCurrency } from './currency'

export type TonoRecordatorio = 'amigable' | 'formal' | 'urgente'

export interface CargoRecordatorio {
  id: string
  concepto: string
  monto_original: number | string
  saldo_pendiente: number | string
  fecha_vencimiento: string | null | undefined
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

function parseLocalDate(dateStr: string | null | undefined): Date {
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

function formatCompactDate(dateStr: string | null | undefined): string {
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

function compareDatesDesc(a: string | null | undefined, b: string | null | undefined): number {
  const safeA = a?.trim() ?? ''
  const safeB = b?.trim() ?? ''
  const timeA = safeA.length > 0 ? parseLocalDate(safeA).getTime() : Number.NaN
  const timeB = safeB.length > 0 ? parseLocalDate(safeB).getTime() : Number.NaN

  const aValid = Number.isFinite(timeA)
  const bValid = Number.isFinite(timeB)

  if (aValid && bValid) return timeB - timeA
  if (aValid) return -1
  if (bValid) return 1
  return 0
}

export function formatDesgloseCargos(cargos: CargoRecordatorio[]): string {
  if (!cargos || cargos.length === 0) return ''

  let text = '*Detalle del saldo:*\n'
  const cargosOrdenados = [...cargos].sort((a, b) => compareDatesDesc(a.fecha_vencimiento, b.fecha_vencimiento))

  cargosOrdenados.forEach((c) => {
    const monto = formatCurrency(Number(c.monto_original))
    text += `• ${c.concepto}: ${monto}\n`

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

export function buildWhatsAppUrl(
  telefono: string | null | undefined,
  mensaje: string,
  codigoPais?: string | null,
): string {
  if (!telefono) return '#'
  const cleanTel = telefono.replace(/\D/g, '')
  const prefix = (codigoPais ?? '52').replace(/\D/g, '')
  const clean = (cleanTel.length === (10 + prefix.length) && cleanTel.startsWith(prefix))
    ? cleanTel
    : `${prefix}${cleanTel}`
  return `https://wa.me/${clean}?text=${encodeURIComponent(mensaje)}`
}

/**
 * Variante para compartir: si no hay teléfono, abre WhatsApp con el mensaje
 * precargado y deja que el remitente elija el contacto (wa.me sin número).
 */
export function buildWhatsAppShareUrl(
  telefono: string | null | undefined,
  mensaje: string,
  codigoPais?: string | null,
): string {
  const cleanTel = (telefono ?? '').replace(/\D/g, '')
  if (!cleanTel) return `https://wa.me/?text=${encodeURIComponent(mensaje)}`
  const prefix = (codigoPais ?? '52').replace(/\D/g, '')
  const clean = (cleanTel.length === (10 + prefix.length) && cleanTel.startsWith(prefix))
    ? cleanTel
    : `${prefix}${cleanTel}`
  return `https://wa.me/${clean}?text=${encodeURIComponent(mensaje)}`
}

/** URL absoluta del historial público por token: {origin}/historial/{token}. */
export function buildShareLink(token: string, origin?: string): string {
  const base = (origin || process.env.NEXT_PUBLIC_SITE_URL || 'https://sipracontrol.com').replace(/\/$/, '')
  return `${base}/historial/${token}`
}

/** Mensaje para compartir el enlace del historial con el tutor/alumno. */
export function buildHistorialShareMensaje(params: {
  academia: string
  alumno: string
  link: string
}): string {
  const { academia, alumno, link } = params
  return (
    `Hola, te compartimos el historial de pagos de *${alumno}* en ${academia}. ` +
    `Puedes consultarlo cuando quieras desde este enlace seguro:\n${link}\n\n` +
    `¡Cualquier duda quedamos a tus órdenes!`
  )
}

/** Mensaje de confirmación tras registrar un pago (incluye el enlace seguro). */
export function buildPagoConfirmacionMensaje(params: {
  academia: string
  alumno: string
  monto: number
  fecha: string
  link: string
}): string {
  const { academia, alumno, monto, fecha, link } = params
  const montoStr = formatCurrency(monto)
  return (
    `Hola, te escribimos de ${academia} para confirmar el pago de ${montoStr} ` +
    `el día ${fecha} a la cuenta de *${alumno}*. ` +
    `Puedes consultar el detalle completo de tus pagos en el siguiente enlace seguro:\n${link}\n\n` +
    `¡Muchas gracias!`
  )
}

/** Anexa la línea del enlace de historial a un mensaje de recordatorio. */
export function appendEnlaceHistorial(mensaje: string, link: string): string {
  if (!link) return mensaje
  return `${mensaje}\n\nConsulta tu historial completo aquí:\n${link}`
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
      base = `Hola, te escribimos de ${academia} para recordarte que tenemos un saldo pendiente de ${montoStr} de *${params.nombre}*. ¡Cualquier duda quedamos a tus órdenes, gracias!`
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
