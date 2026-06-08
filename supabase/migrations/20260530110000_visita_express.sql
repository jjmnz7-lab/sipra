-- ==============================================================================
-- Migración: visita_express
-- Descripción: RPC para "Cobro express de visita" — caso de uso típico:
--   alumno por_visita llega a una clase suelta. El operador:
--     - Solo carga (si no paga ahora): saldo_acumulado sube → queda en deuda.
--     - Carga y cobra (si paga ahora en efectivo/etc): cargo + pago aplicado en
--       la misma transacción → saldo_acumulado neto sin cambio.
--   Todo dentro de la RPC = bloque transaccional atómico (PostgreSQL).
-- ==============================================================================

-- 0. Ampliar valores permitidos de origen para incluir 'visita_express'.
ALTER TABLE public.cargo DROP CONSTRAINT IF EXISTS chk_cargo_origen;
ALTER TABLE public.cargo ADD CONSTRAINT chk_cargo_origen
  CHECK (origen IN (
    'manual','grupal','mensualidad','ajuste','1er mensualidad',
    'inscripcion','recurrente','visita_express'
  ));

CREATE OR REPLACE FUNCTION public.procesar_visita_express_v1(
  p_academia_id     uuid,
  p_alumno_id       uuid,
  p_monto_cargo     numeric,
  p_concepto        text   DEFAULT 'Visita / Clase suelta',
  p_monto_pago      numeric DEFAULT NULL,
  p_metodo_pago     text   DEFAULT 'efectivo',
  p_idempotency_key text   DEFAULT NULL,
  p_referencia      text   DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_actor_id        uuid;
  v_cargo_id        uuid := gen_random_uuid();
  v_mov_id          uuid;
  v_concepto        text;
  v_persona_nombre  text;
  v_solo_cargar     boolean;
  v_monto_pago      numeric;
  v_monto_aplicado  numeric;
  v_nuevo_saldo     numeric;
  v_nuevo_estado    text;
BEGIN
  -- 1. SEGURIDAD
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  -- 2. VALIDACIÓN
  IF p_monto_cargo IS NULL OR p_monto_cargo <= 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;

  v_monto_pago  := COALESCE(p_monto_pago, 0);
  v_solo_cargar := (v_monto_pago = 0);

  IF v_monto_pago < 0 OR v_monto_pago > p_monto_cargo THEN
    -- En visita express el pago no excede el cargo; cualquier crédito sobrante se
    -- maneja por el flujo de pagos normal, no acá.
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;

  -- Persona pertenece al tenant
  SELECT (nombre || ' ' || COALESCE(apellido, '')) INTO v_persona_nombre
  FROM persona
  WHERE id = p_alumno_id AND academia_id = p_academia_id;
  IF v_persona_nombre IS NULL THEN
    RAISE EXCEPTION 'ALUMNO_NO_ENCONTRADO' USING ERRCODE = 'P0002';
  END IF;

  v_actor_id := sipra_auth.get_my_user_id();
  v_concepto := trim(COALESCE(p_concepto, 'Visita / Clase suelta'));

  -- 3. INSERTAR CARGO (trigger sync_saldo_acumulado lo suma al saldo del alumno)
  INSERT INTO cargo (
    id, academia_id, persona_id, concepto, monto_original, saldo_pendiente,
    estado_financiero, fecha_vencimiento, origen, metadata, created_by
  ) VALUES (
    v_cargo_id, p_academia_id, p_alumno_id, v_concepto, p_monto_cargo, p_monto_cargo,
    'pendiente', current_date, 'visita_express',
    jsonb_build_object('visita_express', true, 'cobrado_en_el_momento', NOT v_solo_cargar),
    v_actor_id
  );

  INSERT INTO evento_timeline (
    id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, actor_nombre, metadata
  ) VALUES (
    gen_random_uuid(), p_academia_id, p_alumno_id, 'financiero', 'cargo_generado',
    'Visita: ' || v_concepto,
    'Cargo por visita por $' || p_monto_cargo::text,
    v_actor_id, v_persona_nombre,
    jsonb_build_object('cargo_id', v_cargo_id, 'monto', p_monto_cargo)
  );

  -- 4. SI VINO MONTO_PAGO: cargar y cobrar en la misma transacción.
  IF NOT v_solo_cargar THEN
    IF p_idempotency_key IS NULL OR char_length(trim(p_idempotency_key)) = 0 THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_REQUERIDA' USING ERRCODE = 'P0002';
    END IF;

    v_mov_id := gen_random_uuid();

    INSERT INTO movimiento (
      id, academia_id, persona_id, monto_total, monto_disponible,
      metodo_pago, referencia, idempotency_key, created_by
    ) VALUES (
      v_mov_id, p_academia_id, p_alumno_id, v_monto_pago, 0,
      p_metodo_pago, p_referencia, p_idempotency_key, v_actor_id
    );

    v_monto_aplicado := LEAST(v_monto_pago, p_monto_cargo);
    v_nuevo_saldo    := p_monto_cargo - v_monto_aplicado;
    v_nuevo_estado   := CASE
      WHEN v_nuevo_saldo = 0           THEN 'liquidado'
      WHEN v_nuevo_saldo < p_monto_cargo THEN 'parcial'
      ELSE 'pendiente'
    END;

    INSERT INTO aplicacion_movimiento (academia_id, movimiento_id, cargo_id, monto_aplicado)
    VALUES (p_academia_id, v_mov_id, v_cargo_id, v_monto_aplicado);

    UPDATE cargo
    SET saldo_pendiente   = v_nuevo_saldo,
        estado_financiero = v_nuevo_estado,
        updated_at        = now()
    WHERE id = v_cargo_id;

    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, actor_nombre, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, p_alumno_id, 'financiero', 'abono_registrado',
      'Pago de visita',
      'Pago de $' || v_monto_pago::text || ' (' || p_metodo_pago || ') al ingresar',
      v_actor_id, v_persona_nombre,
      jsonb_build_object('movimiento_id', v_mov_id, 'cargo_id', v_cargo_id, 'monto', v_monto_pago, 'metodo', p_metodo_pago)
    );
  END IF;

  RETURN jsonb_build_object(
    'success',     true,
    'modo',        CASE WHEN v_solo_cargar THEN 'solo_cargar' ELSE 'cargar_y_cobrar' END,
    'cargo_id',    v_cargo_id,
    'movimiento_id', v_mov_id,
    'monto_cargo', p_monto_cargo,
    'monto_pago',  v_monto_pago
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.procesar_visita_express_v1(uuid, uuid, numeric, text, numeric, text, text, text) TO authenticated;
