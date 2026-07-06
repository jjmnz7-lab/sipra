-- ==============================================================================
-- Migración: descuento_en_alta_inscripcion
-- Descripción: `inscribir_alumno_a_grupo_v1` (el cargo inicial al dar de alta
--   a un alumno o asignarle un plan) NUNCA aplicaba descuentos especiales
--   (Hermanos/Beca) — cobraba siempre el monto bruto del plan. Caso detectado
--   2026-07-06: MARCOS ENRIQUE ESTAVILLO (owner1) tenía Hermanos activo desde
--   el alta y aun así se le cobró la mensualidad completa ($300 en vez de
--   $225). Es un gap distinto y anterior al de "esquema tardío" del
--   2026-07-02 — ese fix (generar_mensualidad_esquema_v1) protege el caso de
--   asignar el esquema DESPUÉS del alta, no el cargo del alta misma.
--
--   Fix: cuando el plan asignado es de frecuencia 'mensual' (mismo alcance
--   que generar_cargos_recurrentes_v1 — no aplica a semanal/por_visita/
--   pago_unico), el cargo inicial se cobra NETO automáticamente, sin opt-in
--   (decisión de producto: el alta es, en efecto, la primera mensualidad del
--   alumno, y debe verse igual que el cobro recurrente automático).
--
--   Prioridad Beca > Hermanos, exclusión mutua garantizada por CHECK en
--   `persona`. Si el neto queda en 0 (beca 100% o descuento ≥ precio) NO se
--   crea cargo — solo la línea informativa DESCUENTO (mismo patrón que
--   generar_cargos_recurrentes_v1 / generar_mensualidad_esquema_v1).
--
--   Mismo cuerpo que 20260610130000_actividades.sql; solo se agrega el
--   bloque de descuento antes de insertar el cargo.
--
-- DOWN (referencia): restaurar la versión de 20260610130000_actividades.sql.
-- ==============================================================================

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
  v_actor_id        uuid;
  v_pg_id           uuid;
  v_cargo_id        uuid;
  v_fecha_venc      date;
  v_plan            record;
  v_grupo           record;
  v_persona         record;
  v_concepto        text;
  v_ya_activo       boolean;
  v_otros_grupos    int;
  v_plan_vinculado  int := 0;
  v_tipo_evento     text;
  v_titulo_evento   text;
  -- Descuento especial del alumno (solo planes mensuales, auto-aplicado).
  v_desc_monto      numeric := 0;
  v_desc_tipo       text;
  v_desc_label      text;
  v_neto            numeric;
