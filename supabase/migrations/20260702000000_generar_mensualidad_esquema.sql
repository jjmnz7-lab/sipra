-- ==============================================================================
-- Migración: generar_mensualidad_esquema
-- Descripción: RPC `generar_mensualidad_esquema_v1` — genera la mensualidad del
--   MES EN CURSO cuando se le asigna un esquema mensual a un alumno DESPUÉS del
--   día 1 (el cron solo materializa mensualidades ese día; quien recibe su
--   esquema más tarde quedaba sin cargo hasta el mes siguiente — caso "Macías",
--   detectado 2026-07-02).
--
--   La llaman editarAlumnoAction (Guardar cambios) y, como red de seguridad,
--   cualquier flujo que asigne un plan mensual fuera del alta con cargo.
--
--   Reglas de monto (día de la asignación sobre config_cobro):
--     1) reglas_dias (si existen): bracket del día → completo / proporcional /
--        no_cobrar. NOTA deliberada: aquí las reglas_dias tienen PRECEDENCIA
--        sobre regimen_alta — regimen_alta gobierna el alta de alumnos nuevos;
--        para un alumno ya inscrito que recibe su esquema tarde, la academia
--        espera el cobro del mes según sus brackets (decisión de producto).
--     2) sin reglas_dias: regimen_alta → modo_prorrateo → 'proporcional'.
--     3) proporcional = monto × días_restantes/días_mes, con
--        proporcional_redondeo ('ninguno' | N → múltiplos de N), igual que
--        calcular_cargo_plan_v1.
--
--   Anti-duplicados (lección de los 26 duplicados del 2026-07-02): deduplica
--   por PERSONA + PERIODO sobre la familia mensualidad (cualquier plan), no por
--   plan — si el alumno ya tiene una mensualidad del mes (del cron, de un plan
--   anterior reemplazado, o el cargo inicial de alta con plan mensual) NO se
--   genera otra. También respeta meses_sin_cobro y aplica descuentos
--   especiales, exento por beca 100% y consumo de saldo a favor, idéntico a
--   generar_cargos_recurrentes_v1.
--
-- DOWN (referencia):
--   DROP FUNCTION IF EXISTS public.generar_mensualidad_esquema_v1(uuid, uuid, uuid, date);
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.generar_mensualidad_esquema_v1(
  p_academia_id   uuid,
  p_persona_id    uuid,
  p_plan_cobro_id uuid,
  p_fecha         date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_actor_id       uuid;
  v_tz             text;
  v_fecha          date;
  v_plan           record;
  v_persona        record;
  v_config         jsonb;
  v_periodo        text;
  v_mes_actual     int;
  v_concepto       text;
  v_fecha_venc     date;
  v_dias_mes       int;
  v_dia            int;
  v_dias_restantes int;
  v_regla          jsonb;
  v_regla_match    jsonb := NULL;
  v_dia_fin_eval   int;
  v_accion         text;
  v_redondeo_str   text;
  v_redondeo       int;
  v_bruto          numeric;
  v_desc_monto     numeric := 0;
  v_desc_tipo      text;
  v_desc_label     text;
  v_neto           numeric;
  v_cargo_id       uuid;
  -- Saldo a favor
  v_mov            record;
  v_saldo_cargo    numeric;
  v_aplicar        numeric;
  v_credito_usado  numeric := 0;
  v_nuevo_estado   text;
  v_meses_es       text[] := ARRAY[
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ];
BEGIN
  -- 1. SEGURIDAD
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;
  v_actor_id := sipra_auth.get_my_user_id();

  -- 2. FECHA en el calendario de la academia (timezone por-tenant).
  SELECT timezone, config_cobro INTO v_tz, v_config
  FROM academia WHERE id = p_academia_id;
  v_fecha := COALESCE(p_fecha, (now() AT TIME ZONE COALESCE(v_tz, 'America/Mexico_City'))::date);

  v_dias_mes       := EXTRACT(day FROM (date_trunc('month', v_fecha) + interval '1 month - 1 day'))::int;
  v_dia            := EXTRACT(day FROM v_fecha)::int;
  v_dias_restantes := v_dias_mes - v_dia + 1;
  v_mes_actual     := EXTRACT(month FROM v_fecha)::int;
  v_periodo        := 'M' || to_char(v_fecha, 'YYYY-MM');
  v_concepto       := 'Mensualidad ' || v_meses_es[v_mes_actual] || ' ' || to_char(v_fecha, 'YYYY');
  v_fecha_venc     := (date_trunc('month', v_fecha) + interval '1 month - 1 day')::date;

  -- 3. PLAN: debe ser mensual, activo y con monto > 0.
  SELECT id, nombre, monto, frecuencia, activo INTO v_plan
  FROM planes_cobro WHERE id = p_plan_cobro_id AND academia_id = p_academia_id;
  IF NOT FOUND OR v_plan.frecuencia <> 'mensual' OR NOT v_plan.activo OR COALESCE(v_plan.monto, 0) <= 0 THEN
    RETURN jsonb_build_object('generado', false, 'motivo', 'plan_no_aplica');
  END IF;

  -- 4. PERSONA: alumno activo (suspendidos no reciben cargos, igual que el cron).
  SELECT estado_registro, etiqueta,
         descuento_hermanos_activo, descuento_hermanos_monto, beca_activa, beca_porcentaje
    INTO v_persona
  FROM persona WHERE id = p_persona_id AND academia_id = p_academia_id;
  IF NOT FOUND OR v_persona.etiqueta <> 'alumno' OR v_persona.estado_registro <> 'activo' THEN
    RETURN jsonb_build_object('generado', false, 'motivo', 'alumno_no_aplica');
  END IF;

  -- 5. MES SIN COBRO configurado → no se genera.
  IF COALESCE(v_config->'meses_sin_cobro', '[]'::jsonb) @> to_jsonb(v_mes_actual) THEN
    RETURN jsonb_build_object('generado', false, 'motivo', 'mes_sin_cobro');
  END IF;

  -- 6. ANTI-DUPLICADO por persona + periodo (familia mensualidad, cualquier plan):
  --    cubre la mensualidad del cron (metadata.periodo), la de un plan anterior
  --    reemplazado este mes, y el cargo inicial de alta con plan mensual
  --    (inscripcion_inicial, sin periodo, del mismo mes local).
  IF EXISTS (
    SELECT 1 FROM cargo c
    WHERE c.academia_id = p_academia_id
      AND c.persona_id = p_persona_id
      AND c.estado_financiero <> 'anulado'
      AND (
        c.metadata->>'periodo' = v_periodo
        OR (
          COALESCE((c.metadata->>'inscripcion_inicial')::boolean, false)
          AND EXISTS (
            SELECT 1 FROM planes_cobro pc
            WHERE pc.id = (c.metadata->>'plan_id')::uuid AND pc.frecuencia = 'mensual'
          )
          AND date_trunc('month', c.created_at AT TIME ZONE COALESCE(v_tz, 'America/Mexico_City'))
              = date_trunc('month', v_fecha::timestamp)
        )
      )
  ) THEN
    RETURN jsonb_build_object('generado', false, 'motivo', 'periodo_cubierto');
  END IF;

  -- 7. ACCIÓN por reglas_dias (precedencia) o fallback regimen_alta/modo_prorrateo.
  IF jsonb_array_length(COALESCE(v_config->'reglas_dias', '[]'::jsonb)) > 0 THEN
    FOR v_regla IN SELECT * FROM jsonb_array_elements(v_config->'reglas_dias')
    LOOP
      v_dia_fin_eval := CASE
        WHEN v_regla->>'dia_fin' = 'fin_mes' THEN v_dias_mes
        ELSE (v_regla->>'dia_fin')::int
      END;
      IF v_dia BETWEEN (v_regla->>'dia_inicio')::int AND v_dia_fin_eval THEN
        v_regla_match := v_regla;
        EXIT;
      END IF;
    END LOOP;
    v_accion := COALESCE(v_regla_match->>'accion', 'completo');
  ELSE
    v_accion := CASE COALESCE(v_config->>'regimen_alta', v_config->>'modo_prorrateo', 'proporcional')
      WHEN 'completo'  THEN 'completo'
      WHEN 'no_cobrar' THEN 'no_cobrar'
      ELSE 'proporcional'
    END;
  END IF;

  IF v_accion = 'no_cobrar' THEN
    RETURN jsonb_build_object('generado', false, 'motivo', 'regla_no_cobrar');
  END IF;

  -- 8. MONTO bruto (completo o proporcional con redondeo, como calcular_cargo_plan_v1).
  IF v_accion = 'proporcional' THEN
    v_bruto := round(v_plan.monto * v_dias_restantes::numeric / v_dias_mes::numeric, 2);
    v_redondeo_str := COALESCE(v_config->>'proporcional_redondeo', 'ninguno');
    v_redondeo := CASE v_redondeo_str WHEN 'ninguno' THEN 0 ELSE v_redondeo_str::int END;
    IF v_redondeo > 0 THEN
      v_bruto := round(v_bruto / v_redondeo) * v_redondeo;
    END IF;
  ELSE
    v_bruto := v_plan.monto;
  END IF;

  -- 9. DESCUENTOS especiales (idéntico al cron; exclusión mutua por CHECK).
  IF COALESCE(v_persona.beca_activa, false) AND COALESCE(v_persona.beca_porcentaje, 0) > 0 THEN
    v_desc_monto := round(v_bruto * v_persona.beca_porcentaje / 100.0);
    v_desc_tipo  := 'beca';
    v_desc_label := 'Beca ' || v_persona.beca_porcentaje || '%';
  ELSIF COALESCE(v_persona.descuento_hermanos_activo, false) AND COALESCE(v_persona.descuento_hermanos_monto, 0) > 0 THEN
    v_desc_monto := LEAST(v_bruto, v_persona.descuento_hermanos_monto::numeric);
    v_desc_tipo  := 'hermanos';
    v_desc_label := 'Descuento Hermanos';
  END IF;
  v_neto := v_bruto - v_desc_monto;

  -- Exento total (beca 100% / descuento ≥ monto): línea informativa, sin cargo.
  IF v_neto <= 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM evento_timeline e
      WHERE e.academia_id = p_academia_id AND e.persona_id = p_persona_id
        AND e.tipo = 'DESCUENTO' AND e.metadata->>'periodo' = v_periodo
    ) THEN
      INSERT INTO evento_timeline (
        id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
      ) VALUES (
        gen_random_uuid(), p_academia_id, p_persona_id, 'FINANZAS', 'DESCUENTO',
        v_desc_label,
        v_concepto || ' · exento (−$' || v_desc_monto::int || ')',
        v_actor_id,
        jsonb_build_object(
          'descuento_tipo', v_desc_tipo, 'descuento_monto', v_desc_monto,
          'monto_bruto', v_bruto, 'periodo', v_periodo, 'exento', true
        )
      );
    END IF;
    RETURN jsonb_build_object('generado', false, 'motivo', 'exento', 'concepto', v_concepto);
  END IF;

  -- 10. CARGO (origen 'recurrente' + metadata.periodo: entra al lote de Reportes
  --     y el cron del próximo día 1 de este mes ya no lo duplica).
  INSERT INTO cargo (
    academia_id, persona_id, concepto, monto_original, saldo_pendiente,
    estado_financiero, fecha_vencimiento, origen, metadata
  ) VALUES (
    p_academia_id, p_persona_id, v_concepto, v_neto, v_neto,
    'pendiente', v_fecha_venc, 'recurrente',
    jsonb_build_object(
      'plan_id', v_plan.id, 'plan_nombre', v_plan.nombre,
      'periodo', v_periodo, 'frecuencia', 'mensual',
      'alta_esquema', true, 'accion', v_accion,
      'dias_restantes', v_dias_restantes, 'dias_mes', v_dias_mes
    ) || (CASE WHEN v_desc_monto > 0 THEN jsonb_build_object(
      'monto_bruto', v_bruto, 'descuento_tipo', v_desc_tipo, 'descuento_monto', v_desc_monto
    ) ELSE '{}'::jsonb END)
  ) RETURNING id INTO v_cargo_id;

  INSERT INTO evento_timeline (
    id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
  ) VALUES (
    gen_random_uuid(), p_academia_id, p_persona_id, 'financiero', 'cargo_generado',
    v_concepto,
    'Mensualidad generada al asignar el esquema ' || v_plan.nombre || ' por $' || v_neto::text,
    v_actor_id,
    jsonb_build_object('monto', v_neto, 'plan_id', v_plan.id, 'periodo', v_periodo, 'cargo_id', v_cargo_id)
  );

  IF v_desc_monto > 0 THEN
    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, p_persona_id, 'FINANZAS', 'DESCUENTO',
      v_desc_label,
      v_concepto || ': $' || v_bruto::int || ' → $' || v_neto::int || ' (−$' || v_desc_monto::int || ')',
      v_actor_id,
      jsonb_build_object(
        'descuento_tipo', v_desc_tipo, 'descuento_monto', v_desc_monto,
        'monto_bruto', v_bruto, 'periodo', v_periodo, 'cargo_id', v_cargo_id
      )
    );
  END IF;

  -- 11. SALDO A FAVOR (FIFO), igual que el cron.
  v_saldo_cargo := v_neto;
  FOR v_mov IN
    SELECT id, monto_disponible FROM movimiento
    WHERE academia_id = p_academia_id AND persona_id = p_persona_id AND monto_disponible > 0
    ORDER BY created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_saldo_cargo <= 0;
    v_aplicar := LEAST(v_mov.monto_disponible, v_saldo_cargo);

    INSERT INTO aplicacion_movimiento (academia_id, movimiento_id, cargo_id, monto_aplicado)
    VALUES (p_academia_id, v_mov.id, v_cargo_id, v_aplicar);

    UPDATE movimiento SET monto_disponible = monto_disponible - v_aplicar WHERE id = v_mov.id;

    v_saldo_cargo   := v_saldo_cargo - v_aplicar;
    v_credito_usado := v_credito_usado + v_aplicar;
  END LOOP;

  IF v_credito_usado > 0 THEN
    v_nuevo_estado := CASE
      WHEN v_saldo_cargo <= 0     THEN 'liquidado'
      WHEN v_saldo_cargo < v_neto THEN 'parcial'
      ELSE 'pendiente'
    END;

    UPDATE cargo
    SET saldo_pendiente = v_saldo_cargo, estado_financiero = v_nuevo_estado, updated_at = now()
    WHERE id = v_cargo_id;

    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, p_persona_id, 'financiero', 'abono_registrado',
      'Saldo a favor aplicado',
      'Se aplicaron $' || v_credito_usado::text || ' de saldo a favor a ' || v_concepto,
      v_actor_id,
      jsonb_build_object('monto', v_credito_usado, 'cargo_id', v_cargo_id, 'tipo', 'saldo_a_favor')
    );
  END IF;

  RETURN jsonb_build_object(
    'generado', true,
    'cargo_id', v_cargo_id,
    'concepto', v_concepto,
    'monto',    v_neto,
    'accion',   v_accion,
    'saldo_favor_aplicado', v_credito_usado
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generar_mensualidad_esquema_v1(uuid, uuid, uuid, date) TO authenticated;
