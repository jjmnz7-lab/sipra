-- ==============================================================================
-- Migración: cargos_sin_vencimiento
-- Descripción: los cargos one-off (individual y grupal/masivo) dejan de llevar
--   fecha de vencimiento. Se guardan con cargo.fecha_vencimiento = NULL.
--
--   Solo los cargos recurrentes (mensualidades, inscripción) conservan
--   fecha_vencimiento, que es lo que el motor de recargos usa hoy para calcular
--   la mora. Los cargos NULL nunca generan recargo (el motor filtra
--   `fecha_vencimiento < current_date`, y NULL no cumple), que es el efecto
--   deseado.
--
--   Cambios:
--     1) cargo.fecha_vencimiento pasa a NULLABLE.
--     2) crear_cargo_individual_v1: se quita el parámetro p_fecha_vencimiento;
--        inserta NULL.
--     3) crear_cargo_grupal_v1: se quita el parámetro p_fecha_vencimiento;
--        inserta NULL.
--     4) revertir_pago_atomico_v1: al revertir un pago sobre un cargo sin
--        vencimiento (NULL) el cargo vuelve a 'pendiente' (no 'vencido').
--
-- DOWN (referencia):
--   ALTER TABLE public.cargo ALTER COLUMN fecha_vencimiento SET NOT NULL; -- requiere backfill
--   -- y restaurar las firmas previas de los 3 RPCs desde timeline_v2.
-- ==============================================================================

-- 1. Columna nullable -----------------------------------------------------------
ALTER TABLE public.cargo ALTER COLUMN fecha_vencimiento DROP NOT NULL;

-- 2. crear_cargo_individual_v1 (sin p_fecha_vencimiento) ------------------------
DROP FUNCTION IF EXISTS public.crear_cargo_individual_v1(uuid, uuid, text, numeric, date, text);

