-- ==============================================================================
-- Migración: descuentos_especiales
-- Descripción: Descuentos por alumno aplicados a las mensualidades (motor
--   recurrente) y, opcionalmente, a cargos individuales / grupales / masivos.
--
--   1) persona gana 4 campos (additive, con DEFAULT → no toca filas existentes):
--        descuento_hermanos_activo  boolean   default false
--        descuento_hermanos_monto   integer   default 0     -- entero, sin decimales
--        beca_activa                boolean   default false
--        beca_porcentaje            smallint  default 0      -- 0/25/50/100
--      + CHECKs: porcentaje válido, monto >= 0 y EXCLUSIÓN MUTUA
--        (no se permiten Hermanos y Beca activos a la vez).
--
--   2) generar_cargos_recurrentes_v1: antes de crear la MENSUALIDAD aplica el
--      descuento del alumno y genera el cargo por el NETO (precio − descuento).
--      Inserta una línea informativa "Descuento Hermanos" / "Beca X%" en el
--      historial. Si el neto queda en 0 (beca 100% o descuento ≥ precio) NO se
--      crea cargo (alumno exento ese periodo) y solo se registra la línea.
--
--   3) crear_cargo_grupal_v1 / crear_cargo_manual_v2: nuevo parámetro opt-in
--      (p_aplicar_becas / p_aplicar_beca, default false). Cuando viene en true,
--      cada alumno becado (25/50/100%) recibe su cargo por el NETO + línea de
--      descuento. El descuento "Hermanos" NO aplica a estos flujos (solo beca),
--      acorde a la definición funcional.
--
--   El descuento se modela SIEMPRE como "cargo neto + línea informativa" porque
--   el ledger no admite cargos negativos (CHECK monto_original > 0).
--
-- DOWN (referencia):
--   ALTER TABLE public.persona
--     DROP CONSTRAINT IF EXISTS chk_persona_descuento_exclusivo,
--     DROP CONSTRAINT IF EXISTS chk_persona_beca_porcentaje,
--     DROP CONSTRAINT IF EXISTS chk_persona_hermanos_monto,
--     DROP COLUMN IF EXISTS descuento_hermanos_activo,
--     DROP COLUMN IF EXISTS descuento_hermanos_monto,
--     DROP COLUMN IF EXISTS beca_activa,
--     DROP COLUMN IF EXISTS beca_porcentaje;
--   -- Restaurar las RPCs desde 20260619000000 (recurrentes), 20260618000000
--   -- (grupal) y 20260609000000 (manual_v2).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Columnas en persona (additive + DEFAULT → cero downtime, no toca datos).
-- ------------------------------------------------------------------------------
ALTER TABLE public.persona
  ADD COLUMN IF NOT EXISTS descuento_hermanos_activo boolean  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS descuento_hermanos_monto  integer  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS beca_activa               boolean  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS beca_porcentaje           smallint NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_persona_beca_porcentaje') THEN
    ALTER TABLE public.persona ADD CONSTRAINT chk_persona_beca_porcentaje
      CHECK (beca_porcentaje IN (0, 25, 50, 100));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_persona_hermanos_monto') THEN
    ALTER TABLE public.persona ADD CONSTRAINT chk_persona_hermanos_monto
      CHECK (descuento_hermanos_monto >= 0);
  END IF;
  -- Exclusión mutua: un alumno no puede tener Hermanos y Beca activos a la vez.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_persona_descuento_exclusivo') THEN
    ALTER TABLE public.persona ADD CONSTRAINT chk_persona_descuento_exclusivo
      CHECK (NOT (descuento_hermanos_activo AND beca_activa));
  END IF;
END $$;

