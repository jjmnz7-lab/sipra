-- ==============================================================================
-- Migración: modelo_manual
-- Descripción: Agrega el 3er modelo de negocio del onboarding — "Puros cargos
--   manuales" (100% transaccional / por eventos). Desactiva la automatización
--   mensual mediante la flag `academia.automatizacion_recurrente`.
--
--   Matriz de flags por modelo:
--     simple   : multi_plan=false, partial=false, recurrente=true  (+ plan general)
--     avanzado : multi_plan=true,  partial=true,  recurrente=true
--     manual   : multi_plan=false, partial=true,  recurrente=false (sin plan)
--
--   El cron `generar_cargos_recurrentes_v1` ahora retorna temprano si la academia
--   tiene la automatización desactivada (fuente única de verdad).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Flag de automatización recurrente (default true → no afecta academias previas)
-- ------------------------------------------------------------------------------
ALTER TABLE public.academia
  ADD COLUMN IF NOT EXISTS automatizacion_recurrente BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.academia.automatizacion_recurrente IS
  'Si false (modelo "puros cargos manuales"), el cron de cargos recurrentes NO genera mensualidades/semanales para esta academia. Operación 100% transaccional.';

-- ------------------------------------------------------------------------------
-- 2. registrar_owner_v2: soportar p_modelo = 'manual'
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_owner_v2(
  p_nombre_academia   text,
  p_nombre_owner      text,
  p_apellido_owner    text    DEFAULT NULL,
  p_telefono          text    DEFAULT NULL,
  p_modelo            text    DEFAULT 'simple',
  p_monto_mensualidad numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth, auth
AS $$
DECLARE
  v_user_id      uuid;
  v_email        text;
  v_academia_id  uuid := gen_random_uuid();
  v_multi_plan   boolean;
  v_partial      boolean;
  v_recurrente   boolean;
  v_metadata     jsonb := '{}'::jsonb;
  v_plan_id      uuid;
  v_tel          text;
BEGIN
  -- 1. Identificar usuario desde el auth token
  v_user_id := auth.uid();
  v_email   := auth.jwt() ->> 'email';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NO_AUTENTICADO' USING ERRCODE = 'P0001';
  END IF;

  -- 2. Validar que no tenga ya un usuario creado
  IF EXISTS (SELECT 1 FROM public.usuario WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'USUARIO_YA_REGISTRADO' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Resolver flags del modelo de negocio
  IF p_modelo = 'avanzado' THEN
    v_multi_plan := true;  v_partial := true;  v_recurrente := true;
  ELSIF p_modelo = 'manual' THEN
    v_multi_plan := false; v_partial := true;  v_recurrente := false;
  ELSE  -- 'simple' (default)
    v_multi_plan := false; v_partial := false; v_recurrente := true;
  END IF;

  v_tel := NULLIF(trim(COALESCE(p_telefono, '')), '');
  IF v_tel IS NOT NULL THEN
    v_metadata := jsonb_build_object('telefono', v_tel);
  END IF;

  -- 4. Crear Academia con flags del modelo de negocio
  INSERT INTO public.academia (
    id, nombre, estado_tenant, multi_plan_enabled, allow_partial_payments,
    automatizacion_recurrente, metadata
  ) VALUES (
    v_academia_id, p_nombre_academia, 'activa',
    v_multi_plan, v_partial, v_recurrente, v_metadata
  );

  -- 5. Crear Suscripción (Trial 14 días)
  INSERT INTO public.suscripcion_academia (
    academia_id, plan_codigo, estado, is_current,
    precio_mensual, fecha_inicio, fecha_fin, trial_ends_at
  ) VALUES (
    v_academia_id, 'trial', 'trial', true,
    0, now(), now() + interval '14 days', now() + interval '14 days'
  );

  -- 6. Crear Usuario (Owner)
  INSERT INTO public.usuario (id, academia_id, nombre, apellido, email_snapshot, rol, estado)
  VALUES (v_user_id, v_academia_id, p_nombre_owner, p_apellido_owner, v_email, 'owner', 'activo');

  -- 7. Claims del JWT para las siguientes peticiones
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('academia_id', v_academia_id, 'rol', 'owner', 'claims_version', 1)
  WHERE id = v_user_id;

  -- 8. Modelo simple: crear el plan 'Mensualidad General' (si se indicó monto).
  --    Avanzado y manual no crean planes aquí.
  IF p_modelo = 'simple' AND p_monto_mensualidad IS NOT NULL AND p_monto_mensualidad > 0 THEN
    INSERT INTO public.planes_cobro (academia_id, nombre, monto, frecuencia)
    VALUES (v_academia_id, 'Mensualidad General', p_monto_mensualidad, 'mensual')
    RETURNING id INTO v_plan_id;
  END IF;

  RETURN jsonb_build_object(
    'success',     true,
    'academia_id', v_academia_id,
    'modelo',      p_modelo,
    'plan_id',     v_plan_id
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. generar_cargos_recurrentes_v1: respetar automatizacion_recurrente
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
  v_recurrente     boolean;
BEGIN
  -- Guard: academias con modelo "puros cargos manuales" no generan recurrentes.
  SELECT automatizacion_recurrente INTO v_recurrente
  FROM academia WHERE id = p_academia_id;

  IF NOT COALESCE(v_recurrente, true) THEN
    RETURN jsonb_build_object(
      'success', true, 'cargos_creados', 0, 'omitidos_duplicado', 0,
      'fecha', p_fecha, 'skipped', 'automatizacion_recurrente_off'
    );
  END IF;

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