CREATE OR REPLACE FUNCTION public.crear_cargo_individual_v1(
  p_academia_id      uuid,
  p_persona_id       uuid,
  p_concepto         text,
  p_monto            numeric,
  p_origen           text DEFAULT 'manual'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_actor_id uuid;
  v_cargo_id uuid;
  v_es_inscripcion boolean;
BEGIN
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;
  IF p_monto <= 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;
  IF char_length(trim(p_concepto)) = 0 THEN
    RAISE EXCEPTION 'CONCEPTO_REQUERIDO' USING ERRCODE = 'P0002';
  END IF;

  v_actor_id := sipra_auth.get_my_user_id();
  v_es_inscripcion := (p_origen = 'inscripcion') OR (trim(p_concepto) ILIKE 'inscripci%');

  -- Cargo one-off: sin vencimiento (NULL). Solo los recurrentes lo usan para recargos.
  INSERT INTO cargo (
    academia_id, persona_id, concepto, monto_original, saldo_pendiente,
    estado_financiero, fecha_vencimiento, origen, metadata
  ) VALUES (
    p_academia_id, p_persona_id, p_concepto, p_monto, p_monto,
    'pendiente', NULL, p_origen,
    jsonb_build_object('manual', true)
  ) RETURNING id INTO v_cargo_id;

  INSERT INTO evento_timeline (
    id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_id, metadata
  ) VALUES (
    gen_random_uuid(), p_academia_id, p_persona_id, 'FINANZAS',
    CASE WHEN v_es_inscripcion THEN 'INSCRIPCION' ELSE 'CARGO_UNICO' END,
    CASE WHEN v_es_inscripcion THEN 'Cargo: Inscripción' ELSE 'Cargo individual' END,
    trim(p_concepto),
    p_monto,
    v_actor_id,
    jsonb_build_object('monto', p_monto, 'cargo_id', v_cargo_id)
  );

  RETURN jsonb_build_object('success', true, 'cargo_id', v_cargo_id);
END;
$$;

-- 3. crear_cargo_grupal_v1 (sin p_fecha_vencimiento) ---------------------------
DROP FUNCTION IF EXISTS public.crear_cargo_grupal_v1(uuid, uuid, text, numeric, date, uuid[], text, text);

CREATE OR REPLACE FUNCTION public.crear_cargo_grupal_v1(
  p_academia_id    uuid,
  p_grupo_id       uuid,
  p_concepto       text,
  p_monto          numeric,
  p_excluded_persona_ids uuid[],
  p_idempotency_key text,
  p_origen         text DEFAULT 'grupal'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_persona        record;
  v_cargos_creados integer := 0;
  v_tl_id          uuid;
  v_actor_id       uuid;
  v_cargo_id       uuid;
  v_grupo_nombre   text;
BEGIN
  -- 1. SEGURIDAD
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  v_actor_id := sipra_auth.get_my_user_id();

  -- 2. VALIDACIONES Y IDEMPOTENCIA
  IF p_monto <= 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1 FROM cargo
    WHERE academia_id = p_academia_id
      AND metadata->>'idempotency_key' = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'cargos_creados', 0,
      'idempotent_hit', true,
      'needs_refresh', false
    );
  END IF;

  SELECT nombre INTO v_grupo_nombre FROM grupo WHERE id = p_grupo_id AND academia_id = p_academia_id;

  -- 3. BUCLE SOBRE MIEMBROS ACTIVOS DEL GRUPO (Aplicando Exclusiones)
  FOR v_persona IN
    SELECT pg.persona_id
    FROM persona_grupo pg
    JOIN persona p ON p.id = pg.persona_id
    WHERE pg.academia_id = p_academia_id
      AND pg.grupo_id = p_grupo_id
      AND pg.estado = 'activo'
      AND p.estado_registro = 'activo'
      AND NOT (pg.persona_id = ANY(p_excluded_persona_ids))
    ORDER BY pg.persona_id ASC
  LOOP
    -- Cargo one-off masivo: sin vencimiento (NULL).
    INSERT INTO cargo (
      academia_id, persona_id, concepto, monto_original, saldo_pendiente,
      estado_financiero, fecha_vencimiento, origen, metadata
    ) VALUES (
      p_academia_id, v_persona.persona_id, p_concepto, p_monto, p_monto,
      'pendiente', NULL, p_origen,
      jsonb_build_object(
        'generado_grupal', true,
        'grupo_id', p_grupo_id,
        'idempotency_key', p_idempotency_key
      )
    ) RETURNING id INTO v_cargo_id;

    -- TIMELINE → CARGO_MASIVO
    v_tl_id := gen_random_uuid();
    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_id, metadata
    ) VALUES (
      v_tl_id, p_academia_id, v_persona.persona_id, 'FINANZAS', 'CARGO_MASIVO',
      'Cargo grupal',
      p_concepto || COALESCE(' · ' || v_grupo_nombre, ''),
      p_monto,
      v_actor_id,
      jsonb_build_object('monto', p_monto, 'grupo_id', p_grupo_id, 'cargo_id', v_cargo_id)
    );

    v_cargos_creados := v_cargos_creados + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'cargos_creados', v_cargos_creados,
    'idempotent_hit', false,
    'needs_refresh', true
  );
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- 4. revertir_pago_atomico_v1 (null-safe en fecha_vencimiento) -----------------
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
        -- Sin vencimiento (cargos one-off) o aún por vencer → no es mora.
        IF v_cargo.fecha_vencimiento IS NULL OR v_cargo.fecha_vencimiento > now() THEN
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

  -- 5. TIMELINE → ANULACION_PAGO
  INSERT INTO evento_timeline (id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_id, actor_nombre, metadata)
  VALUES (v_tl_id, p_academia_id, v_movimiento.persona_id, 'FINANZAS', 'ANULACION_PAGO', 'Pago cancelado',
          p_motivo,
          v_movimiento.monto_total,
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
