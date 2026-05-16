// Tipos generados manualmente (sin Docker local).
// Reemplazar con: npx supabase gen types typescript --project-id <id> > lib/types/database.types.ts
// NOTA: Los index signatures [key: string]: unknown han sido eliminados intencionalmente
// porque rompen la inferencia de tipos relacionales en el cliente Supabase (produce 'never').

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

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
        }
        Insert: {
          id?: string
          nombre: string
          estado_tenant?: string
          config_recargos?: Json | null
          next_run_utc?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          estado_tenant?: string
          config_recargos?: Json | null
          next_run_utc?: string | null
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
        }
        Insert: {
          id?: string
          academia_id: string
          nombre: string
          apellido?: string | null
          email_snapshot: string
          rol?: string
          estado?: string
          created_at?: string
        }
        Update: {
          nombre?: string
          apellido?: string | null
          rol?: string
          estado?: string
        }
      }
      persona: {
        Row: {
          id: string
          academia_id: string
          nombre: string
          apellido: string | null
          telefono_whatsapp: string | null
          email: string | null
          etiqueta: string | null
          estado_registro: string
          estado_global: string | null
          created_at: string
        }
        Insert: {
          id?: string
          academia_id: string
          nombre: string
          apellido?: string | null
          telefono_whatsapp?: string | null
          email?: string | null
          etiqueta?: string | null
          estado_registro?: string
          estado_global?: string | null
          created_at?: string
        }
        Update: {
          nombre?: string
          apellido?: string | null
          telefono_whatsapp?: string | null
          email?: string | null
          etiqueta?: string | null
          estado_registro?: string
          estado_global?: string | null
        }
      }
      cargo: {
        Row: {
          id: string
          academia_id: string
          persona_id: string
          concepto: string
          monto_original: number
          monto_disponible: number
          saldo_pendiente: number
          estado_financiero: string
          fecha_vencimiento: string
          created_at: string
        }
        Insert: {
          id?: string
          academia_id: string
          persona_id: string
          concepto: string
          monto_original: number
          monto_disponible?: number
          saldo_pendiente?: number
          estado_financiero?: string
          fecha_vencimiento: string
          created_at?: string
        }
        Update: {
          concepto?: string
          monto_original?: number
          monto_disponible?: number
          saldo_pendiente?: number
          estado_financiero?: string
          fecha_vencimiento?: string
        }
      }
      movimiento: {
        Row: {
          id: string
          academia_id: string
          persona_id: string
          monto_total: number
          monto_disponible: number
          estado: string
          metodo_pago: string | null
          referencia: string | null
          idempotency_key: string | null
          fecha_pago: string
          created_at: string
        }
        Insert: {
          id?: string
          academia_id: string
          persona_id: string
          monto_total: number
          monto_disponible?: number
          estado?: string
          metodo_pago?: string | null
          referencia?: string | null
          idempotency_key?: string | null
          fecha_pago?: string
          created_at?: string
        }
        Update: {
          monto_total?: number
          monto_disponible?: number
          estado?: string
          metodo_pago?: string | null
          referencia?: string | null
        }
      }
      aplicacion_movimiento: {
        Row: {
          id: string
          academia_id: string
          movimiento_id: string
          cargo_id: string
          monto_aplicado: number
          created_at: string
        }
        Insert: {
          id?: string
          academia_id: string
          movimiento_id: string
          cargo_id: string
          monto_aplicado: number
          created_at?: string
        }
        Update: {
          monto_aplicado?: number
        }
      }
      grupo: {
        Row: {
          id: string
          academia_id: string
          nombre: string
          descripcion: string | null
          estado: string
          orden_visual: number | null
          created_at: string
        }
        Insert: {
          id?: string
          academia_id: string
          nombre: string
          descripcion?: string | null
          estado?: string
          orden_visual?: number | null
          created_at?: string
        }
        Update: {
          nombre?: string
          descripcion?: string | null
          estado?: string
          orden_visual?: number | null
        }
      }
      persona_grupo: {
        Row: {
          id: string
          academia_id: string
          persona_id: string
          grupo_id: string
          estado: string
          fecha_inscripcion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          academia_id: string
          persona_id: string
          grupo_id: string
          estado?: string
          fecha_inscripcion?: string | null
          created_at?: string
        }
        Update: {
          estado?: string
          fecha_inscripcion?: string | null
        }
      }
      envio_sugerido: {
        Row: {
          id: string
          academia_id: string
          persona_id: string
          cargo_id: string | null
          tipo_mensaje: string
          estado: string
          invalid_reason: string | null
          fecha_sugerida: string
          fecha_procesado: string | null
          mensaje_sugerido: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          academia_id: string
          persona_id: string
          cargo_id?: string | null
          tipo_mensaje: string
          estado?: string
          invalid_reason?: string | null
          fecha_sugerida?: string
          fecha_procesado?: string | null
          mensaje_sugerido?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          estado?: string
          invalid_reason?: string | null
          fecha_procesado?: string | null
          mensaje_sugerido?: string | null
          metadata?: Json
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
          descripcion: string | null
          fecha_evento: string
          actor_id: string | null
          actor_nombre: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          academia_id: string
          persona_id: string
          categoria: string
          tipo: string
          titulo: string
          descripcion?: string | null
          fecha_evento?: string
          actor_id?: string | null
          actor_nombre?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          titulo?: string
          descripcion?: string | null
          metadata?: Json
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
          created_at: string
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
          created_at?: string
        }
        Update: {
          estado?: string
          is_current?: boolean
          precio_mensual?: number
          fecha_inicio?: string
          fecha_fin?: string | null
          trial_ends_at?: string | null
        }
      }
      job_execution: {
        Row: {
          id: string
          job_name: string
          academia_id: string | null
          status: string
          started_at: string
          completed_at: string | null
          records_procesed: number | null
          error_message: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          job_name: string
          academia_id?: string | null
          status: string
          started_at?: string
          completed_at?: string | null
          records_procesed?: number | null
          error_message?: string | null
          metadata?: Json
        }
        Update: {
          status?: string
          completed_at?: string | null
          records_procesed?: number | null
          error_message?: string | null
          metadata?: Json
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
