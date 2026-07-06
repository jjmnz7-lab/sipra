-- ==============================================================================
-- Migración: aplicar_descuento
-- Descripción: RPC aplicar_descuento_v1 para aplicar un descuento parcial o total 
--              a cargos pendientes/parciales de un alumno.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.aplicar_descuento_v1(
  p_academia_id uuid,
  p_persona_id uuid,
  p_cargo_ids uuid[],
  p_monto_total numeric,
  p_concepto text,
  p_idempotency_key text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_mov_id uuid := gen_random_uuid();
  v_tl_id uuid := gen_random_uuid();
  v_cargo record;
  v_monto_restante numeric := p_monto_total;
  v_monto_aplicado numeric;
  v_nuevo_saldo numeric;
  v_nuevo_estado text;
  v_persona_nombre text;
BEGIN
  -- 1. SEGURIDAD
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  -- 2. VALIDACIÓN DE NEGOCIO
  IF p_monto_total <= 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;

  SELECT (nombre || ' ' || COALESCE(apellido, '')) INTO v_persona_nombre 
  FROM persona WHERE id = p_persona_id AND academia_id = p_academia_id;

  -- Insertar movimiento (metodo_pago = 'otro', referencia = concepto)
  INSERT INTO movimiento (id, academia_id, persona_id, monto_total, monto_disponible, metodo_pago, referencia, idempotency_key, created_by)
  VALUES (v_mov_id, p_academia_id, p_persona_id, p_monto_total, p_monto_total, 'otro', p_concepto, p_idempotency_key, COALESCE(p_actor_id, sipra_auth.get_my_user_id()));

  -- 3. LOCKS
  FOR v_cargo IN 
    SELECT id, saldo_pendiente, monto_original, estado_financiero
    FROM cargo 
    WHERE id = ANY(p_cargo_ids) AND academia_id = p_academia_id
    ORDER BY id ASC 
    FOR UPDATE
  LOOP
    IF v_monto_restante <= 0 THEN
      EXIT;
    END IF;

    IF v_cargo.saldo_pendiente > 0 THEN
      IF v_monto_restante >= v_cargo.saldo_pendiente THEN
        v_monto_aplicado := v_cargo.saldo_pendiente;
      ELSE
        v_monto_aplicado := v_monto_restante;
      END IF;

      v_nuevo_saldo := v_cargo.saldo_pendiente - v_monto_aplicado;
      
      IF v_nuevo_saldo = 0 THEN
        v_nuevo_estado := 'liquidado';
      ELSIF v_nuevo_saldo < v_cargo.monto_original THEN
        v_nuevo_estado := 'parcial';
      ELSE
        v_nuevo_estado := v_cargo.estado_financiero;
      END IF;

      -- 4. LEDGER
      INSERT INTO aplicacion_movimiento (academia_id, movimiento_id, cargo_id, monto_aplicado)
      VALUES (p_academia_id, v_mov_id, v_cargo.id, v_monto_aplicado);

      UPDATE cargo 
      SET saldo_pendiente = v_nuevo_saldo,
          estado_financiero = v_nuevo_estado,
          updated_at = now()
      WHERE id = v_cargo.id;

      v_monto_restante := v_monto_restante - v_monto_aplicado;

      -- 5. SIDE EFFECTS
      IF v_nuevo_estado = 'liquidado' THEN
        UPDATE envio_sugerido 
        SET estado = 'invalidado', invalid_reason = 'Cargo liquidado'
        WHERE cargo_id = v_cargo.id AND estado = 'pendiente_revision';
      END IF;
    END IF;
  END LOOP;

  -- Actualizar monto disponible del movimiento
  UPDATE movimiento SET monto_disponible = v_monto_restante WHERE id = v_mov_id;

  -- 6. TIMELINE
  INSERT INTO evento_timeline (id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, actor_nombre, metadata)
  VALUES (v_tl_id, p_academia_id, p_persona_id, 'FINANZAS', 'PAGO_ABONO', 'Descuento aplicado', 
          p_concepto, 
          COALESCE(p_actor_id, sipra_auth.get_my_user_id()), v_persona_nombre, 
          jsonb_build_object('movimiento_id', v_mov_id, 'monto', p_monto_total, 'metodo', 'descuento'));

  RETURN jsonb_build_object(
    'success', true,
    'operation_id', v_mov_id,
    'timeline_event_id', v_tl_id,
    'data', jsonb_build_object('monto_sobrante', v_monto_restante),
    'warnings', '[]'::jsonb,
    'needs_refresh', true
  );
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;


-- ==============================================================================
-- Modificación de revertir_pago_atomico_v1 para soportar títulos/descripciones
-- personalizadas si es un descuento.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.revertir_pago_atomico_v1(
  p_academia_id uuid,
  p_movimiento_id uuid,
  p_motivo text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_tl_id uuid := gen_random_uuid();
  v_movimiento record;
  v_aplicacion record;
  v_cargo record;
  v_nuevo_saldo numeric;
  v_nuevo_estado text;
  v_persona_nombre text;
  v_titulo_anulacion text := 'Pago Anulado';
  v_desc_anulacion text;
  v_tipo_anulacion text := 'pago_anulado';
BEGIN
  -- 1. SEGURIDAD
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  -- 2. VALIDACIÓN DEL MOVIMIENTO
  SELECT * INTO v_movimiento
  FROM movimiento
  WHERE id = p_movimiento_id AND academia_id = p_academia_id AND estado = 'registrado'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MOVIMIENTO_NO_VALIDO_O_YA_ANULADO' USING ERRCODE = 'P0003';
  END IF;

  SELECT (nombre || ' ' || COALESCE(apellido, '')) INTO v_persona_nombre 
  FROM persona WHERE id = v_movimiento.persona_id AND academia_id = p_academia_id;

  -- 3. LOCKS Y REVERSIÓN EN CARGOS
  FOR v_aplicacion IN 
    SELECT * FROM aplicacion_movimiento 
    WHERE movimiento_id = p_movimiento_id AND academia_id = p_academia_id
    ORDER BY cargo_id ASC
  LOOP
    SELECT * INTO v_cargo FROM cargo 
    WHERE id = v_aplicacion.cargo_id AND academia_id = p_academia_id 
    FOR UPDATE;

    IF FOUND THEN
      v_nuevo_saldo := v_cargo.saldo_pendiente + v_aplicacion.monto_aplicado;
      
      IF v_nuevo_saldo >= v_cargo.monto_original THEN
        v_nuevo_estado := 'vencido';
        IF v_cargo.fecha_vencimiento > now() THEN
           v_nuevo_estado := 'pendiente';
        END IF;
      ELSE
        v_nuevo_estado := 'parcial';
      END IF;

      UPDATE cargo 
      SET saldo_pendiente = v_nuevo_saldo,
          estado_financiero = v_nuevo_estado,
          updated_at = now()
      WHERE id = v_cargo.id;
    END IF;
  END LOOP;

  -- 4. ACTUALIZAR LEDGER (Marcar movimiento como anulado)
  UPDATE movimiento 
  SET estado = 'anulado',
      updated_at = now()
  WHERE id = p_movimiento_id;

  -- Heurística para personalizar el título/descripción si era descuento
  IF v_movimiento.metodo_pago = 'otro' AND v_movimiento.referencia NOT ILIKE 'Pago%' THEN
    v_titulo_anulacion := 'Descuento anulado';
    v_desc_anulacion := 'Se anuló un descuento de ' || v_movimiento.monto_total::text || '. Motivo: ' || p_motivo;
  ELSE
    v_desc_anulacion := 'Se anuló un pago de ' || v_movimiento.monto_total::text || '. Motivo: ' || p_motivo;
  END IF;

  -- 5. TIMELINE (El trigger mapea 'pago_anulado' a 'ANULACION_PAGO')
  INSERT INTO evento_timeline (id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, actor_nombre, metadata)
  VALUES (v_tl_id, p_academia_id, v_movimiento.persona_id, 'FINANZAS', v_tipo_anulacion, v_titulo_anulacion, 
          v_desc_anulacion, 
          COALESCE(p_actor_id, sipra_auth.get_my_user_id()), v_persona_nombre, 
          jsonb_build_object('movimiento_id', p_movimiento_id, 'monto_anulado', v_movimiento.monto_total, 'motivo', p_motivo));

  RETURN jsonb_build_object(
    'success', true,
    'operation_id', p_movimiento_id,
    'timeline_event_id', v_tl_id,
    'data', jsonb_build_object(),
    'warnings', '[]'::jsonb,
    'needs_refresh', true
  );
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

-- DOWN:
-- DROP FUNCTION IF EXISTS public.aplicar_descuento_v1(uuid, uuid, uuid[], numeric, text, text, uuid);
