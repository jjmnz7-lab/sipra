/**
 * Marca SIPRA para superficies públicas (pie de la página de historial
 * compartido). Impersonal e institucional: atrae a otros dueños de academias
 * de forma orgánica sin exponer datos de la academia anfitriona.
 */
export const SIPRA_NOMBRE = 'SIPRA'
export const SIPRA_TAGLINE = 'Sistema de Pagos y Recordatorios para Academias'

/**
 * Landing pública a la que apunta el pie de la página de historial compartido.
 * Aún no existe como sitio dedicado; por defecto apunta al despliegue actual y
 * puede sobreescribirse con NEXT_PUBLIC_LANDING_URL sin tocar código.
 * TODO: repuntar a la landing definitiva cuando esté publicada.
 */
export const LANDING_URL =
  process.env.NEXT_PUBLIC_LANDING_URL || 'https://sipracontrol.com'