-- ==============================================================================
-- 2. generar_cargos_recurrentes_v1 — mensualidad NETA + línea de descuento.
--    (Reemplaza la versión de 20260619000000; mismo cuerpo + descuentos.)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.generar_cargos_recurrentes_v1(
  p_academia_id uuid,
  p_fecha       date DEFAULT current_date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_row            record;
  v_dow            int;
  v_periodo        text;
  v_concepto       text;
  v_fecha_venc     date;
  v_due            boolean;
  v_cargos_creados int := 0;
  v_omitidos       int := 0;
  v_credito_total  numeric := 0;
  -- Meses excluidos de cobro mensual (config_cobro->'meses_sin_cobro')
  v_meses_sin_cobro jsonb;
  v_mes_actual      int;
  -- Descuentos especiales por alumno
  v_desc_monto     numeric := 0;
  v_desc_tipo      text;
  v_desc_label     text;
  v_neto           numeric;
  -- Aplicación de saldo a favor
  v_cargo_id       uuid;
  v_mov            record;
  v_saldo_cargo    numeric;
  v_aplicar        numeric;
  v_credito_usado  numeric;
  v_nuevo_estado   text;
BEGIN
  v_dow := EXTRACT(isodow FROM p_fecha)::int;  -- 1 = lunes ... 7 = domingo
  v_mes_actual := EXTRACT(month FROM p_fecha)::int;

  SELECT COALESCE(config_cobro->'meses_sin_cobro', '[]'::jsonb)
    INTO v_meses_sin_cobro
  FROM academia WHERE id = p_academia_id;

  FOR v_row IN
    SELECT ap.alumno_id AS persona_id, pc.id AS plan_id, pc.nombre AS plan_nombre,
           pc.monto, pc.frecuencia,
           p.descuento_hermanos_activo, p.descuento_hermanos_monto,
           p.beca_activa, p.beca_porcentaje
    FROM alumno_planes ap
    JOIN planes_cobro pc ON pc.id = ap.plan_cobro_id
    JOIN persona p       ON p.id = ap.alumno_id
    WHERE ap.academia_id = p_academia_id
      AND pc.frecuencia IN ('mensual', 'semanal')   -- 'por_visita'/'pago_unico' se ignoran
      AND pc.monto > 0
      AND p.estado_registro = 'activo'              -- suspendidos no reciben cargos recurrentes
      AND p.etiqueta = 'alumno'
  LOOP
    IF v_row.frecuencia = 'mensual' THEN
      v_due        := (EXTRACT(day FROM p_fecha)::int = 1);   -- corte: día 1
      v_periodo    := 'M' || to_char(p_fecha, 'YYYY-MM');
      v_concepto   := 'Mensualidad ' || to_char(date_trunc('month', p_fecha), 'TMMonth YYYY');
      v_fecha_venc := (date_trunc('month', p_fecha) + interval '1 month - 1 day')::date;
    ELSE  -- semanal
      v_due        := (v_dow = 1);                            -- corte: lunes
      v_periodo    := 'W' || to_char(p_fecha, 'IYYY-IW');
      v_concepto   := 'Cuota semanal ' || to_char(p_fecha, 'DD/MM/YYYY');
      v_fecha_venc := p_fecha + 6;                            -- fin de la semana
    END IF;

    IF NOT v_due THEN
      CONTINUE;
    END IF;

    -- Meses de cobro: los planes mensuales no generan cargos en meses marcados.
    IF v_row.frecuencia = 'mensual'
       AND v_meses_sin_cobro @> to_jsonb(v_mes_actual) THEN
      v_omitidos := v_omitidos + 1;
      CONTINUE;
    END IF;

    -- Idempotencia por (persona, plan, periodo)
    IF EXISTS (
      SELECT 1 FROM cargo c
      WHERE c.academia_id = p_academia_id
        AND c.persona_id = v_row.persona_id
        AND c.estado_financiero <> 'anulado'
        AND c.metadata->>'plan_id' = v_row.plan_id::text
        AND c.metadata->>'periodo' = v_periodo
    ) THEN
      v_omitidos := v_omitidos + 1;
      CONTINUE;
    END IF;

    -- ── Descuento especial del alumno (solo MENSUALIDAD). Exclusión mutua
    --    garantizada por CHECK: a lo sumo uno de los dos está activo. ──────────
    v_desc_monto := 0; v_desc_tipo := NULL; v_desc_label := NULL;
    IF v_row.frecuencia = 'mensual' THEN
      IF COALESCE(v_row.beca_activa, false) AND COALESCE(v_row.beca_porcentaje, 0) > 0 THEN
        v_desc_monto := round(v_row.monto * v_row.beca_porcentaje / 100.0);
        v_desc_tipo  := 'beca';
        v_desc_label := 'Beca ' || v_row.beca_porcentaje || '%';
      ELSIF COALESCE(v_row.descuento_hermanos_activo, false) AND COALESCE(v_row.descuento_hermanos_monto, 0) > 0 THEN
        v_desc_monto := LEAST(v_row.monto, v_row.descuento_hermanos_monto::numeric);
        v_desc_tipo  := 'hermanos';
        v_desc_label := 'Descuento Hermanos';
      END IF;
    END IF;
    v_neto := v_row.monto - v_desc_monto;

    -- Exento total: no se crea cargo (el ledger no admite cargo en 0). Se deja
    -- solo la línea informativa, con guardia anti-duplicado por periodo.
    IF v_neto <= 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM evento_timeline e
        WHERE e.academia_id = p_academia_id
          AND e.persona_id = v_row.persona_id
          AND e.tipo = 'DESCUENTO'
          AND e.metadata->>'periodo' = v_periodo
      ) THEN
        INSERT INTO evento_timeline (
          id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_nombre, metadata
        ) VALUES (
          gen_random_uuid(), p_academia_id, v_row.persona_id, 'FINANZAS', 'DESCUENTO',
          v_desc_label,
          v_concepto || ' · exento (−$' || v_desc_monto::int || ')',
          'Sistema (cron)',
          jsonb_build_object(
            'descuento_tipo', v_desc_tipo, 'descuento_monto', v_desc_monto,
            'monto_bruto', v_row.monto, 'periodo', v_periodo, 'exento', true
          )
        );
      END IF;
      v_omitidos := v_omitidos + 1;
      CONTINUE;
    END IF;

    -- El INSERT dispara trg_cargo_sync_saldo → suma al saldo_acumulado.
    INSERT INTO cargo (
      academia_id, persona_id, concepto, monto_original, saldo_pendiente,
      estado_financiero, fecha_vencimiento, origen, metadata
    ) VALUES (
      p_academia_id, v_row.persona_id, v_concepto, v_neto, v_neto,
      'pendiente', v_fecha_venc, 'recurrente',
      jsonb_build_object(
        'plan_id', v_row.plan_id, 'plan_nombre', v_row.plan_nombre,
        'periodo', v_periodo, 'frecuencia', v_row.frecuencia
      ) || (CASE WHEN v_desc_monto > 0 THEN jsonb_build_object(
        'monto_bruto', v_row.monto, 'descuento_tipo', v_desc_tipo, 'descuento_monto', v_desc_monto
      ) ELSE '{}'::jsonb END)
    ) RETURNING id INTO v_cargo_id;

    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_nombre, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, v_row.persona_id, 'financiero', 'cargo_generado',
      v_concepto,
      'Cargo recurrente generado automáticamente (' || v_row.plan_nombre || ') por $' || v_neto::text,
      'Sistema (cron)',
      jsonb_build_object('monto', v_neto, 'plan_id', v_row.plan_id, 'periodo', v_periodo)
    );

    -- Línea informativa del descuento aplicado (no afecta saldo: el cargo ya es neto).
    IF v_desc_monto > 0 THEN
      INSERT INTO evento_timeline (
        id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_nombre, metadata
      ) VALUES (
        gen_random_uuid(), p_academia_id, v_row.persona_id, 'FINANZAS', 'DESCUENTO',
        v_desc_label,
        v_concepto || ': $' || v_row.monto::int || ' → $' || v_neto::int || ' (−$' || v_desc_monto::int || ')',
        'Sistema (cron)',
        jsonb_build_object(
          'descuento_tipo', v_desc_tipo, 'descuento_monto', v_desc_monto,
          'monto_bruto', v_row.monto, 'periodo', v_periodo, 'cargo_id', v_cargo_id
        )
      );
    END IF;

    v_cargos_creados := v_cargos_creados + 1;

    -- ----------------------------------------------------------------------------
    -- Consumo automático del SALDO A FAVOR (FIFO) sobre la cuota recurrente recién
    -- creada (sobre el NETO).
    -- ----------------------------------------------------------------------------
    v_saldo_cargo   := v_neto;
    v_credito_usado := 0;

    FOR v_mov IN
      SELECT id, monto_disponible
      FROM movimiento
      WHERE academia_id = p_academia_id
        AND persona_id = v_row.persona_id
        AND monto_disponible > 0
      ORDER BY created_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_saldo_cargo <= 0;

      v_aplicar := LEAST(v_mov.monto_disponible, v_saldo_cargo);

      INSERT INTO aplicacion_movimiento (academia_id, movimiento_id, cargo_id, monto_aplicado)
      VALUES (p_academia_id, v_mov.id, v_cargo_id, v_aplicar);

      UPDATE movimiento
      SET monto_disponible = monto_disponible - v_aplicar
      WHERE id = v_mov.id;

      v_saldo_cargo   := v_saldo_cargo - v_aplicar;
      v_credito_usado := v_credito_usado + v_aplicar;
    END LOOP;

    IF v_credito_usado > 0 THEN
      v_nuevo_estado := CASE
        WHEN v_saldo_cargo <= 0      THEN 'liquidado'
        WHEN v_saldo_cargo < v_neto  THEN 'parcial'
        ELSE 'pendiente'
      END;

      -- Baja el saldo del cargo (trigger ajusta saldo_acumulado).
      UPDATE cargo
      SET saldo_pendiente   = v_saldo_cargo,
          estado_financiero = v_nuevo_estado,
          updated_at        = now()
      WHERE id = v_cargo_id;

      INSERT INTO evento_timeline (
        id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_nombre, metadata
      ) VALUES (
        gen_random_uuid(), p_academia_id, v_row.persona_id, 'financiero', 'abono_registrado',
        'Saldo a favor aplicado',
        'Se aplicaron $' || v_credito_usado::text || ' de saldo a favor a ' || v_concepto,
        'Sistema (cron)',
        jsonb_build_object('monto', v_credito_usado, 'cargo_id', v_cargo_id, 'tipo', 'saldo_a_favor')
      );

      v_credito_total := v_credito_total + v_credito_usado;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success',            true,
    'cargos_creados',     v_cargos_creados,
    'omitidos_duplicado', v_omitidos,
    'saldo_favor_aplicado', v_credito_total,
    'fecha',              p_fecha
  );
