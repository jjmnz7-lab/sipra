-- ==============================================================================
-- Migración: cargo_masivo_lote
-- Descripción: soporte para cargos masivos que abarcan MÁS DE UN grupo en una
--   sola operación, mostrados como UNA sola tarjeta en "Control de cargos
--   grupales/masivos" de Reportes.
--
--   Mecanismo: se agrega el parámetro opcional `p_lote_id` a crear_cargo_grupal_v1.
--   Cuando viene informado, se persiste en metadata.lote_id de cada cargo. El
--   reporte agrupa por lote_id (cuando existe) en lugar de por idempotency_key,
--   de modo que los cargos generados para varios grupos en la misma operación
--   colapsan en un único lote/tarjeta.
--
--   Cada llamada por grupo conserva su propio idempotency_key (único por
--   grupo+lote) para que la idempotencia siga funcionando ante reenvíos, pero
--   todos comparten el mismo lote_id.
--
--   Compatibilidad: los cargos grupales de un solo grupo (y los históricos) no
--   reciben lote_id (NULL) y siguen agrupándose por idempotency_key como antes.
--
-- DOWN (referencia):
--   Restaurar la firma previa de crear_cargo_grupal_v1 desde
--   20260610120000_cargos_sin_vencimiento.sql.
-- ==============================================================================

DROP FUNCTION IF EXISTS public.crear_cargo_grupal_v1(uuid, uuid, text, numeric, uuid[], text, text);
DROP FUNCTION IF EXISTS public.crear_cargo_grupal_v1(uuid, uuid, text, numeric, uuid[], text, text, text);

CREATE OR REPLACE FUNCTION public.crear_cargo_grupal_v1(
  p_academia_id    uuid,
  p_grupo_id       uuid,
  p_concepto       text,
  p_monto          numeric,
  p_excluded_persona_ids uuid[],
  p_idempotency_key text,
  p_origen         text DEFAULT 'grupal',
  p_lote_id        text DEFAULT NULL
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
      jsonb_strip_nulls(jsonb_build_object(
        'generado_grupal', true,
        'grupo_id', p_grupo_id,
        'idempotency_key', p_idempotency_key,
        'lote_id', p_lote_id
      ))
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
