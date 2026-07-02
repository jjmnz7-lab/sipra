-- ==============================================================================
-- Migración: crear_cargo_y_cobrar
-- Descripción: RPC `crear_cargo_y_cobrar_v1` — crea un cargo individual genérico
--   (origen 'manual' por defecto, con beca opt-in) y, opcionalmente, registra el
--   pago COMPLETO del cargo en la MISMA transacción ("Cargar y cobrar ahora").
--
--   Es el motor único del bottom sheet "Nuevo cargo": los dos botones lo llaman.
--     - "Solo cargar a cuenta"   → p_cobrar=false → solo inserta el cargo.
--     - "Cargar y cobrar ahora"  → p_cobrar=true  → cargo + movimiento + aplicación
--                                   por el NETO, cargo liquidado, todo atómico.
--
--   Reemplaza (para este flujo) el uso de crear_cargo_individual_v1: la parte de
--   creación de cargo es idéntica (mismo neto de beca, misma línea de historial),
--   pero añade el bloque de cobro modelado en procesar_visita_express_v1 /
--   registrar_pago_atomico_v1. El evento de pago usa tipo 'abono_registrado'
--   (el trigger de normalización lo canoniza a PAGO_ABONO) para que se vea y se
--   contabilice EXACTAMENTE igual que un cobro normal.
--
--   Exento (beca 100% o descuento ≥ precio → neto 0): no se crea cargo ni cobro,
--   solo la línea informativa DESCUENTO (igual que crear_cargo_individual_v1).
--
-- DOWN (referencia):
--   DROP FUNCTION IF EXISTS public.crear_cargo_y_cobrar_v1(
--     uuid, uuid, text, numeric, text, boolean, boolean, text, text);
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.crear_cargo_y_cobrar_v1(
  p_academia_id     uuid,
  p_persona_id      uuid,
  p_concepto        text,
  p_monto           numeric,
  p_origen          text    DEFAULT 'manual',
  p_aplicar_beca    boolean DEFAULT false,
  p_cobrar          boolean DEFAULT false,
  p_metodo_pago     text    DEFAULT 'efectivo',
  p_idempotency_key text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_actor_id       uuid;
  v_cargo_id       uuid;
  v_mov_id         uuid;
  v_es_inscripcion boolean;
  v_beca_activa    boolean;
  v_beca_pct       int;
  v_desc_monto     numeric := 0;
  v_neto           numeric;
  v_persona_nombre text;
BEGIN
  -- 1. SEGURIDAD
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  -- 2. VALIDACIÓN
  IF p_monto <= 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;
  IF char_length(trim(p_concepto)) = 0 THEN
    RAISE EXCEPTION 'CONCEPTO_REQUERIDO' USING ERRCODE = 'P0002';
  END IF;

  v_actor_id := sipra_auth.get_my_user_id();
  v_es_inscripcion := (p_origen = 'inscripcion') OR (trim(p_concepto) ILIKE 'inscripci%');

  SELECT (nombre || ' ' || COALESCE(apellido, '')) INTO v_persona_nombre
  FROM persona WHERE id = p_persona_id AND academia_id = p_academia_id;
  IF v_persona_nombre IS NULL THEN
    RAISE EXCEPTION 'ALUMNO_NO_ENCONTRADO' USING ERRCODE = 'P0002';
  END IF;

  -- 3. DESCUENTO POR BECA (opt-in). Idéntico a crear_cargo_individual_v1.
  v_neto := p_monto;
  IF p_aplicar_beca THEN
    SELECT beca_activa, beca_porcentaje INTO v_beca_activa, v_beca_pct
    FROM persona WHERE id = p_persona_id AND academia_id = p_academia_id;
    IF COALESCE(v_beca_activa, false) AND COALESCE(v_beca_pct, 0) > 0 THEN
      v_desc_monto := round(p_monto * v_beca_pct / 100.0);
      v_neto       := p_monto - v_desc_monto;
    END IF;
  END IF;

  -- Beca 100% (neto 0): exento. Sin cargo ni cobro; solo línea informativa.
  IF v_neto <= 0 THEN
    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, p_persona_id, 'FINANZAS', 'DESCUENTO',
      'Beca ' || v_beca_pct || '%',
      trim(p_concepto) || ' · exento (−$' || v_desc_monto::int || ')',
      v_actor_id,
      jsonb_build_object(
        'descuento_tipo', 'beca', 'descuento_monto', v_desc_monto,
        'monto_bruto', p_monto, 'beca_porcentaje', v_beca_pct, 'exento', true
      )
    );
    RETURN jsonb_build_object('success', true, 'cargo_id', NULL, 'exento', true, 'cobrado', false);
  END IF;

  -- 4. CARGO (neto). Sin vencimiento (cargo one-off). El trigger sync_saldo lo suma.
  INSERT INTO cargo (
    academia_id, persona_id, concepto, monto_original, saldo_pendiente,
    estado_financiero, fecha_vencimiento, origen, metadata
  ) VALUES (
    p_academia_id, p_persona_id, trim(p_concepto), v_neto, v_neto,
    'pendiente', NULL, p_origen,
    jsonb_build_object('manual', true)
    || (CASE WHEN v_desc_monto > 0 THEN jsonb_build_object(
      'monto_bruto', p_monto, 'descuento_tipo', 'beca', 'descuento_monto', v_desc_monto,
      'beca_porcentaje', v_beca_pct
    ) ELSE '{}'::jsonb END)
  ) RETURNING id INTO v_cargo_id;

  INSERT INTO evento_timeline (
    id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_id, metadata
  ) VALUES (
    gen_random_uuid(), p_academia_id, p_persona_id, 'FINANZAS',
    CASE WHEN v_es_inscripcion THEN 'INSCRIPCION' ELSE 'CARGO_UNICO' END,
    CASE WHEN v_es_inscripcion THEN 'Cargo: Inscripción' ELSE 'Cargo individual' END,
    trim(p_concepto),
    v_neto,
    v_actor_id,
    jsonb_build_object('monto', v_neto, 'cargo_id', v_cargo_id)
  );

  -- Línea informativa del descuento (no afecta saldo: el cargo ya es neto).
  IF v_desc_monto > 0 THEN
    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, p_persona_id, 'FINANZAS', 'DESCUENTO',
      'Beca ' || v_beca_pct || '%',
      trim(p_concepto) || ': $' || p_monto::int || ' → $' || v_neto::int || ' (−$' || v_desc_monto::int || ')',
      v_actor_id,
      jsonb_build_object(
        'descuento_tipo', 'beca', 'descuento_monto', v_desc_monto,
        'monto_bruto', p_monto, 'beca_porcentaje', v_beca_pct, 'cargo_id', v_cargo_id
      )
    );
  END IF;

  -- 5. COBRO COMPLETO (opcional). Paga el NETO en la misma transacción.
  IF p_cobrar THEN
    IF p_idempotency_key IS NULL OR char_length(trim(p_idempotency_key)) = 0 THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_REQUERIDA' USING ERRCODE = 'P0002';
    END IF;

    v_mov_id := gen_random_uuid();

    -- monto_disponible = 0: todo el pago se aplica al cargo (sin saldo a favor).
    INSERT INTO movimiento (
      id, academia_id, persona_id, monto_total, monto_disponible,
      metodo_pago, idempotency_key, created_by
    ) VALUES (
      v_mov_id, p_academia_id, p_persona_id, v_neto, 0,
      p_metodo_pago, p_idempotency_key, v_actor_id
    );

    INSERT INTO aplicacion_movimiento (academia_id, movimiento_id, cargo_id, monto_aplicado)
    VALUES (p_academia_id, v_mov_id, v_cargo_id, v_neto);

    UPDATE cargo
    SET saldo_pendiente   = 0,
        estado_financiero = 'liquidado',
        updated_at        = now()
    WHERE id = v_cargo_id;

    -- tipo 'abono_registrado' → el trigger lo normaliza a PAGO_ABONO (idéntico a
    -- registrar_pago_atomico_v1): se ve y se contabiliza como un cobro normal.
    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_id, actor_nombre, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, p_persona_id, 'financiero', 'abono_registrado',
      'Pago registrado',
      'Se registró un pago por ' || v_neto::text || ' ' || p_metodo_pago,
      v_neto, v_actor_id, v_persona_nombre,
      jsonb_build_object('movimiento_id', v_mov_id, 'monto', v_neto, 'metodo', p_metodo_pago)
    );
  END IF;

  RETURN jsonb_build_object(
    'success',       true,
    'cargo_id',      v_cargo_id,
    'movimiento_id', v_mov_id,
    'exento',        false,
    'cobrado',       p_cobrar,
    'monto_neto',    v_neto
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.crear_cargo_y_cobrar_v1(
  uuid, uuid, text, numeric, text, boolean, boolean, text, text
) TO authenticated;
