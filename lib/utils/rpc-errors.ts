const RPC_ERROR_MAP: Record<string, string> = {
  'ACCESO_DENEGADO':         'No tienes permiso para realizar esta acción.',
  'MONTO_INVALIDO':          'El monto debe ser mayor a cero.',
  'SALDO_INSUFICIENTE':      'El monto supera el saldo pendiente.',
  'CONCEPTO_REQUERIDO':      'El concepto del cargo es obligatorio.',
  'FECHA_VENCIMIENTO_PASADA':'La fecha de vencimiento no puede ser en el pasado.',
  '23505':                   'Esta operación ya fue procesada anteriormente.',
}

export function translateRpcError(error: { message: string; code?: string }): string {
  if (error.code && RPC_ERROR_MAP[error.code]) return RPC_ERROR_MAP[error.code]
  for (const [key, msg] of Object.entries(RPC_ERROR_MAP)) {
    if (error.message.includes(key)) return msg
  }
  return 'Ocurrió un error inesperado. Intenta de nuevo.'
}
