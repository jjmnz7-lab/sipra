const RPC_ERROR_MAP: Record<string, string> = {
  'ACCESO_DENEGADO':         'No tienes permiso para realizar esta acción.',
  'MONTO_INVALIDO':          'El monto debe ser mayor a cero.',
  'SALDO_INSUFICIENTE':      'El monto supera el saldo pendiente.',
  'PAGO_PARCIAL_NO_PERMITIDO':'Esta academia no permite abonos parciales. Debes liquidar el total del adeudo.',
  'SALDO_A_FAVOR_NO_PERMITIDO':'Esta academia no permite pagos mayores al saldo pendiente (saldo a favor).',
  'CONCEPTO_REQUERIDO':      'El concepto del cargo es obligatorio.',
  'FECHA_VENCIMIENTO_PASADA':'La fecha de vencimiento no puede ser en el pasado.',
  'ACTIVIDAD_NO_ENCONTRADA': 'La actividad no existe o fue eliminada.',
  'ACTIVIDAD_ARCHIVADA':     'Esta actividad ya fue archivada; no admite nuevas inscripciones.',
  'PERSONA_SUSPENDIDA':      'El alumno está suspendido; no se le pueden generar cargos.',
  'YA_INSCRITO':             'El alumno ya está inscrito en esta actividad.',
  '23505':                   'Esta operación ya fue procesada anteriormente.',
}

export function translateRpcError(error: { message: string; code?: string }): string {
  if (error.code && RPC_ERROR_MAP[error.code]) return RPC_ERROR_MAP[error.code]
  for (const [key, msg] of Object.entries(RPC_ERROR_MAP)) {
    if (error.message.includes(key)) return msg
  }
  return `Ocurrió un error inesperado: ${error.message}. Intenta de nuevo.`
}
