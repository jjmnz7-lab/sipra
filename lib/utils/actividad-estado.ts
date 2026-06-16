export function parseFechaLocal(s: string | null | undefined): Date | null {
  if (!s) return null
  const [y, m, d] = String(s).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export type EstadoActividad = {
  yaInicio: boolean
  yaFinalizo: boolean
  archivada: boolean
  /** Vigente: no ha finalizado (por fecha) ni está archivada. */
  activa: boolean
}

export function calcularEstadoActividad(
  fechaInicio: string | null | undefined,
  fechaFin: string | null | undefined,
  estado: string | null | undefined,
): EstadoActividad {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const inicio = parseFechaLocal(fechaInicio)
  const fin = parseFechaLocal(fechaFin)

  const yaInicio = !!inicio && inicio <= hoy
  const yaFinalizo = !!fin && fin < hoy
  const archivada = estado === 'archivado'

  return { yaInicio, yaFinalizo, archivada, activa: !yaFinalizo && !archivada }
}
