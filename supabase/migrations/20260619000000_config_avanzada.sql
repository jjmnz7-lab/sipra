-- ==============================================================================
-- Migración: config_avanzada
-- Timestamp: 20260619000000
-- Descripción: Soporte de backend para el rediseño de la pantalla Configuración.
--   1) academia.allow_overpayment  → política de "saldo a favor" (pagos > saldo).
--   2) Tabla cobros_frecuentes      → catálogo de cargos predefinidos (concepto+monto)
--      con soft-delete (activo) para conservar historiales.
--   3) registrar_pago_atomico_v1    → respeta allow_overpayment (rechaza sobrepagos
--      cuando la academia no permite generar saldo a favor).
--   4) generar_cargos_recurrentes_v1 → respeta config_cobro->'meses_sin_cobro':
--      los planes MENSUALES no generan cargos en los meses marcados.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. academia.allow_overpayment
-- ------------------------------------------------------------------------------
ALTER TABLE public.academia
  ADD COLUMN IF NOT EXISTS allow_overpayment BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.academia.allow_overpayment IS
  'Política de saldo a favor. Si false, no se permite registrar pagos mayores al saldo pendiente (ni anticipos puros).';

-- ------------------------------------------------------------------------------
-- 1.b multi_plan_enabled — se elimina el toggle "Modo multi-plan" de Configuración.
--     Para que los selectores de plan de las demás pantallas sigan funcionando,
--     el modo multi-plan queda forzado a true (default y academias existentes).
-- ------------------------------------------------------------------------------
ALTER TABLE public.academia ALTER COLUMN multi_plan_enabled SET DEFAULT true;
UPDATE public.academia SET multi_plan_enabled = true WHERE multi_plan_enabled IS DISTINCT FROM true;

-- ------------------------------------------------------------------------------
-- 2. Tabla cobros_frecuentes (catálogo de cargos predefinidos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cobros_frecuentes (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id  UUID          NOT NULL REFERENCES public.academia(id),
  concepto     VARCHAR(120)  NOT NULL,
  monto        NUMERIC(12,2) NOT NULL,
  activo       BOOLEAN       NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT chk_cf_concepto CHECK (char_length(trim(concepto)) > 0),
  CONSTRAINT chk_cf_monto     CHECK (monto >= 0)
);

CREATE INDEX IF NOT EXISTS idx_cobros_frecuentes_academia
  ON public.cobros_frecuentes (academia_id);

ALTER TABLE public.cobros_frecuentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cobros_frecuentes_select_policy ON public.cobros_frecuentes;
CREATE POLICY cobros_frecuentes_select_policy ON public.cobros_frecuentes
FOR SELECT TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id));

DROP POLICY IF EXISTS cobros_frecuentes_insert_policy ON public.cobros_frecuentes;
CREATE POLICY cobros_frecuentes_insert_policy ON public.cobros_frecuentes
FOR INSERT TO authenticated
WITH CHECK (
  sipra_auth.is_admin_of_tenant(academia_id)
  AND sipra_auth.can_write_to_academia(academia_id)
);

DROP POLICY IF EXISTS cobros_frecuentes_update_policy ON public.cobros_frecuentes;
CREATE POLICY cobros_frecuentes_update_policy ON public.cobros_frecuentes
FOR UPDATE TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id))
WITH CHECK (sipra_auth.can_write_to_academia(academia_id));

DROP POLICY IF EXISTS cobros_frecuentes_delete_policy ON public.cobros_frecuentes;
CREATE POLICY cobros_frecuentes_delete_policy ON public.cobros_frecuentes
FOR DELETE TO authenticated
USING (sipra_auth.is_admin_of_tenant(academia_id));

