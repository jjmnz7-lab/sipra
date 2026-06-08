-- ==============================================================================
-- Migración: motor_saldo_recurrentes
-- Descripción: Alinea el motor financiero al modelo M2M y al saldo vivo.
--   1) saldo_acumulado pasa a ser un saldo vivo mantenido por TRIGGER sobre
--      `cargo` (saldo_acumulado = Σ saldo_pendiente de la persona). Cubre TODAS
--      las rutas (cargos, pagos, reversas, anulaciones, recargos) sin tocar
--      cada RPC, evitando deriva. + backfill inicial.
--   2) generar_cargos_recurrentes_v1: genera cargos de planes 'mensual' y
--      'semanal' según la fecha de corte. Ignora 'por_visita' y 'pago_unico'.
--   3) crear_cargo_manual_v1: cargo único inmediato (taller, uniforme, etc.).
--   4) registrar_pago_atomico_v1: respeta academia.allow_partial_payments.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. Ampliar valores permitidos de origen (agrega 'recurrente')
-- ------------------------------------------------------------------------------
ALTER TABLE public.cargo DROP CONSTRAINT IF EXISTS chk_cargo_origen;
ALTER TABLE public.cargo ADD CONSTRAINT chk_cargo_origen
  CHECK (origen IN ('manual','grupal','mensualidad','ajuste','1er mensualidad','inscripcion','recurrente'));

-- ------------------------------------------------------------------------------
-- 1. Saldo vivo: trigger que mantiene persona.saldo_acumulado = Σ saldo_pendiente
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_saldo_acumulado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE persona
    SET saldo_acumulado = saldo_acumulado + NEW.saldo_pendiente, updated_at = now()
    WHERE id = NEW.persona_id;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.persona_id = OLD.persona_id THEN
      IF NEW.saldo_pendiente <> OLD.saldo_pendiente THEN
        UPDATE persona
        SET saldo_acumulado = saldo_acumulado + (NEW.saldo_pendiente - OLD.saldo_pendiente), updated_at = now()
        WHERE id = NEW.persona_id;
      END IF;
    ELSE
      -- Caso atípico: el cargo cambió de persona. Rebalancear ambas.
      UPDATE persona SET saldo_acumulado = saldo_acumulado - OLD.saldo_pendiente, updated_at = now() WHERE id = OLD.persona_id;
      UPDATE persona SET saldo_acumulado = saldo_acumulado + NEW.saldo_pendiente, updated_at = now() WHERE id = NEW.persona_id;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE persona
    SET saldo_acumulado = saldo_acumulado - OLD.saldo_pendiente, updated_at = now()
    WHERE id = OLD.persona_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_cargo_sync_saldo ON public.cargo;
CREATE TRIGGER trg_cargo_sync_saldo
AFTER INSERT OR UPDATE OR DELETE ON public.cargo
FOR EACH ROW EXECUTE FUNCTION public.sync_saldo_acumulado();

-- 1.b Backfill: reconstruir el saldo vivo desde el ledger actual.
UPDATE public.persona p
SET saldo_acumulado = COALESCE((
  SELECT SUM(c.saldo_pendiente) FROM public.cargo c WHERE c.persona_id = p.id
), 0);

-- ------------------------------------------------------------------------------
-- 2. Generador recurrente (mensual + semanal). Reemplaza generar_mensualidades_mes_v1.
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.generar_mensualidades_mes_v1(uuid, int, int);

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
      AND p.estado_registro = 'activo'
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
    );

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
  END LOOP;

  RETURN jsonb_build_object(
    'success',            true,
    'cargos_creados',     v_cargos_creados,
    'omitidos_duplicado', v_omitidos,
    'fecha',              p_fecha
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. Cargo manual único inmediato (taller, uniforme, ensayo extra...).
--    No toca los planes recurrentes del alumno. El saldo lo ajusta el trigger.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_cargo_manual_v1(
  p_academia_id uuid,
  p_alumno_id   uuid,
  p_monto       numeric,
  p_concepto    text
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
  IF char_length(trim(COALESCE(p_concepto, ''))) = 0 THEN
    RAISE EXCEPTION 'CONCEPTO_REQUERIDO' USING ERRCODE = 'P0002';
  END IF;

  v_actor_id := sipra_auth.get_my_user_id();

  INSERT INTO cargo (
    academia_id, persona_id, concepto, monto_original, saldo_pendiente,
    estado_financiero, fecha_vencimiento, origen, metadata, created_by
  ) VALUES (
    p_academia_id, p_alumno_id, trim(p_concepto), p_monto, p_monto,
    'pendiente', current_date, 'manual',
    jsonb_build_object('manual', true, 'cargo_unico', true),
    v_actor_id
  ) RETURNING id INTO v_cargo_id;

  INSERT INTO evento_timeline (
    id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
  ) VALUES (
    gen_random_uuid(), p_academia_id, p_alumno_id, 'financiero', 'cargo_generado',
    'Cargo: ' || trim(p_concepto),
    'Cargo manual único por $' || p_monto::text,
    v_actor_id,
    jsonb_build_object('monto', p_monto, 'cargo_id', v_cargo_id)
  );

  RETURN jsonb_build_object('success', true, 'cargo_id', v_cargo_id);
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Pagos con control de abonos parciales (academia.allow_partial_payments).
--    El saldo_acumulado se ajusta solo (trigger) al bajar cargo.saldo_pendiente.
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

  -- 2.b CONTROL DE ABONOS PARCIALES
  SELECT allow_partial_payments INTO v_allow_partial
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