END;
$$;

-- ==============================================================================
-- 3. crear_cargo_grupal_v1 — opt-in de becas (p_aplicar_becas).
--    (Reemplaza la versión de 20260618000000; mismo cuerpo + becas.)
-- ==============================================================================
DROP FUNCTION IF EXISTS public.crear_cargo_grupal_v1(uuid, uuid, text, numeric, uuid[], text, text, text);

CREATE OR REPLACE FUNCTION public.crear_cargo_grupal_v1(
  p_academia_id    uuid,
  p_grupo_id       uuid,
  p_concepto       text,
  p_monto          numeric,
  p_excluded_persona_ids uuid[],
  p_idempotency_key text,
  p_origen         text DEFAULT 'grupal',
  p_lote_id        text DEFAULT NULL,
  p_aplicar_becas  boolean DEFAULT false
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
  -- Descuento por beca (opt-in)
  v_desc_monto     numeric;
  v_neto           numeric;
  v_pct            int;
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
    SELECT pg.persona_id, p.beca_activa, p.beca_porcentaje
    FROM persona_grupo pg
    JOIN persona p ON p.id = pg.persona_id
    WHERE pg.academia_id = p_academia_id
      AND pg.grupo_id = p_grupo_id
      AND pg.estado = 'activo'
      AND p.estado_registro = 'activo'
      AND NOT (pg.persona_id = ANY(p_excluded_persona_ids))
    ORDER BY pg.persona_id ASC
  LOOP
    -- Descuento por beca (solo si el opt-in está encendido).
    v_desc_monto := 0; v_neto := p_monto; v_pct := 0;
    IF p_aplicar_becas AND COALESCE(v_persona.beca_activa, false) AND COALESCE(v_persona.beca_porcentaje, 0) > 0 THEN
      v_pct        := v_persona.beca_porcentaje;
      v_desc_monto := round(p_monto * v_pct / 100.0);
      v_neto       := p_monto - v_desc_monto;
    END IF;

    -- Beca 100%: exento de este cargo (sin cargo en 0). Solo línea informativa.
    IF v_neto <= 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM evento_timeline e
        WHERE e.academia_id = p_academia_id
          AND e.persona_id = v_persona.persona_id
          AND e.tipo = 'DESCUENTO'
          AND e.metadata->>'idempotency_key' = p_idempotency_key
      ) THEN
        INSERT INTO evento_timeline (
          id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
        ) VALUES (
          gen_random_uuid(), p_academia_id, v_persona.persona_id, 'FINANZAS', 'DESCUENTO',
          'Beca ' || v_pct || '%',
          p_concepto || ' · exento (−$' || v_desc_monto::int || ')',
          v_actor_id,
          jsonb_build_object(
            'descuento_tipo', 'beca', 'descuento_monto', v_desc_monto,
            'monto_bruto', p_monto, 'beca_porcentaje', v_pct,
            'grupo_id', p_grupo_id, 'idempotency_key', p_idempotency_key, 'exento', true
          )
        );
      END IF;
      CONTINUE;
    END IF;

    INSERT INTO cargo (
      academia_id, persona_id, concepto, monto_original, saldo_pendiente,
      estado_financiero, fecha_vencimiento, origen, metadata
    ) VALUES (
      p_academia_id, v_persona.persona_id, p_concepto, v_neto, v_neto,
      'pendiente', NULL, p_origen,
      jsonb_strip_nulls(jsonb_build_object(
        'generado_grupal', true,
        'grupo_id', p_grupo_id,
        'idempotency_key', p_idempotency_key,
        'lote_id', p_lote_id
      )) || (CASE WHEN v_desc_monto > 0 THEN jsonb_build_object(
        'monto_bruto', p_monto, 'descuento_tipo', 'beca', 'descuento_monto', v_desc_monto,
        'beca_porcentaje', v_pct
      ) ELSE '{}'::jsonb END)
    ) RETURNING id INTO v_cargo_id;

    -- TIMELINE → CARGO_MASIVO (monto neto)
    v_tl_id := gen_random_uuid();
    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_id, metadata
    ) VALUES (
      v_tl_id, p_academia_id, v_persona.persona_id, 'FINANZAS', 'CARGO_MASIVO',
      'Cargo grupal',
      p_concepto || COALESCE(' · ' || v_grupo_nombre, ''),
      v_neto,
      v_actor_id,
      jsonb_build_object('monto', v_neto, 'grupo_id', p_grupo_id, 'cargo_id', v_cargo_id)
    );

    -- Línea informativa del descuento (no afecta saldo: el cargo ya es neto).
    IF v_desc_monto > 0 THEN
      INSERT INTO evento_timeline (
        id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
      ) VALUES (
        gen_random_uuid(), p_academia_id, v_persona.persona_id, 'FINANZAS', 'DESCUENTO',
        'Beca ' || v_pct || '%',
        p_concepto || ': $' || p_monto::int || ' → $' || v_neto::int || ' (−$' || v_desc_monto::int || ')',
        v_actor_id,
        jsonb_build_object(
          'descuento_tipo', 'beca', 'descuento_monto', v_desc_monto,
          'monto_bruto', p_monto, 'beca_porcentaje', v_pct,
          'grupo_id', p_grupo_id, 'idempotency_key', p_idempotency_key, 'cargo_id', v_cargo_id
        )
      );
    END IF;

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

