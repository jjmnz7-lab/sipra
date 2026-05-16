-- Migración: 008_rpc_reversion
-- Descripción: Creación de función RPC para revertir un pago de forma segura sin eliminar registros.

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
  -- Recorremos las aplicaciones de este movimiento
  FOR v_aplicacion IN 
    SELECT * FROM aplicacion_movimiento 
    WHERE movimiento_id = p_movimiento_id AND academia_id = p_academia_id
    ORDER BY cargo_id ASC
  LOOP
    -- Bloquear el cargo
    SELECT * INTO v_cargo FROM cargo 
    WHERE id = v_aplicacion.cargo_id AND academia_id = p_academia_id 
    FOR UPDATE;

    IF FOUND THEN
      -- Restaurar saldo
      v_nuevo_saldo := v_cargo.saldo_pendiente + v_aplicacion.monto_aplicado;
      
      IF v_nuevo_saldo >= v_cargo.monto_original THEN
        v_nuevo_estado := 'vencido'; -- Simplificación: asume que si se revierte todo, sigue vencido (o pendiente según fecha, pero lo dejaremos así o evaluamos si fecha_vencimiento > now)
        IF v_cargo.fecha_vencimiento > now() THEN
           v_nuevo_estado := 'pendiente';
        END IF;
      ELSE
        v_nuevo_estado := 'parcial';
      END IF;

      -- Actualizar Cargo
      UPDATE cargo 
      SET saldo_pendiente = v_nuevo_saldo,
          estado_financiero = v_nuevo_estado,
          updated_at = now()
      WHERE id = v_cargo.id;

      -- Si estaba invalidado el envio sugerido por liquidación, no hay rollback fácil del envío sugerido, 
      -- se asume que si necesita cobrar de nuevo, generará o enviará otro.
    END IF;
  END LOOP;

  -- 4. ACTUALIZAR LEDGER (Marcar movimiento como anulado)
  UPDATE movimiento 
  SET estado = 'anulado',
      updated_at = now()
  WHERE id = p_movimiento_id;

  -- 5. TIMELINE
  INSERT INTO evento_timeline (id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, actor_nombre, metadata)
  VALUES (v_tl_id, p_academia_id, v_movimiento.persona_id, 'financiero', 'pago_anulado', 'Pago Anulado', 
          'Se anuló un pago de ' || v_movimiento.monto_total::text || '. Motivo: ' || p_motivo, 
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
EXCEPTION WHEN OTHERS THEN 
  RAISE;
END;
$$;
