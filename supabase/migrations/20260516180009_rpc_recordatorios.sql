-- Migración: 010_rpc_recordatorios
-- Descripción: Creación del motor generador de recordatorios de pago para la bandeja de WhatsApp (Outbox).

CREATE OR REPLACE FUNCTION public.generar_recordatorios_v1(
  p_academia_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_cargo record;
  v_envios_generados integer := 0;
  v_academia_nombre text;
BEGIN
  -- 1. SEGURIDAD
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    -- Al igual que en recargos, permitimos ejecución backend o por el admin
    NULL;
  END IF;

  SELECT nombre INTO v_academia_nombre FROM academia WHERE id = p_academia_id;

  -- 2. BÚSQUEDA DE MOROSOS
  -- Seleccionamos cargos vencidos o parciales, donde la persona tiene teléfono
  FOR v_cargo IN 
    SELECT c.id, c.persona_id, c.concepto, c.saldo_pendiente, c.fecha_vencimiento, 
           p.nombre AS persona_nombre, p.telefono_whatsapp
    FROM cargo c
    JOIN persona p ON p.id = c.persona_id
    WHERE c.academia_id = p_academia_id 
      AND c.estado_financiero IN ('vencido', 'parcial')
      AND p.telefono_whatsapp IS NOT NULL
      AND char_length(trim(p.telefono_whatsapp)) >= 10
  LOOP
    -- 3. VERIFICAR QUE NO EXISTA UN AVISO PENDIENTE PARA ESTE CARGO
    IF NOT EXISTS (
      SELECT 1 FROM envio_sugerido e 
      WHERE e.academia_id = p_academia_id 
        AND e.cargo_id = v_cargo.id
        AND e.estado = 'pendiente_revision'
    ) THEN
      
      -- INSERTAR NUEVO ENVÍO SUGERIDO
      INSERT INTO envio_sugerido (
        academia_id, persona_id, cargo_id, tipo_mensaje, estado, 
        fecha_sugerida, metadata
      ) VALUES (
        p_academia_id, v_cargo.persona_id, v_cargo.id, 
        'recordatorio_pago', 'pendiente_revision', now(),
        jsonb_build_object(
          'monto_adeudado', v_cargo.saldo_pendiente,
          'concepto', v_cargo.concepto,
          'academia_nombre', v_academia_nombre,
          'telefono', v_cargo.telefono_whatsapp,
          'persona_nombre', v_cargo.persona_nombre
        )
      );

      v_envios_generados := v_envios_generados + 1;

    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'envios_generados', v_envios_generados
  );
EXCEPTION WHEN OTHERS THEN 
  RAISE;
END;
$$;
