-- ==============================================================================
-- RPCs para flujo de inscripción con prorrateo + cron de mensualidades mensuales
-- + cargo individual genérico
-- ==============================================================================

-- 1. calcular_cargo_inscripcion_v1: devuelve preview de montos al inscribir.
--    Lee grupo.costo_mensualidad/costo_inscripcion + academia.config_cobro
--    (modo_prorrateo, cobra_inscripcion). NO escribe nada.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calcular_cargo_inscripcion_v1(
  p_grupo_id        uuid,
  p_fecha_inscripcion date DEFAULT current_date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_grupo            record;
  v_config           jsonb;
  v_modo             text;
  v_cobra_insc       boolean;
  v_dias_mes         int;
  v_dias_restantes   int;
  v_monto_mens       numeric;
  v_monto_insc       numeric;
  v_fecha_venc       date;
BEGIN
  SELECT id, academia_id, costo_mensualidad, costo_inscripcion
    INTO v_grupo
  FROM grupo
  WHERE id = p_grupo_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'GRUPO_NO_ENCONTRADO' USING ERRCODE = 'P0002';
  END IF;

  IF NOT sipra_auth.is_auth_user_for_tenant(v_grupo.academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  SELECT config_cobro INTO v_config FROM academia WHERE id = v_grupo.academia_id;

  v_modo        := COALESCE(v_config->>'modo_prorrateo', 'proporcional');
  v_cobra_insc  := COALESCE((v_config->>'cobra_inscripcion')::boolean, false);

  -- Días naturales del mes y restantes (incluyendo el día de inscripción)
  v_dias_mes       := EXTRACT(day FROM (date_trunc('month', p_fecha_inscripcion) + interval '1 month - 1 day'))::int;
  v_dias_restantes := v_dias_mes - EXTRACT(day FROM p_fecha_inscripcion)::int + 1;
  v_fecha_venc     := (date_trunc('month', p_fecha_inscripcion) + interval '1 month - 1 day')::date;

  -- Mensualidad
  IF v_grupo.costo_mensualidad IS NULL OR v_grupo.costo_mensualidad = 0 THEN
    v_monto_mens := 0;
  ELSIF v_modo = 'proporcional' THEN
    v_monto_mens := round(v_grupo.costo_mensualidad * v_dias_restantes::numeric / v_dias_mes::numeric, 2);
  ELSE
    v_monto_mens := v_grupo.costo_mensualidad;
  END IF;

  -- Inscripción
  IF v_cobra_insc AND v_grupo.costo_inscripcion IS NOT NULL AND v_grupo.costo_inscripcion > 0 THEN
    v_monto_insc := v_grupo.costo_inscripcion;
  ELSE
    v_monto_insc := 0;
  END IF;

  RETURN jsonb_build_object(
    'costo_mensualidad_grupo',     COALESCE(v_grupo.costo_mensualidad, 0),
    'costo_inscripcion_grupo',     COALESCE(v_grupo.costo_inscripcion, 0),
    'modo_prorrateo',              v_modo,
    'cobra_inscripcion',           v_cobra_insc,
    'dias_mes',                    v_dias_mes,
    'dias_restantes',              v_dias_restantes,
    'monto_mensualidad_calculado', v_monto_mens,
    'monto_inscripcion_calculado', v_monto_insc,
    'fecha_vencimiento',           v_fecha_venc
  );
END;
$$;


-- 2. inscribir_alumno_a_grupo_v1: insert persona_grupo + cargos (atómico).
--    Los montos se pasan ya calculados/editados desde el cliente para
--    permitir edición/condonación por el dueño.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inscribir_alumno_a_grupo_v1(
  p_academia_id        uuid,
  p_persona_id         uuid,
  p_grupo_id           uuid,
  p_monto_mensualidad  numeric,
  p_monto_inscripcion  numeric,
  p_fecha_inscripcion  date DEFAULT current_date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_actor_id        uuid;
  v_pg_id           uuid;
  v_cargo_mens_id   uuid;
  v_cargo_insc_id   uuid;
  v_fecha_venc      date;
  v_mes_nombre      text;
  v_concepto_mens   text;
BEGIN
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  IF p_monto_mensualidad < 0 OR p_monto_inscripcion < 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;

  v_actor_id    := sipra_auth.get_my_user_id();
  v_fecha_venc  := (date_trunc('month', p_fecha_inscripcion) + interval '1 month - 1 day')::date;
  v_mes_nombre  := to_char(p_fecha_inscripcion, 'TMMonth YYYY');
  v_concepto_mens := 'Mensualidad ' || v_mes_nombre;

  -- 1) persona_grupo (upsert)
  INSERT INTO persona_grupo (academia_id, persona_id, grupo_id, estado, fecha_inscripcion, created_by)
  VALUES (p_academia_id, p_persona_id, p_grupo_id, 'activo', p_fecha_inscripcion, v_actor_id)
  ON CONFLICT (persona_id, grupo_id)
  DO UPDATE SET estado = 'activo', fecha_inscripcion = p_fecha_inscripcion, updated_at = now()
  RETURNING id INTO v_pg_id;

  -- 2) Cargo de mensualidad (si > 0)
  IF p_monto_mensualidad > 0 THEN
    INSERT INTO cargo (
      academia_id, persona_id, concepto, monto_original, saldo_pendiente,
      estado_financiero, fecha_vencimiento, origen, metadata
    ) VALUES (
      p_academia_id, p_persona_id, v_concepto_mens, p_monto_mensualidad, p_monto_mensualidad,
      'pendiente', v_fecha_venc, 'inscripcion',
      jsonb_build_object('grupo_id', p_grupo_id, 'inscripcion_inicial', true)
    ) RETURNING id INTO v_cargo_mens_id;

    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, p_persona_id, 'financiero', 'cargo_generado',
      'Mensualidad inicial: ' || v_concepto_mens,
      'Se generó cargo por $' || p_monto_mensualidad::text || ' al inscribir al grupo',
      v_actor_id,
      jsonb_build_object('monto', p_monto_mensualidad, 'grupo_id', p_grupo_id, 'cargo_id', v_cargo_mens_id)
    );
  END IF;

  -- 3) Cargo de inscripción (si > 0)
  IF p_monto_inscripcion > 0 THEN
    INSERT INTO cargo (
      academia_id, persona_id, concepto, monto_original, saldo_pendiente,
      estado_financiero, fecha_vencimiento, origen, metadata
    ) VALUES (
      p_academia_id, p_persona_id, 'Inscripción', p_monto_inscripcion, p_monto_inscripcion,
      'pendiente', v_fecha_venc, 'inscripcion',
      jsonb_build_object('grupo_id', p_grupo_id, 'tipo_cargo', 'inscripcion')
    ) RETURNING id INTO v_cargo_insc_id;

    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, p_persona_id, 'financiero', 'cargo_generado',
      'Cargo de inscripción',
      'Se generó cargo de inscripción por $' || p_monto_inscripcion::text,
      v_actor_id,
      jsonb_build_object('monto', p_monto_inscripcion, 'grupo_id', p_grupo_id, 'cargo_id', v_cargo_insc_id)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'persona_grupo_id',     v_pg_id,
    'cargo_mensualidad_id', v_cargo_mens_id,
    'cargo_inscripcion_id', v_cargo_insc_id
  );
