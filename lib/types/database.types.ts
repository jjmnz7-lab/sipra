// Tipos fallback generados manualmente (sin Docker local).
// Reemplazar con: npx supabase gen types typescript --project-id <id> > lib/types/database.types.ts

type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      academia: {
        Row: {
          id: string
          nombre: string
          estado_tenant: string
          config_recargos: Json | null
          next_run_utc: string | null
          created_at: string
          [key: string]: unknown
        }
        Insert: {
          id?: string
          nombre: string
          estado_tenant?: string
          config_recargos?: Json | null
          [key: string]: unknown
        }
        Update: {
          id?: string
          nombre?: string
          estado_tenant?: string
          config_recargos?: Json | null
          [key: string]: unknown
        }
      }
      usuario: {
        Row: {
          id: string
          academia_id: string
          nombre: string
          apellido: string | null
          email_snapshot: string
          rol: string
          estado: string
          created_at: string
          [key: string]: unknown
        }
        Insert: {
          id?: string
          academia_id: string
          nombre: string
          apellido?: string | null
          email_snapshot: string
          rol?: string
          estado?: string
          [key: string]: unknown
        }
        Update: {
          nombre?: string
          apellido?: string | null
          rol?: string
          estado?: string
          [key: string]: unknown
        }
      }
      persona: {
        Row: {
          id: string
          academia_id: string
          nombre: string
          apellido: string | null
          telefono_whatsapp: string | null
          etiqueta: string | null
          estado_registro: string
          created_at: string
          [key: string]: unknown
        }
        Insert: {
          id?: string
          academia_id: string
          nombre: string
          apellido?: string | null
          telefono_whatsapp?: string | null
          etiqueta?: string | null
          estado_registro?: string
          [key: string]: unknown
        }
        Update: {
          nombre?: string
          apellido?: string | null
          telefono_whatsapp?: string | null
          etiqueta?: string | null
          estado_registro?: string
          [key: string]: unknown
        }
      }
      cargo: {
        Row: {
          id: string
          academia_id: string
          persona_id: string
          concepto: string
          monto_original: number
          saldo_pendiente: number
          estado_financiero: string
          fecha_vencimiento: string
          created_at: string
          persona?: { nombre: string; apellido: string | null; telefono_whatsapp: string | null } | null
          [key: string]: unknown
        }
        Insert: {
          id?: string
          academia_id: string
          persona_id: string
          concepto: string
          monto_original: number
          saldo_pendiente?: number
          estado_financiero?: string
          fecha_vencimiento: string
          [key: string]: unknown
        }
        Update: {
          concepto?: string
          monto_original?: number
          saldo_pendiente?: number
          estado_financiero?: string
          fecha_vencimiento?: string
          [key: string]: unknown
        }
      }
      movimiento: {
        Row: {
          id: string
          academia_id: string
          persona_id: string
          monto_total: number
          estado: string
          fecha_pago: string
          created_at: string
          [key: string]: unknown
        }
        Insert: {
          id?: string
          academia_id: string
          persona_id: string
          monto_total: number
          estado?: string
          fecha_pago?: string
          [key: string]: unknown
        }
        Update: {
          monto_total?: number
          estado?: string
          [key: string]: unknown
        }
      }
      grupo: {
        Row: {
          id: string
          academia_id: string
          nombre: string
          descripcion: string | null
          estado: string
          created_at: string
          [key: string]: unknown
        }
        Insert: {
          id?: string
          academia_id: string
          nombre: string
          descripcion?: string | null
          estado?: string
          [key: string]: unknown
        }
        Update: {
          nombre?: string
          descripcion?: string | null
          estado?: string
          [key: string]: unknown
        }
      }
      persona_grupo: {
        Row: {
          id: string
          academia_id: string
          persona_id: string
          grupo_id: string
          created_at: string
          persona?: { nombre: string; apellido: string | null; telefono_whatsapp: string | null } | null
          [key: string]: unknown
        }
        Insert: {
          id?: string
          academia_id: string
          persona_id: string
          grupo_id: string
          [key: string]: unknown
        }
        Update: {
          [key: string]: unknown
        }
      }
      envio_sugerido: {
        Row: {
          id: string
          academia_id: string
          persona_id: string
          cargo_id: string | null
          estado: string
          mensaje_sugerido: string | null
          created_at: string
          persona?: { nombre: string; apellido: string | null; telefono_whatsapp: string | null } | null
          [key: string]: unknown
        }
        Insert: {
          id?: string
          academia_id: string
          persona_id: string
          cargo_id?: string | null
          estado?: string
          mensaje_sugerido?: string | null
          [key: string]: unknown
        }
        Update: {
          estado?: string
          mensaje_sugerido?: string | null
          [key: string]: unknown
        }
      }
      evento_timeline: {
        Row: {
          id: string
          academia_id: string
          persona_id: string
          categoria: string
          tipo: string
          titulo: string
          metadata: Json | null
          created_at: string
          [key: string]: unknown
        }
        Insert: {
          id?: string
          academia_id: string
          persona_id: string
          categoria: string
          tipo: string
          titulo: string
          metadata?: Json | null
          [key: string]: unknown
        }
        Update: {
          [key: string]: unknown
        }
      }
      suscripcion_academia: {
        Row: {
          id: string
          academia_id: string
          plan_codigo: string
          estado: string
          is_current: boolean
          precio_mensual: number
          fecha_inicio: string
          fecha_fin: string | null
          trial_ends_at: string | null
          [key: string]: unknown
        }
        Insert: {
          id?: string
          academia_id: string
          plan_codigo: string
          estado?: string
          is_current?: boolean
          precio_mensual?: number
          fecha_inicio?: string
          fecha_fin?: string | null
          trial_ends_at?: string | null
          [key: string]: unknown
        }
        Update: {
          [key: string]: unknown
        }
      }
    }
    Views: {
      [key: string]: {
        Row: { [key: string]: unknown }
      }
    }
    Functions: {
      [key: string]: {
        Args: { [key: string]: unknown }
        Returns: unknown
      }
    }
    Enums: {
      [key: string]: string
    }
  }
}
