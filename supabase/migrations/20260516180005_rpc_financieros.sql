-- Migración: 006_rpc_financieros
-- Descripción: Creación de funciones RPC transaccionales para registro de pagos y reversiones siguiendo el patrón de 6 capas.

-- ==============================================================================
-- 1. RPC: registrar_pago_atomico_v1
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.registrar_pago_atomico_v1(
  p_academia_id uuid,
  p_persona_id uuid,
  p_cargo_ids uuid[],
  p_monto_total numeric,
  p_metodo_pago text,
  p_idempotency_key text,
  p_referencia text DEFAULT NULL,
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

  -- Insertar movimiento (Idempotencia protegida por UNIQUE constraint)
  -- NOTA: Como requiere p_actor_id que es un usuario, usamos gen_random_uuid si no se manda para testing o 
  -- asumimos que el frontend siempre mandará el UUID de quien realiza el cobro.
  INSERT INTO movimiento (id, academia_id, persona_id, monto_total, monto_disponible, metodo_pago, referencia, idempotency_key, created_by)
  VALUES (v_mov_id, p_academia_id, p_persona_id, p_monto_total, p_monto_total, p_metodo_pago, p_referencia, p_idempotency_key, COALESCE(p_actor_id, sipra_auth.get_my_user_id()));

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
  VALUES (v_tl_id, p_academia_id, p_persona_id, 'financiero', 'abono_registrado', 'Pago registrado', 
          'Se registró un pago por ' || p_monto_total::text || ' ' || p_metodo_pago, 
          COALESCE(p_actor_id, sipra_auth.get_my_user_id()), v_persona_nombre, 
          jsonb_build_object('movimiento_id', v_mov_id, 'monto', p_monto_total, 'metodo', p_metodo_pago));

  RETURN jsonb_build_object(
    'success', true,
    'operation_id', v_mov_id,
    'timeline_event_id', v_tl_id,
    'data', jsonb_build_object('monto_sobrante', v_monto_restante),
    'warnings', '[]'::jsonb,
    'needs_refresh', false
  );
EXCEPTION WHEN OTHERS THEN 
  -- La transacción es deshecha automáticamente por postgres
  RAISE;
END;
$$;