-- ------------------------------------------------------------------------------
-- 3. registrar_pago_atomico_v1 — respeta allow_overpayment
--    (Reemplaza la versión de 20260528030000. Mismo cuerpo + control de sobrepago.)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_pago_atomico_v1(
  p_academia_id uuid,
  p_persona_id uuid,
  p_cargo_ids uuid[],
  p_monto_total numeric,
  p_metodo_pago text,
  p_idempotency_key text,
  p_referencia text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_mov_id uuid := gen_random_uuid();
  v_tl_id uuid := gen_random_uuid();
  v_cargo record;
  v_monto_restante numeric := p_monto_total;
  v_monto_aplicado numeric;
  v_nuevo_saldo numeric;
  v_nuevo_estado text;
  v_persona_nombre text;
  v_allow_partial boolean;
  v_allow_overpay boolean;
  v_total_adeudo numeric;
BEGIN
  -- 1. SEGURIDAD
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  -- 2. VALIDACIÓN DE NEGOCIO
  IF p_monto_total <= 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;

  -- 2.b CONTROL DE POLÍTICAS DE COBRO (abonos parciales / saldo a favor)
  SELECT allow_partial_payments, allow_overpayment
    INTO v_allow_partial, v_allow_overpay
  FROM academia WHERE id = p_academia_id;

  SELECT COALESCE(SUM(saldo_pendiente), 0) INTO v_total_adeudo
  FROM cargo
  WHERE id = ANY(p_cargo_ids)
    AND academia_id = p_academia_id
    AND estado_financiero <> 'anulado';

  IF NOT COALESCE(v_allow_partial, true) AND p_monto_total < v_total_adeudo THEN
    -- La academia exige liquidar el total de los cargos seleccionados.
    RAISE EXCEPTION 'PAGO_PARCIAL_NO_PERMITIDO' USING ERRCODE = 'P0002';
  END IF;

  IF NOT COALESCE(v_allow_overpay, true) AND p_monto_total > v_total_adeudo THEN
    -- La academia no permite generar saldo a favor (sobrepago / anticipo puro).
    RAISE EXCEPTION 'SALDO_A_FAVOR_NO_PERMITIDO' USING ERRCODE = 'P0002';
  END IF;

  SELECT (nombre || ' ' || COALESCE(apellido, '')) INTO v_persona_nombre
  FROM persona WHERE id = p_persona_id AND academia_id = p_academia_id;

  -- Insertar movimiento (Idempotencia protegida por UNIQUE constraint)
  INSERT INTO movimiento (id, academia_id, persona_id, monto_total, monto_disponible, metodo_pago, referencia, idempotency_key, created_by)
  VALUES (v_mov_id, p_academia_id, p_persona_id, p_monto_total, p_monto_total, p_metodo_pago, p_referencia, p_idempotency_key, COALESCE(p_actor_id, sipra_auth.get_my_user_id()));

  -- 3. LOCKS
  FOR v_cargo IN
    SELECT id, saldo_pendiente, monto_original, estado_financiero
    FROM cargo
    WHERE id = ANY(p_cargo_ids) AND academia_id = p_academia_id
    ORDER BY id ASC
    FOR UPDATE
  LOOP
    IF v_monto_restante <= 0 THEN
      EXIT;
    END IF;

    IF v_cargo.saldo_pendiente > 0 THEN
      IF v_monto_restante >= v_cargo.saldo_pendiente THEN
        v_monto_aplicado := v_cargo.saldo_pendiente;
      ELSE
        v_monto_aplicado := v_monto_restante;
      END IF;

      v_nuevo_saldo := v_cargo.saldo_pendiente - v_monto_aplicado;

      IF v_nuevo_saldo = 0 THEN
        v_nuevo_estado := 'liquidado';
      ELSIF v_nuevo_saldo < v_cargo.monto_original THEN
        v_nuevo_estado := 'parcial';
      ELSE
        v_nuevo_estado := v_cargo.estado_financiero;
      END IF;

      -- 4. LEDGER (aplicación + actualización de cargo → trigger ajusta saldo_acumulado)
      INSERT INTO aplicacion_movimiento (academia_id, movimiento_id, cargo_id, monto_aplicado)
      VALUES (p_academia_id, v_mov_id, v_cargo.id, v_monto_aplicado);

      UPDATE cargo
      SET saldo_pendiente = v_nuevo_saldo,
          estado_financiero = v_nuevo_estado,
          updated_at = now()
      WHERE id = v_cargo.id;

      v_monto_restante := v_monto_restante - v_monto_aplicado;

      -- 5. SIDE EFFECTS
      IF v_nuevo_estado = 'liquidado' THEN
        UPDATE envio_sugerido
        SET estado = 'invalidado', invalid_reason = 'Cargo liquidado'
        WHERE cargo_id = v_cargo.id AND estado = 'pendiente_revision';
      END IF;
    END IF;
  END LOOP;

  -- Actualizar monto disponible del movimiento (crédito sobrante no aplicado)
  UPDATE movimiento SET monto_disponible = v_monto_restante WHERE id = v_mov_id;

  -- 6. TIMELINE (Ledger cronológico unificado: cargos + abonos)
  INSERT INTO evento_timeline (id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, actor_nombre, metadata)
  VALUES (v_tl_id, p_academia_id, p_persona_id, 'financiero', 'abono_registrado', 'Pago registrado',
          'Se registró un pago por ' || p_monto_total::text || ' ' || p_metodo_pago,
          COALESCE(p_actor_id, sipra_auth.get_my_user_id()), v_persona_nombre,
          jsonb_build_object('movimiento_id', v_mov_id, 'monto', p_monto_total, 'metodo', p_metodo_pago));

  RETURN jsonb_build_object(
    'success', true,
    'operation_id', v_mov_id,
    'timeline_event_id', v_tl_id,
    'data', jsonb_build_object('monto_sobrante', v_monto_restante),
    'warnings', '[]'::jsonb,
    'needs_refresh', false
  );
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. generar_cargos_recurrentes_v1 — respeta config_cobro->'meses_sin_cobro'
--    (Reemplaza la versión de 20260603000000. Mismo cuerpo + skip de meses.)
-- ------------------------------------------------------------------------------
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
