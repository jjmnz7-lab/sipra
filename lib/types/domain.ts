import type { Database } from './database.types'

export const METODOS_PAGO = ['efectivo', 'transferencia', 'tarjeta', 'deposito', 'otro'] as const
export type MetodoPago = typeof METODOS_PAGO[number]

type Persona = Database['public']['Tables']['persona']['Row']
type Cargo = Database['public']['Tables']['cargo']['Row']

export type CargoConPersona = Cargo & {
  persona: Pick<Persona, 'nombre' | 'apellido' | 'telefono_whatsapp'> | null
}

export type EnvioSugerido = Database['public']['Tables']['envio_sugerido']['Row'] & {
  persona?: Pick<Persona, 'nombre' | 'apellido' | 'telefono_whatsapp'> | null
}