-- ==============================================================================
-- 4. crear_cargo_manual_v2 — opt-in de beca (p_aplicar_beca).
--    (Reemplaza la versión de 20260609000000; mismo cuerpo + beca.)
-- ==============================================================================
DROP FUNCTION IF EXISTS public.crear_cargo_manual_v2(uuid, uuid, numeric, text, text, date, text);

CREATE OR REPLACE FUNCTION public.crear_cargo_manual_v2(
  p_academia_id        uuid,
  p_alumno_id          uuid,
  p_monto              numeric,
  p_concepto           text,
  p_nota_modificacion  text DEFAULT NULL,
  p_fecha_vencimiento  date DEFAULT NULL,
  p_origen             text DEFAULT 'manual',
  p_aplicar_beca       boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_actor_id     uuid;
  v_cargo_id     uuid;
  v_concepto     text;
  v_nota         text;
  v_metadata     jsonb;
  v_fecha_venc   date;
  v_es_inscripcion boolean;
  -- Descuento por beca (opt-in)
  v_beca_activa  boolean;
  v_beca_pct     int;
  v_desc_monto   numeric := 0;
  v_neto         numeric;
BEGIN
  -- 1. SEGURIDAD
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  -- 2. VALIDACIÓN
  IF p_monto <= 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;
  IF char_length(trim(COALESCE(p_concepto, ''))) = 0 THEN
    RAISE EXCEPTION 'CONCEPTO_REQUERIDO' USING ERRCODE = 'P0002';
  END IF;
  IF p_origen NOT IN ('manual','inscripcion','1er mensualidad','ajuste','grupal') THEN
    RAISE EXCEPTION 'ORIGEN_INVALIDO' USING ERRCODE = 'P0002';
  END IF;

  v_actor_id   := sipra_auth.get_my_user_id();
  v_nota       := NULLIF(trim(COALESCE(p_nota_modificacion, '')), '');
  v_fecha_venc := COALESCE(p_fecha_vencimiento, current_date);
  v_es_inscripcion := (p_origen = 'inscripcion') OR (trim(p_concepto) ILIKE 'inscripci%');

  -- Descuento por beca del alumno (solo si el opt-in está encendido).
  v_neto := p_monto;
  IF p_aplicar_beca THEN
    SELECT beca_activa, beca_porcentaje INTO v_beca_activa, v_beca_pct
    FROM persona WHERE id = p_alumno_id AND academia_id = p_academia_id;
    IF COALESCE(v_beca_activa, false) AND COALESCE(v_beca_pct, 0) > 0 THEN
      v_desc_monto := round(p_monto * v_beca_pct / 100.0);
      v_neto       := p_monto - v_desc_monto;
    END IF;
  END IF;

  -- 3. CONCATENAR NOTA AL CONCEPTO (rastro de auditoría visible en ledger)
  v_concepto := trim(p_concepto);
  IF v_nota IS NOT NULL THEN
    v_concepto := v_concepto || ' (Nota: ' || v_nota || ')';
  END IF;

  -- Beca 100%: exento (sin cargo en 0). Solo línea informativa.
  IF v_neto <= 0 THEN
    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, p_alumno_id, 'FINANZAS', 'DESCUENTO',
      'Beca ' || v_beca_pct || '%',
      v_concepto || ' · exento (−$' || v_desc_monto::int || ')',
      v_actor_id,
      jsonb_build_object(
        'descuento_tipo', 'beca', 'descuento_monto', v_desc_monto,
        'monto_bruto', p_monto, 'beca_porcentaje', v_beca_pct, 'exento', true
      )
    );
    RETURN jsonb_build_object('success', true, 'cargo_id', NULL, 'concepto', v_concepto, 'exento', true);
  END IF;

  -- 4. METADATA estructurada
  v_metadata := jsonb_build_object(
    'manual',      true,
    'cargo_unico', true
  );
  IF v_nota IS NOT NULL THEN
    v_metadata := v_metadata
      || jsonb_build_object('nota_modificacion', v_nota, 'precio_modificado', true);
  END IF;
  IF v_desc_monto > 0 THEN
    v_metadata := v_metadata
      || jsonb_build_object('monto_bruto', p_monto, 'descuento_tipo', 'beca',
                            'descuento_monto', v_desc_monto, 'beca_porcentaje', v_beca_pct);
  END IF;

  -- 5. INSERT (el trigger trg_cargo_sync_saldo actualiza persona.saldo_acumulado)
  INSERT INTO cargo (
    academia_id, persona_id, concepto, monto_original, saldo_pendiente,
    estado_financiero, fecha_vencimiento, origen, metadata, created_by
  ) VALUES (
    p_academia_id, p_alumno_id, v_concepto, v_neto, v_neto,
    'pendiente', v_fecha_venc, p_origen, v_metadata, v_actor_id
  ) RETURNING id INTO v_cargo_id;

  -- 6. TIMELINE
  INSERT INTO evento_timeline (
    id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_id, metadata
  ) VALUES (
    gen_random_uuid(), p_academia_id, p_alumno_id, 'FINANZAS',
    CASE WHEN v_es_inscripcion THEN 'INSCRIPCION' ELSE 'CARGO_UNICO' END,
    CASE WHEN v_es_inscripcion THEN 'Cargo: Inscripción' ELSE 'Cargo individual' END,
    v_concepto,
    v_neto,
    v_actor_id,
    jsonb_build_object(
      'monto', v_neto,
      'cargo_id', v_cargo_id,
      'nota_modificacion', v_nota,
      'origen', p_origen
    )
  );

  -- Línea informativa del descuento (no afecta saldo: el cargo ya es neto).
  IF v_desc_monto > 0 THEN
    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, p_alumno_id, 'FINANZAS', 'DESCUENTO',
      'Beca ' || v_beca_pct || '%',
      v_concepto || ': $' || p_monto::int || ' → $' || v_neto::int || ' (−$' || v_desc_monto::int || ')',
      v_actor_id,
      jsonb_build_object(
        'descuento_tipo', 'beca', 'descuento_monto', v_desc_monto,
        'monto_bruto', p_monto, 'beca_porcentaje', v_beca_pct, 'cargo_id', v_cargo_id
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success',  true,
    'cargo_id', v_cargo_id,
    'concepto', v_concepto
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.crear_cargo_manual_v2(uuid, uuid, numeric, text, text, date, text, boolean) TO authenticated;

-- ==============================================================================
-- 5. crear_cargo_individual_v1 — opt-in de beca (p_aplicar_beca).
--    (Reemplaza la versión de 20260610120000; mismo cuerpo + beca.)
--    Es el RPC del cargo individual desde la pantalla del alumno.
-- ==============================================================================
DROP FUNCTION IF EXISTS public.crear_cargo_individual_v1(uuid, uuid, text, numeric, text);

CREATE OR REPLACE FUNCTION public.crear_cargo_individual_v1(
  p_academia_id      uuid,
  p_persona_id       uuid,
  p_concepto         text,
  p_monto            numeric,
  p_origen           text DEFAULT 'manual',
  p_aplicar_beca     boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_actor_id       uuid;
  v_cargo_id       uuid;
  v_es_inscripcion boolean;
  v_beca_activa    boolean;
  v_beca_pct       int;
  v_desc_monto     numeric := 0;
  v_neto           numeric;
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

  -- Descuento por beca del alumno (solo si el opt-in está encendido).
  v_neto := p_monto;
  IF p_aplicar_beca THEN
    SELECT beca_activa, beca_porcentaje INTO v_beca_activa, v_beca_pct
    FROM persona WHERE id = p_persona_id AND academia_id = p_academia_id;
    IF COALESCE(v_beca_activa, false) AND COALESCE(v_beca_pct, 0) > 0 THEN
      v_desc_monto := round(p_monto * v_beca_pct / 100.0);
      v_neto       := p_monto - v_desc_monto;
    END IF;
  END IF;

  -- Beca 100%: exento (sin cargo en 0). Solo línea informativa.
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
    RETURN jsonb_build_object('success', true, 'cargo_id', NULL, 'exento', true);
  END IF;

  -- Cargo one-off: sin vencimiento (NULL). Solo los recurrentes lo usan para recargos.
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

  RETURN jsonb_build_object('success', true, 'cargo_id', v_cargo_id);
END;
$$;
