-- ==============================================================================
-- Migración: refactor_rpcs_planes_cobro
-- Descripción: Adapta los RPCs financieros al nuevo modelo desacoplado.
--   El precio ya no vive en grupo.costo_*; ahora proviene de planes_cobro y se
--   asigna a alumnos vía alumno_planes (M2M).
--
--   - calcular_cargo_inscripcion_v1(grupo)  -> reemplazado por calcular_cargo_plan_v1(plan)
--   - inscribir_alumno_a_grupo_v1           -> ahora recibe p_plan_cobro_id + p_monto,
--                                              vincula alumno_planes y crea 1 cargo.
--   - generar_mensualidades_mes_v1          -> itera alumno_planes con frecuencia='mensual'.
--
--   El prorrateo / regimen_alta se conserva, pero solo aplica a planes mensuales.
-- ==============================================================================

-- Eliminamos la función vieja basada en grupo (firma uuid, date).
DROP FUNCTION IF EXISTS public.calcular_cargo_inscripcion_v1(uuid, date);

-- ------------------------------------------------------------------------------
-- 1. calcular_cargo_plan_v1: preview del primer cargo de un plan al inscribir.
--    Lee planes_cobro (monto, frecuencia) + academia.config_cobro (regimen_alta).
--    Aplica prorrateo/regimen SOLO si frecuencia = 'mensual'. NO escribe nada.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calcular_cargo_plan_v1(
  p_plan_cobro_id     uuid,
  p_fecha_inscripcion date DEFAULT current_date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_plan             record;
  v_config           jsonb;
  v_regimen          text;
  v_redondeo_str     text;
  v_redondeo         int;
  v_dias_mes         int;
  v_dia_inscripcion  int;
  v_dias_restantes   int;
  v_monto_calc       numeric;
  v_fecha_venc       date;
  v_regla            jsonb;
  v_regla_match      jsonb := NULL;
  v_accion           text;
  v_dia_fin_eval     int;
BEGIN
  SELECT id, academia_id, nombre, monto, frecuencia
    INTO v_plan
  FROM planes_cobro
  WHERE id = p_plan_cobro_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAN_NO_ENCONTRADO' USING ERRCODE = 'P0002';
  END IF;

  IF NOT sipra_auth.is_auth_user_for_tenant(v_plan.academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  SELECT config_cobro INTO v_config FROM academia WHERE id = v_plan.academia_id;

  -- Calendario base
  v_dias_mes        := EXTRACT(day FROM (date_trunc('month', p_fecha_inscripcion) + interval '1 month - 1 day'))::int;
  v_dia_inscripcion := EXTRACT(day FROM p_fecha_inscripcion)::int;
  v_dias_restantes  := v_dias_mes - v_dia_inscripcion + 1;
  v_fecha_venc      := (date_trunc('month', p_fecha_inscripcion) + interval '1 month - 1 day')::date;

  -- Planes NO mensuales se cobran completos (sin prorrateo).
  IF v_plan.frecuencia <> 'mensual' THEN
    RETURN jsonb_build_object(
      'plan_cobro_id',     v_plan.id,
      'plan_nombre',       v_plan.nombre,
      'frecuencia',        v_plan.frecuencia,
      'monto_plan',        v_plan.monto,
      'modo_prorrateo',    'completo',
      'dias_mes',          v_dias_mes,
      'dias_restantes',    v_dias_restantes,
      'monto_calculado',   v_plan.monto,
      'fecha_vencimiento', v_fecha_venc,
      'regimen_aplicado',  'completo',
      'accion_aplicada',   'completo',
      'regla_aplicada',    NULL
    );
  END IF;

  -- Régimen para planes mensuales: nuevo formato → fallback legacy → proporcional.
  v_regimen := COALESCE(
    v_config->>'regimen_alta',
    CASE v_config->>'modo_prorrateo'
      WHEN 'completo'     THEN 'completo'
      WHEN 'proporcional' THEN 'proporcional'
      ELSE 'proporcional'
    END
  );

  v_redondeo_str := COALESCE(v_config->>'proporcional_redondeo', 'ninguno');
  v_redondeo := CASE v_redondeo_str WHEN 'ninguno' THEN 0 ELSE v_redondeo_str::int END;

  -- reglas_dias: ubicar la regla que contiene el día de inscripción.
  IF v_regimen = 'reglas_dias' THEN
    FOR v_regla IN SELECT * FROM jsonb_array_elements(COALESCE(v_config->'reglas_dias', '[]'::jsonb))
    LOOP
      v_dia_fin_eval := CASE
        WHEN v_regla->>'dia_fin' = 'fin_mes' THEN v_dias_mes
        ELSE (v_regla->>'dia_fin')::int
      END;
      IF v_dia_inscripcion BETWEEN (v_regla->>'dia_inicio')::int AND v_dia_fin_eval THEN
        v_regla_match := v_regla;
        EXIT;
      END IF;
    END LOOP;
    v_accion := COALESCE(v_regla_match->>'accion', 'completo');
  ELSE
    v_accion := v_regimen;
  END IF;

  -- Aplicar la acción resuelta sobre el monto del plan.
  IF v_plan.monto IS NULL OR v_plan.monto = 0 THEN
    v_monto_calc := 0;
  ELSIF v_accion = 'no_cobrar' THEN
    v_monto_calc := 0;
    v_fecha_venc := (date_trunc('month', p_fecha_inscripcion) + interval '1 month')::date;
  ELSIF v_accion = 'proporcional' THEN
    v_monto_calc := round(v_plan.monto * v_dias_restantes::numeric / v_dias_mes::numeric, 2);
    IF v_redondeo IS NOT NULL AND v_redondeo > 0 THEN
      v_monto_calc := round(v_monto_calc / v_redondeo) * v_redondeo;
    END IF;
  ELSE  -- 'completo' o desconocido
    v_monto_calc := v_plan.monto;
  END IF;

  RETURN jsonb_build_object(
    'plan_cobro_id',     v_plan.id,
    'plan_nombre',       v_plan.nombre,
    'frecuencia',        v_plan.frecuencia,
    'monto_plan',        v_plan.monto,
    'modo_prorrateo',    CASE WHEN v_accion = 'proporcional' THEN 'proporcional' ELSE 'completo' END,
    'dias_mes',          v_dias_mes,
    'dias_restantes',    v_dias_restantes,
    'monto_calculado',   v_monto_calc,
    'fecha_vencimiento', v_fecha_venc,
    'regimen_aplicado',  v_regimen,
    'accion_aplicada',   v_accion,
    'regla_aplicada',    v_regla_match
  );
END;
$$;


-- ------------------------------------------------------------------------------
-- 2. inscribir_alumno_a_grupo_v1: inscribe al grupo (logística) y, si se indica
--    un plan, lo vincula (alumno_planes) y genera 1 cargo por p_monto (ya
--    calculado/editado desde el cliente). Atómico.
--    Se elimina la firma anterior (con p_monto_mensualidad / p_monto_inscripcion).
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.inscribir_alumno_a_grupo_v1(uuid, uuid, uuid, numeric, numeric, date);

CREATE OR REPLACE FUNCTION public.inscribir_alumno_a_grupo_v1(
  p_academia_id       uuid,
  p_persona_id        uuid,
  p_grupo_id          uuid,
  p_plan_cobro_id     uuid    DEFAULT NULL,
  p_monto             numeric DEFAULT 0,
  p_concepto          text    DEFAULT NULL,
  p_fecha_inscripcion date    DEFAULT current_date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_actor_id   uuid;
  v_pg_id      uuid;
  v_cargo_id   uuid;
  v_fecha_venc date;
  v_plan       record;
  v_concepto   text;
BEGIN
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  IF p_monto < 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;

  v_actor_id   := sipra_auth.get_my_user_id();
  v_fecha_venc := (date_trunc('month', p_fecha_inscripcion) + interval '1 month - 1 day')::date;

  -- 1) persona_grupo (upsert: reactivar si ya existía)
  INSERT INTO persona_grupo (academia_id, persona_id, grupo_id, estado, fecha_inscripcion, created_by)
  VALUES (p_academia_id, p_persona_id, p_grupo_id, 'activo', p_fecha_inscripcion, v_actor_id)
  ON CONFLICT (persona_id, grupo_id)
  DO UPDATE SET estado = 'activo', fecha_inscripcion = p_fecha_inscripcion, updated_at = now()
  RETURNING id INTO v_pg_id;

  -- 2) Plan de cobro (opcional)
  IF p_plan_cobro_id IS NOT NULL THEN
    SELECT id, academia_id, nombre, frecuencia INTO v_plan
    FROM planes_cobro WHERE id = p_plan_cobro_id;

    IF NOT FOUND OR v_plan.academia_id <> p_academia_id THEN
      RAISE EXCEPTION 'PLAN_NO_ENCONTRADO' USING ERRCODE = 'P0002';
    END IF;

    -- Vincular plan al alumno (idempotente)
    INSERT INTO alumno_planes (academia_id, alumno_id, plan_cobro_id)
    VALUES (p_academia_id, p_persona_id, p_plan_cobro_id)
    ON CONFLICT (alumno_id, plan_cobro_id) DO NOTHING;

    v_concepto := COALESCE(NULLIF(trim(p_concepto), ''), v_plan.nombre);
  ELSE
    v_concepto := COALESCE(NULLIF(trim(p_concepto), ''), 'Cargo inicial');
  END IF;

  -- 3) Cargo inicial (si hay monto > 0)
  IF p_monto > 0 THEN
    INSERT INTO cargo (
      academia_id, persona_id, concepto, monto_original, saldo_pendiente,
      estado_financiero, fecha_vencimiento, origen, metadata
    ) VALUES (
      p_academia_id, p_persona_id, v_concepto, p_monto, p_monto,
      'pendiente', v_fecha_venc, 'inscripcion',
      jsonb_build_object('grupo_id', p_grupo_id, 'plan_id', p_plan_cobro_id, 'inscripcion_inicial', true)
    ) RETURNING id INTO v_cargo_id;

    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, p_persona_id, 'financiero', 'cargo_generado',
      'Cargo inicial: ' || v_concepto,
      'Se generó cargo por $' || p_monto::text || ' al inscribir al grupo',
      v_actor_id,
      jsonb_build_object('monto', p_monto, 'grupo_id', p_grupo_id, 'plan_id', p_plan_cobro_id, 'cargo_id', v_cargo_id)
    );
  END IF;

  RETURN jsonb_build_object(
    'success',          true,
    'persona_grupo_id', v_pg_id,
    'cargo_id',         v_cargo_id
  );