END;
$$;


-- 3. generar_mensualidades_mes_v1: genera cargos mensualidad para todos
--    los alumnos activos de cada grupo (con costo_mensualidad NOT NULL).
--    Idempotente: omite si ya existe un cargo con el mismo concepto.
--    Debe invocarse vía cron el día 1 de cada mes.
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
  v_anio        := COALESCE(p_anio, EXTRACT(year FROM current_date)::int);
  v_mes         := COALESCE(p_mes,  EXTRACT(month FROM current_date)::int);
  v_fecha_inicio := make_date(v_anio, v_mes, 1);
  v_fecha_venc   := (v_fecha_inicio + interval '1 month - 1 day')::date;
  v_mes_nombre   := to_char(v_fecha_inicio, 'TMMonth YYYY');
  v_concepto     := 'Mensualidad ' || v_mes_nombre;

  FOR v_row IN
    SELECT g.id AS grupo_id, g.costo_mensualidad, pg.persona_id
    FROM grupo g
    JOIN persona_grupo pg ON pg.grupo_id = g.id
    JOIN persona p ON p.id = pg.persona_id
    WHERE g.academia_id = p_academia_id
      AND g.estado = 'activo'
      AND g.costo_mensualidad IS NOT NULL
      AND g.costo_mensualidad > 0
      AND pg.estado = 'activo'
      AND p.estado_registro = 'activo'
      AND p.etiqueta = 'alumno'
  LOOP
    IF EXISTS (
      SELECT 1 FROM cargo c
      WHERE c.academia_id = p_academia_id
        AND c.persona_id = v_row.persona_id
        AND lower(trim(c.concepto)) = lower(trim(v_concepto))
        AND c.estado_financiero != 'anulado'
    ) THEN
      v_omitidos := v_omitidos + 1;
      CONTINUE;
    END IF;

    INSERT INTO cargo (
      academia_id, persona_id, concepto, monto_original, saldo_pendiente,
      estado_financiero, fecha_vencimiento, origen, metadata
    ) VALUES (
      p_academia_id, v_row.persona_id, v_concepto,
      v_row.costo_mensualidad, v_row.costo_mensualidad,
      'pendiente', v_fecha_venc, 'cron_mensual',
      jsonb_build_object('grupo_id', v_row.grupo_id, 'anio', v_anio, 'mes', v_mes)
    );

    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_nombre, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, v_row.persona_id, 'financiero', 'cargo_generado',
      v_concepto,
      'Mensualidad generada automáticamente por $' || v_row.costo_mensualidad::text,
      'Sistema (cron)',
      jsonb_build_object('monto', v_row.costo_mensualidad, 'grupo_id', v_row.grupo_id)
    );

    v_cargos_creados := v_cargos_creados + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success',           true,
    'cargos_creados',    v_cargos_creados,
    'omitidos_duplicado', v_omitidos,
    'mes',               v_mes,
    'anio',              v_anio
  );
END;
$$;


-- 4. crear_cargo_individual_v1: cargo manual genérico para vista de seguimiento.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_cargo_individual_v1(
  p_academia_id      uuid,
  p_persona_id       uuid,
  p_concepto         text,
  p_monto            numeric,
  p_fecha_vencimiento date,
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

  INSERT INTO cargo (
    academia_id, persona_id, concepto, monto_original, saldo_pendiente,
    estado_financiero, fecha_vencimiento, origen, metadata
  ) VALUES (
    p_academia_id, p_persona_id, p_concepto, p_monto, p_monto,
    'pendiente', p_fecha_vencimiento, p_origen,
    jsonb_build_object('manual', true)
  ) RETURNING id INTO v_cargo_id;

  INSERT INTO evento_timeline (
    id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
  ) VALUES (
    gen_random_uuid(), p_academia_id, p_persona_id, 'financiero', 'cargo_generado',
    'Cargo: ' || p_concepto,
    'Cargo individual por $' || p_monto::text,
    v_actor_id,
    jsonb_build_object('monto', p_monto, 'cargo_id', v_cargo_id)
  );

  RETURN jsonb_build_object('success', true, 'cargo_id', v_cargo_id);
END;
$$;