BEGIN
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  IF p_monto < 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;

  v_actor_id   := sipra_auth.get_my_user_id();
  v_fecha_venc := (date_trunc('month', p_fecha_inscripcion) + interval '1 month - 1 day')::date;
  v_neto       := p_monto; -- default: sin descuento (grupo sin plan, o plan no mensual)

  SELECT id, nombre, es_temporal INTO v_grupo
  FROM grupo WHERE id = p_grupo_id AND academia_id = p_academia_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'GRUPO_NO_ENCONTRADO' USING ERRCODE = 'P0002';
  END IF;

  -- Contexto previo para tipificar el evento operativo.
  SELECT EXISTS (
    SELECT 1 FROM persona_grupo
    WHERE persona_id = p_persona_id AND grupo_id = p_grupo_id AND estado = 'activo'
  ) INTO v_ya_activo;

  SELECT count(*) INTO v_otros_grupos
  FROM persona_grupo
  WHERE academia_id = p_academia_id
    AND persona_id = p_persona_id
    AND grupo_id <> p_grupo_id
    AND estado = 'activo';

  -- 1) persona_grupo (upsert: reactivar si ya existía)
  INSERT INTO persona_grupo (academia_id, persona_id, grupo_id, estado, fecha_inscripcion, created_by)
  VALUES (p_academia_id, p_persona_id, p_grupo_id, 'activo', p_fecha_inscripcion, v_actor_id)
  ON CONFLICT (persona_id, grupo_id)
  DO UPDATE SET estado = 'activo', fecha_inscripcion = p_fecha_inscripcion, updated_at = now()
  RETURNING id INTO v_pg_id;

  -- 1.b) Evento OPERATIVO de alta en grupo (sólo si no estaba ya activo)
  IF NOT v_ya_activo THEN
    IF v_grupo.es_temporal THEN
      v_tipo_evento   := 'INSCRIPCION_ACTIVIDAD';
      v_titulo_evento := 'Actividad asignada';
    ELSIF v_otros_grupos > 0 THEN
      v_tipo_evento   := 'INSCRIPCION_NUEVO_GRUPO';
      v_titulo_evento := 'Alta en grupo extra';
    ELSE
      v_tipo_evento   := 'GRUPO_MUTACION';
      v_titulo_evento := 'Grupo asignado';
    END IF;

    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, p_persona_id, 'OPERATIVO', v_tipo_evento,
      v_titulo_evento, v_grupo.nombre, v_actor_id,
      jsonb_build_object('grupo_id', p_grupo_id)
    );
  END IF;

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
    GET DIAGNOSTICS v_plan_vinculado = ROW_COUNT;

    -- 2.b) Evento OPERATIVO de esquema asignado (sólo si fue vínculo nuevo)
    IF v_plan_vinculado > 0 THEN
      INSERT INTO evento_timeline (
        id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
      ) VALUES (
        gen_random_uuid(), p_academia_id, p_persona_id, 'OPERATIVO', 'ESQUEMA_MUTACION',
        'Esquema asignado', v_plan.nombre, v_actor_id,
        jsonb_build_object('plan_id', p_plan_cobro_id)
      );
    END IF;

    v_concepto := COALESCE(NULLIF(trim(p_concepto), ''), v_plan.nombre);

    -- 2.c) Descuento especial del alumno — SOLO planes mensuales, igual
    --      alcance que generar_cargos_recurrentes_v1. Auto-aplicado, sin
    --      opt-in: el cargo inicial es, en efecto, la primera mensualidad.
    IF v_plan.frecuencia = 'mensual' AND p_monto > 0 THEN
      SELECT beca_activa, beca_porcentaje, descuento_hermanos_activo, descuento_hermanos_monto
        INTO v_persona
      FROM persona WHERE id = p_persona_id AND academia_id = p_academia_id;

      IF COALESCE(v_persona.beca_activa, false) AND COALESCE(v_persona.beca_porcentaje, 0) > 0 THEN
        v_desc_monto := round(p_monto * v_persona.beca_porcentaje / 100.0);
        v_desc_tipo  := 'beca';
        v_desc_label := 'Beca ' || v_persona.beca_porcentaje || '%';
      ELSIF COALESCE(v_persona.descuento_hermanos_activo, false) AND COALESCE(v_persona.descuento_hermanos_monto, 0) > 0 THEN
        v_desc_monto := LEAST(p_monto, v_persona.descuento_hermanos_monto::numeric);
        v_desc_tipo  := 'hermanos';
        v_desc_label := 'Descuento Hermanos';
      END IF;
      v_neto := p_monto - v_desc_monto;
    END IF;
  ELSE
    v_concepto := COALESCE(NULLIF(trim(p_concepto), ''), 'Cargo inicial');
  END IF;

  -- 3) Cargo inicial (si el neto es > 0) → INSCRIPCION
  IF v_neto > 0 THEN
    INSERT INTO cargo (
      academia_id, persona_id, concepto, monto_original, saldo_pendiente,
      estado_financiero, fecha_vencimiento, origen, metadata
    ) VALUES (
      p_academia_id, p_persona_id, v_concepto, v_neto, v_neto,
      'pendiente', v_fecha_venc, 'inscripcion',
      jsonb_build_object('grupo_id', p_grupo_id, 'plan_id', p_plan_cobro_id, 'inscripcion_inicial', true)
      || (CASE WHEN v_desc_monto > 0 THEN jsonb_build_object(
        'monto_bruto', p_monto, 'descuento_tipo', v_desc_tipo, 'descuento_monto', v_desc_monto
      ) ELSE '{}'::jsonb END)
    ) RETURNING id INTO v_cargo_id;

    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_id, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, p_persona_id, 'FINANZAS', 'INSCRIPCION',
      'Cargo: Inscripción',
      v_concepto || ' · ' || v_grupo.nombre,
      v_neto,
      v_actor_id,
      jsonb_build_object('monto', v_neto, 'grupo_id', p_grupo_id, 'plan_id', p_plan_cobro_id, 'cargo_id', v_cargo_id)
    );

    -- Línea informativa del descuento (no afecta saldo: el cargo ya es neto).
    IF v_desc_monto > 0 THEN
      INSERT INTO evento_timeline (
        id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
      ) VALUES (
        gen_random_uuid(), p_academia_id, p_persona_id, 'FINANZAS', 'DESCUENTO',
        v_desc_label,
        v_concepto || ': $' || p_monto::int || ' → $' || v_neto::int || ' (−$' || v_desc_monto::int || ')',
        v_actor_id,
        jsonb_build_object(
          'descuento_tipo', v_desc_tipo, 'descuento_monto', v_desc_monto,
          'monto_bruto', p_monto, 'cargo_id', v_cargo_id
        )
      );
    END IF;
  ELSIF p_monto > 0 THEN
    -- Exento total (beca 100% / descuento ≥ precio): sin cargo, solo la
    -- línea informativa (el ledger no admite cargos en 0).
    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, p_persona_id, 'FINANZAS', 'DESCUENTO',
      v_desc_label,
      v_concepto || ' · exento (−$' || v_desc_monto::int || ')',
      v_actor_id,
      jsonb_build_object(
        'descuento_tipo', v_desc_tipo, 'descuento_monto', v_desc_monto,
        'monto_bruto', p_monto, 'exento', true
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success',          true,
    'persona_grupo_id', v_pg_id,
    'cargo_id',         v_cargo_id
  );
END;
$$;
