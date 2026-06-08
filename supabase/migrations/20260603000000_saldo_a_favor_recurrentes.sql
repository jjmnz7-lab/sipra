-- ==============================================================================
-- Migración: saldo_a_favor_recurrentes
-- Timestamp: 20260603000000
-- Descripción: Habilita el "saldo a favor" (anticipo) consumiéndolo
--   AUTOMÁTICAMENTE al generar cuotas recurrentes (mensual/semanal).
--
--   • El crédito vive en movimiento.monto_disponible (lo deja registrar_pago_atomico_v1
--     cuando se cobra de más o sin deuda).
--   • Aquí, cada cuota recurrente recién creada consume el saldo a favor del alumno
--     en orden FIFO (movimiento más antiguo primero), creando aplicacion_movimiento y
--     bajando cargo.saldo_pendiente (el trigger ajusta persona.saldo_acumulado).
--   • SOLO las cuotas recurrentes consumen crédito. Cargos manuales, masivos, visitas
--     y talleres NO tocan el saldo a favor.
--
--   Reemplaza generar_cargos_recurrentes_v1 (definida en 20260528030000).
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
  -- Aplicación de saldo a favor
  v_cargo_id       uuid;
  v_mov            record;
  v_saldo_cargo    numeric;
  v_aplicar        numeric;
  v_credito_usado  numeric;
  v_nuevo_estado   text;
BEGIN
  v_dow := EXTRACT(isodow FROM p_fecha)::int;  -- 1 = lunes ... 7 = domingo

  FOR v_row IN
    SELECT ap.alumno_id AS persona_id, pc.id AS plan_id, pc.nombre AS plan_nombre,
           pc.monto, pc.frecuencia
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

    -- El INSERT dispara trg_cargo_sync_saldo → suma al saldo_acumulado.
    INSERT INTO cargo (
      academia_id, persona_id, concepto, monto_original, saldo_pendiente,
      estado_financiero, fecha_vencimiento, origen, metadata
    ) VALUES (
      p_academia_id, v_row.persona_id, v_concepto, v_row.monto, v_row.monto,
      'pendiente', v_fecha_venc, 'recurrente',
      jsonb_build_object(
        'plan_id', v_row.plan_id, 'plan_nombre', v_row.plan_nombre,
        'periodo', v_periodo, 'frecuencia', v_row.frecuencia
      )
    ) RETURNING id INTO v_cargo_id;

    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_nombre, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, v_row.persona_id, 'financiero', 'cargo_generado',
      v_concepto,
      'Cargo recurrente generado automáticamente (' || v_row.plan_nombre || ') por $' || v_row.monto::text,
      'Sistema (cron)',
      jsonb_build_object('monto', v_row.monto, 'plan_id', v_row.plan_id, 'periodo', v_periodo)
    );

    v_cargos_creados := v_cargos_creados + 1;

    -- ----------------------------------------------------------------------------
    -- Consumo automático del SALDO A FAVOR (FIFO) sobre la cuota recurrente recién
    -- creada. Solo aplica a cuotas recurrentes (este es justamente ese motor).
    -- ----------------------------------------------------------------------------
    v_saldo_cargo   := v_row.monto;
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
        WHEN v_saldo_cargo <= 0            THEN 'liquidado'
        WHEN v_saldo_cargo < v_row.monto   THEN 'parcial'
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
