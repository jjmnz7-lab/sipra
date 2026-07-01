-- ==============================================================================
-- Fix: generar_cargos_recurrentes_v1 generaba el concepto de la mensualidad con
-- to_char(..., 'TMMonth') que depende del locale lc_time de la sesión de Postgres.
-- En local (America/Mazatlan con locale es_*) esto renderiza en español, pero en
-- Supabase cloud (ref gbimkrnsmeqsitbaxnrk) el locale por defecto es inglés, así
-- que se generaron cargos con "Mensualidad July 2026" en vez de "Mensualidad
-- Julio 2026" (confirmado en la tabla cargo el 2026-07-01).
--
-- Se reemplaza to_char(..., 'TMMonth') por un arreglo literal de meses en
-- español, que no depende de ningún locale del servidor.
-- (Reemplaza la versión de 20260630000000; mismo cuerpo, solo cambia v_concepto
-- para el caso 'mensual'.)
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
  -- Nombres de mes en español, independientes del locale del servidor.
  v_meses_es       text[] := ARRAY[
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
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
      v_concepto   := 'Mensualidad ' || v_meses_es[EXTRACT(month FROM p_fecha)::int] || ' ' || to_char(p_fecha, 'YYYY');
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
