export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      academia: {
        Row: {
          allow_overpayment: boolean
          allow_partial_payments: boolean
          automatizacion_recurrente: boolean
          cobrar_inscripcion_default: boolean
          config_cobro: Json
          config_recargos: Json
          created_at: string
          estado_tenant: string
          id: string
          metadata: Json
          monto_inscripcion_default: number
          multi_plan_enabled: boolean
          next_run_utc: string | null
          nombre: string
          timezone: string
          updated_at: string
        }
        Insert: {
          allow_overpayment?: boolean
          allow_partial_payments?: boolean
          automatizacion_recurrente?: boolean
          cobrar_inscripcion_default?: boolean
          config_cobro?: Json
          config_recargos?: Json
          created_at?: string
          estado_tenant?: string
          id?: string
          metadata?: Json
          monto_inscripcion_default?: number
          multi_plan_enabled?: boolean
          next_run_utc?: string | null
          nombre: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          allow_overpayment?: boolean
          allow_partial_payments?: boolean
          automatizacion_recurrente?: boolean
          cobrar_inscripcion_default?: boolean
          config_cobro?: Json
          config_recargos?: Json
          created_at?: string
          estado_tenant?: string
          id?: string
          metadata?: Json
          monto_inscripcion_default?: number
          multi_plan_enabled?: boolean
          next_run_utc?: string | null
          nombre?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      alumno_planes: {
        Row: {
          academia_id: string
          alumno_id: string
          created_at: string
          plan_cobro_id: string
        }
        Insert: {
          academia_id: string
          alumno_id: string
          created_at?: string
          plan_cobro_id: string
        }
        Update: {
          academia_id?: string
          alumno_id?: string
          created_at?: string
          plan_cobro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alumno_planes_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumno_planes_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumno_planes_plan_cobro_id_fkey"
            columns: ["plan_cobro_id"]
            isOneToOne: false
            referencedRelation: "planes_cobro"
            referencedColumns: ["id"]
          },
        ]
      }
      aplicacion_movimiento: {
        Row: {
          academia_id: string
          cargo_id: string
          created_at: string
          estado: string
          id: string
          monto_aplicado: number
          movimiento_id: string
        }
        Insert: {
          academia_id: string
          cargo_id: string
          created_at?: string
          estado?: string
          id?: string
          monto_aplicado: number
          movimiento_id: string
        }
        Update: {
          academia_id?: string
          cargo_id?: string
          created_at?: string
          estado?: string
          id?: string
          monto_aplicado?: number
          movimiento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aplicacion_movimiento_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicacion_movimiento_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicacion_movimiento_movimiento_id_fkey"
            columns: ["movimiento_id"]
            isOneToOne: false
            referencedRelation: "movimiento"
            referencedColumns: ["id"]
          },
        ]
      }
      cargo: {
        Row: {
          academia_id: string
          concepto: string
          created_at: string
          created_by: string | null
          descripcion: string | null
          estado_financiero: string
          fecha_creacion: string
          fecha_promesa: string | null
          fecha_vencimiento: string | null
          grupo_id_origen: string | null
          id: string
          metadata: Json
          monto_original: number
          nota_modificacion: string | null
          origen: string
          persona_id: string
          saldo_pendiente: number
          updated_at: string
        }
        Insert: {
          academia_id: string
          concepto: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          estado_financiero?: string
          fecha_creacion?: string
          fecha_promesa?: string | null
          fecha_vencimiento?: string | null
          grupo_id_origen?: string | null
          id?: string
          metadata?: Json
          monto_original: number
          nota_modificacion?: string | null
          origen?: string
          persona_id: string
          saldo_pendiente: number
          updated_at?: string
        }
        Update: {
          academia_id?: string
          concepto?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          estado_financiero?: string
          fecha_creacion?: string
          fecha_promesa?: string | null
          fecha_vencimiento?: string | null
          grupo_id_origen?: string | null
          id?: string
          metadata?: Json
          monto_original?: number
          nota_modificacion?: string | null
          origen?: string
          persona_id?: string
          saldo_pendiente?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cargo_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargo_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargo_grupo_id_origen_fkey"
            columns: ["grupo_id_origen"]
            isOneToOne: false
            referencedRelation: "grupo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargo_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
        ]
      }
      envio_sugerido: {
        Row: {
          academia_id: string
          cargo_id: string | null
          estado: string
          fecha_procesado: string | null
          fecha_sugerida: string
          id: string
          invalid_reason: string | null
          metadata: Json
          persona_id: string
          tipo_mensaje: string
        }
        Insert: {
          academia_id: string
          cargo_id?: string | null
          estado?: string
          fecha_procesado?: string | null
          fecha_sugerida?: string
          id?: string
          invalid_reason?: string | null
          metadata?: Json
          persona_id: string
          tipo_mensaje: string
        }
        Update: {
          academia_id?: string
          cargo_id?: string | null
          estado?: string
          fecha_procesado?: string | null
          fecha_sugerida?: string
          id?: string
          invalid_reason?: string | null
          metadata?: Json
          persona_id?: string
          tipo_mensaje?: string
        }
        Relationships: [
          {
            foreignKeyName: "envio_sugerido_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envio_sugerido_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envio_sugerido_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_timeline: {
        Row: {
          academia_id: string
          actor_id: string | null
          actor_nombre: string | null
          categoria: string
          descripcion: string | null
          fecha_evento: string
          id: string
          metadata: Json
          monto: number | null
          persona_id: string
          tipo: string
          titulo: string
        }
        Insert: {
          academia_id: string
          actor_id?: string | null
          actor_nombre?: string | null
          categoria: string
          descripcion?: string | null
          fecha_evento?: string
          id?: string
          metadata?: Json
          monto?: number | null
          persona_id: string
          tipo: string
          titulo: string
        }
        Update: {
          academia_id?: string
          actor_id?: string | null
          actor_nombre?: string | null
          categoria?: string
          descripcion?: string | null
          fecha_evento?: string
          id?: string
          metadata?: Json
          monto?: number | null
          persona_id?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_timeline_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_timeline_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_timeline_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
        ]
      }
      grupo: {
        Row: {
          academia_id: string
          color: string | null
          costo_actividad: number | null
          created_at: string
          created_by: string | null
          cupo_maximo: number | null
          descripcion: string | null
          dias_semana: number[] | null
          emoji: string | null
          es_temporal: boolean
          estado: string
          fecha_fin: string | null
          fecha_inicio: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          nombre: string
          orden_visual: number
          plan_sugerido_id: string | null
          updated_at: string
        }
        Insert: {
          academia_id: string
          color?: string | null
          costo_actividad?: number | null
          created_at?: string
          created_by?: string | null
          cupo_maximo?: number | null
          descripcion?: string | null
          dias_semana?: number[] | null
          emoji?: string | null
          es_temporal?: boolean
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          nombre: string
          orden_visual?: number
          plan_sugerido_id?: string | null
          updated_at?: string
        }
        Update: {
          academia_id?: string
          color?: string | null
          costo_actividad?: number | null
          created_at?: string
          created_by?: string | null
          cupo_maximo?: number | null
          descripcion?: string | null
          dias_semana?: number[] | null
          emoji?: string | null
          es_temporal?: boolean
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          nombre?: string
          orden_visual?: number
          plan_sugerido_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupo_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grupo_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grupo_plan_sugerido_id_fkey"
            columns: ["plan_sugerido_id"]
            isOneToOne: false
            referencedRelation: "planes_cobro"
            referencedColumns: ["id"]
          },
        ]
      }
      job_execution: {
        Row: {
          academia_id: string | null
          completed_at: string | null
          error_message: string | null
          id: string
          job_name: string
          metadata: Json
          records_procesed: number | null
          started_at: string
          status: string
        }
        Insert: {
          academia_id?: string | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          job_name: string
          metadata?: Json
          records_procesed?: number | null
          started_at?: string
          status: string
        }
        Update: {
          academia_id?: string | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          job_name?: string
          metadata?: Json
          records_procesed?: number | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_execution_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academia"
            referencedColumns: ["id"]
          },
        ]
      }
      movimiento: {
        Row: {
          academia_id: string
          anulado_by: string | null
          anulado_motivo: string | null
          created_at: string
          created_by: string
          estado: string
          fecha_pago: string
          id: string
          idempotency_key: string
          metodo_pago: string
          monto_disponible: number
          monto_total: number
          persona_id: string
          referencia: string | null
          updated_at: string
        }
        Insert: {
          academia_id: string
          anulado_by?: string | null
          anulado_motivo?: string | null
          created_at?: string
          created_by: string
          estado?: string
          fecha_pago?: string
          id?: string
          idempotency_key: string
          metodo_pago: string
          monto_disponible: number
          monto_total: number
          persona_id: string
          referencia?: string | null
          updated_at?: string
        }
        Update: {
          academia_id?: string
          anulado_by?: string | null
          anulado_motivo?: string | null
          created_at?: string
          created_by?: string
          estado?: string
          fecha_pago?: string
          id?: string
          idempotency_key?: string
          metodo_pago?: string
          monto_disponible?: number
          monto_total?: number
          persona_id?: string
          referencia?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimiento_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimiento_anulado_by_fkey"
            columns: ["anulado_by"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimiento_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimiento_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
        ]
      }
      persona: {
        Row: {
          academia_id: string
          apellido: string | null
          beca_activa: boolean
          beca_porcentaje: number
          created_at: string
          created_by: string | null
          descuento_hermanos_activo: boolean
          descuento_hermanos_monto: number
          email: string | null
          estado_global: string
          estado_registro: string
          etiqueta: string
          fecha_baja: string | null
          id: string
          metadata: Json
          nombre: string
          nombre_referencia: string | null
          notas_internas: string | null
          saldo_acumulado: number
          search_text: string | null
          share_code: string
          share_link_bloqueado: boolean
          share_token: string
          telefono_whatsapp: string | null
          ultima_interaccion_at: string | null
          updated_at: string
        }
        Insert: {
          academia_id: string
          apellido?: string | null
          beca_activa?: boolean
          beca_porcentaje?: number
          created_at?: string
          created_by?: string | null
          descuento_hermanos_activo?: boolean
          descuento_hermanos_monto?: number
          email?: string | null
          estado_global?: string
          estado_registro?: string
          etiqueta?: string
          fecha_baja?: string | null
          id?: string
          metadata?: Json
          nombre: string
          nombre_referencia?: string | null
          notas_internas?: string | null
          saldo_acumulado?: number
          search_text?: string | null
          share_code?: string
          share_link_bloqueado?: boolean
          share_token?: string
          telefono_whatsapp?: string | null
          ultima_interaccion_at?: string | null
          updated_at?: string
        }
        Update: {
          academia_id?: string
          apellido?: string | null
          beca_activa?: boolean
          beca_porcentaje?: number
          created_at?: string
          created_by?: string | null
          descuento_hermanos_activo?: boolean
          descuento_hermanos_monto?: number
          email?: string | null
          estado_global?: string
          estado_registro?: string
          etiqueta?: string
          fecha_baja?: string | null
          id?: string
          metadata?: Json
          nombre?: string
          nombre_referencia?: string | null
          notas_internas?: string | null
          saldo_acumulado?: number
          search_text?: string | null
          share_code?: string
          share_link_bloqueado?: boolean
          share_token?: string
          telefono_whatsapp?: string | null
          ultima_interaccion_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "persona_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_grupo: {
        Row: {
          academia_id: string
          created_at: string
          created_by: string | null
          estado: string
          fecha_inscripcion: string
          fecha_remocion: string | null
          grupo_id: string
          id: string
          persona_id: string
          updated_at: string
        }
        Insert: {
          academia_id: string
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha_inscripcion?: string
          fecha_remocion?: string | null
          grupo_id: string
          id?: string
          persona_id: string
          updated_at?: string
        }
        Update: {
          academia_id?: string
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha_inscripcion?: string
          fecha_remocion?: string | null
          grupo_id?: string
          id?: string
          persona_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "persona_grupo_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_grupo_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_grupo_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_grupo_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
        ]
      }
      cobros_frecuentes: {
        Row: {
          academia_id: string
          activo: boolean
          concepto: string
          created_at: string
          id: string
          monto: number
        }
        Insert: {
          academia_id: string
          activo?: boolean
          concepto: string
          created_at?: string
          id?: string
          monto: number
        }
        Update: {
          academia_id?: string
          activo?: boolean
          concepto?: string
          created_at?: string
          id?: string
          monto?: number
        }
        Relationships: [
          {
            foreignKeyName: "cobros_frecuentes_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academia"
            referencedColumns: ["id"]
          },
        ]
      }
      planes_cobro: {
        Row: {
          academia_id: string
          activo: boolean
          created_at: string
          frecuencia: string
          id: string
          monto: number
          nombre: string
          requiere_inscripcion: boolean
        }
        Insert: {
          academia_id: string
          activo?: boolean
          created_at?: string
          frecuencia?: string
          id?: string
          monto: number
          nombre: string
          requiere_inscripcion?: boolean
        }
        Update: {
          academia_id?: string
          activo?: boolean
          created_at?: string
          frecuencia?: string
          id?: string
          monto?: number
          nombre?: string
          requiere_inscripcion?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "planes_cobro_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academia"
            referencedColumns: ["id"]
          },
        ]
      }
      suscripcion_academia: {
        Row: {
          academia_id: string
          cancelado_at: string | null
          created_at: string
          created_by: string | null
          estado: string
          external_id: string | null
          fecha_corte: string | null
          fecha_fin: string | null
          fecha_inicio: string
          grace_ends_at: string | null
          id: string
          is_current: boolean
          max_grupos: number | null
          max_personas: number
          max_usuarios: number
          metadata: Json
          moneda: string
          motivo_cancelacion: string | null
          plan_codigo: string
          precio_mensual: number
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          academia_id: string
          cancelado_at?: string | null
          created_at?: string
          created_by?: string | null
          estado: string
          external_id?: string | null
          fecha_corte?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string
          grace_ends_at?: string | null
          id?: string
          is_current?: boolean
          max_grupos?: number | null
          max_personas?: number
          max_usuarios?: number
          metadata?: Json
          moneda?: string
          motivo_cancelacion?: string | null
          plan_codigo: string
          precio_mensual: number
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          academia_id?: string
          cancelado_at?: string | null
          created_at?: string
          created_by?: string | null
          estado?: string
          external_id?: string | null
          fecha_corte?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string
          grace_ends_at?: string | null
          id?: string
          is_current?: boolean
          max_grupos?: number | null
          max_personas?: number
          max_usuarios?: number
          metadata?: Json
          moneda?: string
          motivo_cancelacion?: string | null
          plan_codigo?: string
          precio_mensual?: number
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_suscripcion_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suscripcion_academia_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academia"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario: {
        Row: {
          academia_id: string
          apellido: string | null
          created_at: string
          email_snapshot: string
          estado: string
          id: string
          invitado_por: string | null
          metadata: Json
          nombre: string
          rol: string
          telefono: string | null
          ultimo_acceso_at: string | null
          updated_at: string
        }
        Insert: {
          academia_id: string
          apellido?: string | null
          created_at?: string
          email_snapshot: string
          estado?: string
          id: string
          invitado_por?: string | null
          metadata?: Json
          nombre: string
          rol?: string
          telefono?: string | null
          ultimo_acceso_at?: string | null
          updated_at?: string
        }
        Update: {
          academia_id?: string
          apellido?: string | null
          created_at?: string
          email_snapshot?: string
          estado?: string
          id?: string
          invitado_por?: string | null
          metadata?: Json
          nombre?: string
          rol?: string
          telefono?: string | null
          ultimo_acceso_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_academia_id_fkey"
            columns: ["academia_id"]
            isOneToOne: false
            referencedRelation: "academia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_invitado_por_fkey"
            columns: ["invitado_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      agregar_persona_a_grupo_v1: {
        Args: {
          p_academia_id: string
          p_grupo_id: string
          p_persona_id: string
        }
        Returns: Json
      }
      archivar_grupo_v1: {
        Args: {
          p_academia_id: string
          p_grupo_id: string
          p_grupo_id_destino?: string
        }
        Returns: Json
      }
      archivar_plan_v1: {
        Args: {
          p_academia_id: string
          p_plan_id: string
          p_plan_id_destino?: string
        }
        Returns: Json
      }
      calcular_cargo_plan_v1: {
        Args: { p_fecha_inscripcion?: string; p_plan_cobro_id: string }
        Returns: Json
      }
      convertir_a_plan_unico_v1: {
        Args: { p_academia_id: string; p_plan_id_fallback: string }
        Returns: Json
      }
      crear_aviso_grupal_v1: {
        Args: {
          p_academia_id: string
          p_descripcion: string
          p_grupo_id: string
          p_titulo: string
        }
        Returns: Json
      }
      crear_cargo_grupal_v1: {
        Args: {
          p_academia_id: string
          p_concepto: string
          p_excluded_persona_ids: string[]
          p_grupo_id: string
          p_idempotency_key: string
          p_monto: number
          p_origen?: string
        }
        Returns: Json
      }
      crear_cargo_individual_v1: {
        Args: {
          p_academia_id: string
          p_concepto: string
          p_monto: number
          p_origen?: string
          p_persona_id: string
        }
        Returns: Json
      }
      crear_cargo_manual_v1: {
        Args: {
          p_academia_id: string
          p_alumno_id: string
          p_concepto: string
          p_monto: number
        }
        Returns: Json
      }
      crear_cargo_manual_v2: {
        Args: {
          p_academia_id: string
          p_alumno_id: string
          p_concepto: string
          p_fecha_vencimiento?: string
          p_monto: number
          p_nota_modificacion?: string
          p_origen?: string
        }
        Returns: Json
      }
      crear_cargo_v1: {
        Args: {
          p_academia_id: string
          p_concepto: string
          p_fecha_vencimiento: string
          p_monto_original: number
          p_persona_id: string
        }
        Returns: Json
      }
      fn_dias_semana_validos: { Args: { p_dias: number[] }; Returns: boolean }
      generar_cargos_masivos_v1: {
        Args: {
          p_academia_id: string
          p_concepto: string
          p_fecha_vencimiento: string
          p_monto: number
          p_origen?: string
        }
        Returns: Json
      }
      generar_cargos_recurrentes_v1: {
        Args: { p_academia_id: string; p_fecha?: string }
        Returns: Json
      }
      generar_recordatorios_v1: {
        Args: { p_academia_id: string }
        Returns: Json
      }
      generar_share_code: { Args: never; Returns: string }
      get_dashboard_kpis_v1: { Args: { p_academia_id: string }; Returns: Json }
      inscribir_alumno_a_actividad_v1: {
        Args: {
          p_academia_id: string
          p_fecha_inscripcion?: string
          p_grupo_id: string
          p_monto?: number
          p_persona_id: string
        }
        Returns: Json
      }
      inscribir_alumno_a_grupo_v1: {
        Args: {
          p_academia_id: string
          p_concepto?: string
          p_fecha_inscripcion?: string
          p_grupo_id: string
          p_monto?: number
          p_persona_id: string
          p_plan_cobro_id?: string
        }
        Returns: Json
      }
      obtener_historial_publico_v1: { Args: { p_code: string }; Returns: Json }
      procesar_recargos_v1: { Args: { p_academia_id: string }; Returns: Json }
      procesar_visita_express_v1: {
        Args: {
          p_academia_id: string
          p_alumno_id: string
          p_concepto?: string
          p_idempotency_key?: string
          p_metodo_pago?: string
          p_monto_cargo: number
          p_monto_pago?: number
          p_referencia?: string
        }
        Returns: Json
      }
      registrar_owner_v1: {
        Args: {
          p_apellido_owner?: string
          p_nombre_academia: string
          p_nombre_owner: string
        }
        Returns: Json
      }
      registrar_owner_v2: {
        Args: {
          p_apellido_owner?: string
          p_modelo?: string
          p_monto_mensualidad?: number
          p_nombre_academia: string
          p_nombre_owner: string
          p_telefono?: string
        }
        Returns: Json
      }
      registrar_pago_atomico_v1: {
        Args: {
          p_academia_id: string
          p_actor_id?: string
          p_cargo_ids: string[]
          p_idempotency_key: string
          p_metodo_pago: string
          p_monto_total: number
          p_persona_id: string
          p_referencia?: string
        }
        Returns: Json
      }
      remover_persona_de_grupo_v1: {
        Args: {
          p_academia_id: string
          p_grupo_id: string
          p_persona_id: string
        }
        Returns: Json
      }
      revertir_pago_atomico_v1: {
        Args: {
          p_academia_id: string
          p_actor_id?: string
          p_motivo: string
          p_movimiento_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
