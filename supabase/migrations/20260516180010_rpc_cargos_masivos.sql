-- Migración: 011_rpc_cargos_masivos
-- Descripción: RPC para generar cargos masivos (mensualidades, inscripciones) a todos los alumnos activos de una academia.

CREATE OR REPLACE FUNCTION public.generar_cargos_masivos_v1(
  p_academia_id    uuid,
  p_concepto       text,
  p_monto          numeric,
  p_fecha_vencimiento date,
  p_origen         text DEFAULT 'manual'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_persona        record;
  v_cargos_creados integer := 0;
  v_omitidos       integer := 0;
  v_tl_id          uuid;
  v_concepto_slug  text;
BEGIN
  -- 1. SEGURIDAD
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  -- 2. VALIDACIONES
  IF char_length(trim(p_concepto)) = 0 THEN
    RAISE EXCEPTION 'CONCEPTO_REQUERIDO' USING ERRCODE = 'P0002';
  END IF;
  IF p_monto <= 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;
  IF p_fecha_vencimiento < current_date THEN
    RAISE EXCEPTION 'FECHA_VENCIMIENTO_PASADA' USING ERRCODE = 'P0002';
  END IF;

  -- Slug del concepto para detectar duplicados del mismo mes/concepto
  v_concepto_slug := lower(trim(p_concepto));

  -- 3. BUCLE SOBRE PERSONAS ACTIVAS
  FOR v_persona IN 
    SELECT id, nombre, apellido
    FROM persona
    WHERE academia_id = p_academia_id
      AND estado_registro = 'activo'
      AND etiqueta = 'alumno'
  LOOP
    -- Anti-duplicado: verificar si ya existe un cargo con el mismo concepto para esta persona en este período
    IF EXISTS (
      SELECT 1 FROM cargo c
      WHERE c.academia_id = p_academia_id
        AND c.persona_id = v_persona.id
        AND lower(trim(c.concepto)) = v_concepto_slug
        AND c.fecha_vencimiento = p_fecha_vencimiento
        AND c.estado_financiero != 'anulado'
    ) THEN
      v_omitidos := v_omitidos + 1;
      CONTINUE;
    END IF;

    -- INSERTAR CARGO INDIVIDUAL
    INSERT INTO cargo (
      academia_id, persona_id, concepto, monto_original, saldo_pendiente,
      estado_financiero, fecha_vencimiento, origen, metadata
    ) VALUES (
      p_academia_id, v_persona.id, p_concepto, p_monto, p_monto,
      'pendiente', p_fecha_vencimiento, p_origen,
      jsonb_build_object('generado_masivo', true, 'generado_at', now())
    );

    -- TIMELINE por persona
    v_tl_id := gen_random_uuid();
    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_nombre, metadata
    ) VALUES (
      v_tl_id, p_academia_id, v_persona.id, 'financiero', 'cargo_generado',
      'Cargo generado: ' || p_concepto,
      'Se generó un cargo de $' || p_monto::text || ' con vencimiento ' || p_fecha_vencimiento::text,
      'Sistema',
      jsonb_build_object('monto', p_monto, 'concepto', p_concepto, 'fecha_vencimiento', p_fecha_vencimiento)
    );

    v_cargos_creados := v_cargos_creados + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'cargos_creados', v_cargos_creados,
    'omitidos_duplicado', v_omitidos,
    'needs_refresh', false
  );
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;