END;
$$;


-- ------------------------------------------------------------------------------
-- 3. generar_mensualidades_mes_v1: genera el cargo mensual de cada plan
--    mensual activo por alumno. Idempotente por (persona, plan, año, mes).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generar_mensualidades_mes_v1(
  p_academia_id uuid,
  p_anio        int DEFAULT NULL,
  p_mes         int DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_row             record;
  v_anio            int;
  v_mes             int;
  v_fecha_inicio    date;
  v_fecha_venc      date;
  v_mes_nombre      text;
  v_concepto        text;
  v_cargos_creados  int := 0;
  v_omitidos        int := 0;
BEGIN
  v_anio         := COALESCE(p_anio, EXTRACT(year FROM current_date)::int);
  v_mes          := COALESCE(p_mes,  EXTRACT(month FROM current_date)::int);
  v_fecha_inicio := make_date(v_anio, v_mes, 1);
  v_fecha_venc   := (v_fecha_inicio + interval '1 month - 1 day')::date;
  v_mes_nombre   := to_char(v_fecha_inicio, 'TMMonth YYYY');

  FOR v_row IN
    SELECT ap.alumno_id AS persona_id, pc.id AS plan_id, pc.nombre AS plan_nombre, pc.monto
    FROM alumno_planes ap
    JOIN planes_cobro pc ON pc.id = ap.plan_cobro_id
    JOIN persona p       ON p.id = ap.alumno_id
    WHERE ap.academia_id = p_academia_id
      AND pc.frecuencia = 'mensual'
      AND pc.monto > 0
      AND p.estado_registro = 'activo'
      AND p.etiqueta = 'alumno'
  LOOP
    -- Idempotencia: omitir si ya existe el cargo de este plan para el mes.
    IF EXISTS (
      SELECT 1 FROM cargo c
      WHERE c.academia_id = p_academia_id
        AND c.persona_id = v_row.persona_id
        AND c.estado_financiero <> 'anulado'
        AND c.metadata->>'plan_id' = v_row.plan_id::text
        AND (c.metadata->>'anio')::int = v_anio
        AND (c.metadata->>'mes')::int  = v_mes
    ) THEN
      v_omitidos := v_omitidos + 1;
      CONTINUE;
    END IF;

    -- El concepto mantiene la palabra "Mensualidad" (la clasificación de
    -- alumnos críticos la detecta por keyword).
    v_concepto := 'Mensualidad ' || v_mes_nombre;

    INSERT INTO cargo (
      academia_id, persona_id, concepto, monto_original, saldo_pendiente,
      estado_financiero, fecha_vencimiento, origen, metadata
    ) VALUES (
      p_academia_id, v_row.persona_id, v_concepto,
      v_row.monto, v_row.monto,
      'pendiente', v_fecha_venc, 'cron_mensual',
      jsonb_build_object('plan_id', v_row.plan_id, 'plan_nombre', v_row.plan_nombre, 'anio', v_anio, 'mes', v_mes)
    );

    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_nombre, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, v_row.persona_id, 'financiero', 'cargo_generado',
      v_concepto,
      'Mensualidad generada automáticamente (' || v_row.plan_nombre || ') por $' || v_row.monto::text,
      'Sistema (cron)',
      jsonb_build_object('monto', v_row.monto, 'plan_id', v_row.plan_id)
    );

    v_cargos_creados := v_cargos_creados + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success',            true,
    'cargos_creados',     v_cargos_creados,
    'omitidos_duplicado', v_omitidos,
    'mes',                v_mes,
    'anio',               v_anio
  );
END;
$$;
