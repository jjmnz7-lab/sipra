-- ==============================================================================
-- Fix: procesar_recargos_v1 insertaba cargo.origen = 'automatizado', valor que
-- NO está permitido por chk_cargo_origen vigente (20260610130000_actividades.sql:
-- solo 'manual','grupal','mensualidad','ajuste','1er mensualidad','inscripcion',
-- 'recurrente','visita_express','actividad'). Cualquier academia con
-- config_recargos.aplicar_recargos=true que le tocara aplicar un recargo hacía
-- que la función truene con una violación de CHECK constraint (23514) en vez de
-- crear el cargo. Ninguna academia real lo tenía activo (verificado 2026-07-03),
-- y no hay ningún caller en app/ hoy (no está en el cron de mensualidades ni en
-- ninguna server action) — bug latente, no reventado en producción todavía.
--
-- Fix: usar 'ajuste' (ya permitido, y semánticamente correcto para un cargo de
-- ajuste automático como un recargo por mora). No hay ningún lugar en el
-- frontend (grep en app/ y lib/) que dependa del valor literal 'automatizado',
-- así que el cambio es seguro sin tocar UI.
--
-- Mismo cuerpo que 20260609000000_timeline_v2.sql, solo cambia esa constante.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.procesar_recargos_v1(
  p_academia_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_config             jsonb;
  v_is_active          boolean;
  v_reglas             jsonb;
  v_regla              jsonb;
  v_cargo              record;
  v_dias_retraso       integer;
  v_recargos_generados integer := 0;
  v_tl_id              uuid;
  v_persona_nombre     text;
  v_monto_base         numeric;
  v_monto_recargo      numeric;
  v_regla_dia          int;
  v_regla_tipo         text;
  v_regla_valor        numeric;
BEGIN
  -- 1. SEGURIDAD (idéntica a v1)
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    NULL;  -- Permitido cuando viene de service_role / cron.
  END IF;

  -- 2. CARGAR CONFIGURACIÓN
  SELECT config_recargos INTO v_config
  FROM academia
  WHERE id = p_academia_id;

  -- 3. RESOLVER FLAG DE ACTIVACIÓN (acepta ambos formatos)
  v_is_active := COALESCE(
    (v_config->>'aplicar_recargos')::boolean,
    (v_config->>'activo')::boolean,
    false
  );

  -- 4. NORMALIZAR REGLAS (nueva shape → ok; legacy → mapear desde escalones).
  IF v_config ? 'reglas' THEN
    v_reglas := v_config->'reglas';
  ELSIF v_config ? 'escalones' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'dia',   (e->>'dias_retraso')::int,
      'tipo',  'monto_fijo',
      'valor', (e->>'monto')::numeric
    )), '[]'::jsonb)
      INTO v_reglas
    FROM jsonb_array_elements(v_config->'escalones') AS e;
  ELSE
    v_reglas := '[]'::jsonb;
  END IF;

  IF NOT v_is_active OR jsonb_array_length(v_reglas) = 0 THEN
    RETURN jsonb_build_object('success', true, 'recargos_generados', 0,
                              'message', 'Recargos desactivados o sin reglas');
  END IF;

  -- 5. BUCLE PRINCIPAL SOBRE CARGOS VENCIDOS O PARCIALES
  FOR v_cargo IN
    SELECT c.id, c.persona_id, c.fecha_vencimiento, c.concepto, c.monto_original
    FROM cargo c
    WHERE c.academia_id = p_academia_id
      AND c.estado_financiero IN ('vencido', 'parcial')
      AND c.fecha_vencimiento < current_date
  LOOP
    v_dias_retraso := current_date - v_cargo.fecha_vencimiento;
    v_monto_base := COALESCE(v_cargo.monto_original, 0);

    FOR v_regla IN SELECT * FROM jsonb_array_elements(v_reglas)
    LOOP
      v_regla_dia   := (v_regla->>'dia')::int;
      v_regla_tipo  := v_regla->>'tipo';
      v_regla_valor := (v_regla->>'valor')::numeric;

      IF v_dias_retraso >= v_regla_dia THEN
        IF NOT EXISTS (
          SELECT 1 FROM cargo r
          WHERE r.academia_id = p_academia_id
            AND r.persona_id = v_cargo.persona_id
            AND r.metadata->>'cargo_padre_id' = v_cargo.id::text
            AND r.metadata->>'regla_dia' = v_regla_dia::text
        ) THEN
          v_monto_recargo := CASE v_regla_tipo
            WHEN 'porcentaje' THEN round(v_monto_base * v_regla_valor / 100.0, 2)
            ELSE v_regla_valor
          END;

          IF v_monto_recargo > 0 THEN
            INSERT INTO cargo (
              academia_id, persona_id, concepto, monto_original, saldo_pendiente,
              estado_financiero, fecha_vencimiento, origen, metadata
            ) VALUES (
              p_academia_id, v_cargo.persona_id,
              'Recargo por mora (' || v_regla_dia || ' días) - ' || v_cargo.concepto,
              v_monto_recargo, v_monto_recargo,
              'vencido', current_date, 'ajuste',
              jsonb_build_object(
                'cargo_padre_id', v_cargo.id,
                'regla_dia',      v_regla_dia,
                'regla_tipo',     v_regla_tipo,
                'regla_valor',    v_regla_valor
              )
            );

            v_recargos_generados := v_recargos_generados + 1;

            SELECT (nombre || ' ' || COALESCE(apellido, '')) INTO v_persona_nombre
            FROM persona WHERE id = v_cargo.persona_id;

            v_tl_id := gen_random_uuid();
            INSERT INTO evento_timeline (
              id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_nombre, metadata
            ) VALUES (
              v_tl_id, p_academia_id, v_cargo.persona_id, 'FINANZAS', 'RECARGO_TARDIO', 'Recargo por atraso',
              v_dias_retraso || ' días de retraso · ' || v_cargo.concepto,
              v_monto_recargo,
              'Sistema', jsonb_build_object(
                'cargo_padre_id', v_cargo.id,
                'monto_recargo',  v_monto_recargo,
                'regla_dia',      v_regla_dia,
                'regla_tipo',     v_regla_tipo
              )
            );
          END IF;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'recargos_generados', v_recargos_generados
  );
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;
