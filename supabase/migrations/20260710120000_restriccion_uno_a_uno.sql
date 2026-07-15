-- Migración: 20260710120000_restriccion_uno_a_uno
-- Descripción: Transición de relaciones N:M a relaciones 1:N de grupos y planes de cobro para alumnos.
--              Crea columnas grupo_id y plan_cobro_id en persona, migra y deduplica datos,
--              elimina tablas puente y reescribe RPCs críticas de negocio.

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Alterar tabla persona
-- ------------------------------------------------------------------------------
ALTER TABLE public.persona
  ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES public.grupo(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_cobro_id UUID REFERENCES public.planes_cobro(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.persona.grupo_id IS 'Grupo único activo asignado al alumno (relación 1:N)';
COMMENT ON COLUMN public.persona.plan_cobro_id IS 'Plan de cobro recurrente activo asignado al alumno (relación 1:N)';

CREATE INDEX IF NOT EXISTS idx_persona_grupo_id ON public.persona (grupo_id);
CREATE INDEX IF NOT EXISTS idx_persona_plan_cobro_id ON public.persona (plan_cobro_id);

-- ------------------------------------------------------------------------------
-- 2. Copia y deduplicación de datos existentes (Opción A: mantener el más reciente)
-- ------------------------------------------------------------------------------
-- 2.1. Migración de grupos activos
WITH latest_active_grupo AS (
  SELECT DISTINCT ON (persona_id) persona_id, grupo_id
  FROM public.persona_grupo
  WHERE estado = 'activo'
  ORDER BY persona_id, fecha_inscripcion DESC, created_at DESC
)
UPDATE public.persona p
SET grupo_id = lag.grupo_id
FROM latest_active_grupo lag
WHERE p.id = lag.persona_id;

-- 2.2. Migración de planes de cobro
WITH latest_active_plan AS (
  SELECT DISTINCT ON (alumno_id) alumno_id, plan_cobro_id
  FROM public.alumno_planes
  ORDER BY alumno_id, created_at DESC
)
UPDATE public.persona p
SET plan_cobro_id = lap.plan_cobro_id
FROM latest_active_plan lap
WHERE p.id = lap.alumno_id;

-- ------------------------------------------------------------------------------
-- 3. Limpieza de elementos obsoletos en tablas raíz
-- ------------------------------------------------------------------------------
-- 3.1. Eliminar multi_plan_enabled de la tabla academia
ALTER TABLE public.academia DROP COLUMN IF EXISTS multi_plan_enabled;

-- 3.2. Eliminar plan_sugerido_id de la tabla grupo
ALTER TABLE public.grupo DROP CONSTRAINT IF EXISTS grupo_plan_sugerido_id_fkey;
DROP INDEX IF EXISTS idx_grupo_plan_sugerido;
ALTER TABLE public.grupo DROP COLUMN IF EXISTS plan_sugerido_id;

-- ------------------------------------------------------------------------------
-- 4. Eliminar tablas puente y dependencias
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS public.persona_grupo CASCADE;
DROP TABLE IF EXISTS public.alumno_planes CASCADE;

-- ------------------------------------------------------------------------------
-- 5. Eliminar funciones administrativas obsoletas
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.convertir_a_plan_unico_v1(uuid, uuid);

-- ------------------------------------------------------------------------------
-- 6. Reescribir RPCs afectadas
-- ------------------------------------------------------------------------------

-- 6.1. registrar_owner_v3 (sin multi_plan_enabled)
CREATE OR REPLACE FUNCTION public.registrar_owner_v3(
  p_nombre_academia   text,
  p_nombre_owner      text,
  p_apellido_owner    text    DEFAULT NULL,
  p_telefono          text    DEFAULT NULL,
  p_plan_nombre       text    DEFAULT 'Mensualidad Regular',
  p_plan_monto        numeric DEFAULT 300,
  p_meses_sin_cobro   jsonb   DEFAULT '[]'::jsonb,
  p_critico_activo    boolean DEFAULT false,
  p_critico_dia       integer DEFAULT 10,
  p_regimen_alta      text    DEFAULT 'completo',
  p_allow_partial     boolean DEFAULT true,
  p_allow_overpayment boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth, auth
AS $$
DECLARE
  v_user_id     uuid;
  v_email       text;
  v_academia_id uuid := gen_random_uuid();
  v_metadata    jsonb := '{}'::jsonb;
  v_plan_id     uuid;
  v_tel         text;
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

  -- 3. Resolver metadata
  v_tel := NULLIF(trim(COALESCE(p_telefono, '')), '');
  IF v_tel IS NOT NULL THEN
    v_metadata := jsonb_build_object('telefono', v_tel);
  END IF;

  -- 4. Crear Academia con flags y "Smart Defaults"
  INSERT INTO public.academia (
    id,
    nombre,
    estado_tenant,
    allow_partial_payments,
    allow_overpayment,
    config_cobro,
    config_recargos,
    metadata
  ) VALUES (
    v_academia_id,
    p_nombre_academia,
    'activa',
    p_allow_partial,
    p_allow_overpayment,
    jsonb_build_object(
      'regimen_alta', p_regimen_alta,
      'proporcional_redondeo', '1',
      'reglas_dias', '[{"dia_inicio": 1, "dia_fin": 5, "accion": "completo"}, {"dia_inicio": 6, "dia_fin": "fin_mes", "accion": "proporcional"}]'::jsonb,
      'modo_prorrateo', CASE WHEN p_regimen_alta = 'completo' THEN 'completo' ELSE 'proporcional' END,
      'meses_sin_cobro', p_meses_sin_cobro,
      'dias_generacion', '[1]'::jsonb,
      'horas_minimas_recordatorio', 48
    ),
    jsonb_build_object(
      'marcar_critico', jsonb_build_object('activo', p_critico_activo, 'dia_umbral', p_critico_dia),
      'aplicar_recargos', false,
      'reglas', '[]'::jsonb
    ),
    v_metadata
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

  -- 7. Claims del JWT para RLS
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('academia_id', v_academia_id, 'rol', 'owner', 'claims_version', 1)
  WHERE id = v_user_id;

  -- 8. Crear primer plan de cobro base
  IF p_plan_nombre IS NOT NULL AND p_plan_monto IS NOT NULL AND p_plan_monto >= 0 THEN
    INSERT INTO public.planes_cobro (academia_id, nombre, monto, frecuencia)
    VALUES (v_academia_id, p_plan_nombre, p_plan_monto, 'mensual')
    RETURNING id INTO v_plan_id;
  END IF;

  RETURN jsonb_build_object(
    'success',     true,
    'academia_id', v_academia_id,
    'plan_id',     v_plan_id
  );
END;
$$;


-- 6.2. inscribir_alumno_a_grupo_v1 (usando columnas directas en persona)
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
  v_cargo_id        uuid;
  v_fecha_venc      date;
  v_plan            record;
  v_grupo           record;
  v_persona         record;
  v_concepto        text;
  v_ya_activo       boolean;
  v_plan_vinculado  int := 0;
  v_tipo_evento     text;
  v_titulo_evento   text;
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
  v_neto       := p_monto; 

  SELECT id, nombre, es_temporal INTO v_grupo
  FROM grupo WHERE id = p_grupo_id AND academia_id = p_academia_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'GRUPO_NO_ENCONTRADO' USING ERRCODE = 'P0002';
  END IF;

  SELECT grupo_id, plan_cobro_id INTO v_persona
  FROM persona WHERE id = p_persona_id AND academia_id = p_academia_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ALUMNO_NO_ENCONTRADO' USING ERRCODE = 'P0002';
  END IF;

  v_ya_activo := (v_persona.grupo_id = p_grupo_id);

  -- 1) update persona (grupo)
  UPDATE persona
  SET grupo_id = p_grupo_id
  WHERE id = p_persona_id AND academia_id = p_academia_id;

  -- 1.b) Evento OPERATIVO de alta en grupo (sólo si no estaba ya activo en este grupo)
  IF NOT v_ya_activo THEN
    IF v_grupo.es_temporal THEN
      v_tipo_evento   := 'INSCRIPCION_ACTIVIDAD';
      v_titulo_evento := 'Actividad asignada';
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

    v_plan_vinculado := CASE WHEN COALESCE(v_persona.plan_cobro_id, '00000000-0000-0000-0000-000000000000'::uuid) <> p_plan_cobro_id THEN 1 ELSE 0 END;

    UPDATE persona
    SET plan_cobro_id = p_plan_cobro_id
    WHERE id = p_persona_id AND academia_id = p_academia_id;

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

    -- 2.c) Descuento especial del alumno (beca/hermanos)
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

  -- 3) Cargo inicial
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
    'persona_grupo_id', NULL, 
    'cargo_id',         v_cargo_id
  );
END;
$$;


-- 6.3. generar_mensualidades_mes_v1 (leído directo de persona)
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
    SELECT p.id AS persona_id, pc.id AS plan_id, pc.nombre AS plan_nombre, pc.monto
    FROM public.persona p
    JOIN public.planes_cobro pc ON pc.id = p.plan_cobro_id
    WHERE p.academia_id = p_academia_id
      AND pc.frecuencia = 'mensual'
      AND pc.monto > 0
      AND p.estado_registro = 'activo'
      AND p.etiqueta = 'alumno'
  LOOP
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


-- 6.4. generar_cargos_recurrentes_v1 (leído directo de persona)
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
  v_meses_sin_cobro jsonb;
  v_mes_actual      int;
  v_meses_es       text[] := ARRAY[
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  v_desc_monto     numeric := 0;
  v_desc_tipo      text;
  v_desc_label     text;
  v_neto           numeric;
  v_cargo_id       uuid;
  v_mov            record;
  v_saldo_cargo    numeric;
  v_aplicar        numeric;
  v_credito_usado  numeric;
  v_nuevo_estado   text;
BEGIN
  v_dow := EXTRACT(isodow FROM p_fecha)::int; 
  v_mes_actual := EXTRACT(month FROM p_fecha)::int;

  SELECT COALESCE(config_cobro->'meses_sin_cobro', '[]'::jsonb)
    INTO v_meses_sin_cobro
  FROM academia WHERE id = p_academia_id;

  FOR v_row IN
    SELECT p.id AS persona_id, pc.id AS plan_id, pc.nombre AS plan_nombre,
           pc.monto, pc.frecuencia,
           p.descuento_hermanos_activo, p.descuento_hermanos_monto,
           p.beca_activa, p.beca_porcentaje
    FROM public.persona p
    JOIN public.planes_cobro pc ON pc.id = p.plan_cobro_id
    WHERE p.academia_id = p_academia_id
      AND pc.frecuencia IN ('mensual', 'semanal')
      AND pc.monto > 0
      AND p.estado_registro = 'activo'
      AND p.etiqueta = 'alumno'
  LOOP
    IF v_row.frecuencia = 'mensual' THEN
      v_due        := (EXTRACT(day FROM p_fecha)::int = 1); 
      v_periodo    := 'M' || to_char(p_fecha, 'YYYY-MM');
      v_concepto   := 'Mensualidad ' || v_meses_es[EXTRACT(month FROM p_fecha)::int] || ' ' || to_char(p_fecha, 'YYYY');
      v_fecha_venc := (date_trunc('month', p_fecha) + interval '1 month - 1 day')::date;
    ELSE 
      v_due        := (v_dow = 1); 
      v_periodo    := 'W' || to_char(p_fecha, 'IYYY-IW');
      v_concepto   := 'Cuota semanal ' || to_char(p_fecha, 'DD/MM/YYYY');
      v_fecha_venc := p_fecha + 6; 
    END IF;

    IF NOT v_due THEN
      CONTINUE;
    END IF;

    IF v_row.frecuencia = 'mensual'
       AND v_meses_sin_cobro @> to_jsonb(v_mes_actual) THEN
      v_omitidos := v_omitidos + 1;
      CONTINUE;
    END IF;

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
      v_neto := v_row.monto - v_desc_monto;
    ELSE
      v_neto := v_row.monto;
    END IF;

    IF v_neto <= 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM evento_timeline e
        WHERE e.academia_id = p_academia_id AND e.persona_id = v_row.persona_id
          AND e.tipo = 'DESCUENTO' AND e.metadata->>'periodo' = v_periodo
      ) THEN
        INSERT INTO evento_timeline (
          id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
        ) VALUES (
          gen_random_uuid(), p_academia_id, v_row.persona_id, 'FINANZAS', 'DESCUENTO',
          v_desc_label,
          v_concepto || ' · exento (−$' || v_desc_monto::int || ')',
          '00000000-0000-0000-0000-000000000000'::uuid, 
          jsonb_build_object(
            'descuento_tipo', v_desc_tipo, 'descuento_monto', v_desc_monto,
            'monto_bruto', v_row.monto, 'periodo', v_periodo, 'exento', true
          )
        );
      END IF;
      v_omitidos := v_omitidos + 1;
      CONTINUE;
    END IF;

    INSERT INTO cargo (
      academia_id, persona_id, concepto, monto_original, saldo_pendiente,
      estado_financiero, fecha_vencimiento, origen, metadata
    ) VALUES (
      p_academia_id, v_row.persona_id, v_concepto, v_neto, v_neto,
      'pendiente', v_fecha_venc, 'recurrente',
      jsonb_build_object('plan_id', v_row.plan_id, 'plan_nombre', v_row.plan_nombre, 'periodo', v_periodo, 'frecuencia', v_row.frecuencia)
      || (CASE WHEN v_desc_monto > 0 THEN jsonb_build_object(
        'monto_bruto', v_row.monto, 'descuento_tipo', v_desc_tipo, 'descuento_monto', v_desc_monto
      ) ELSE '{}'::jsonb END)
    ) RETURNING id INTO v_cargo_id;

    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_nombre, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, v_row.persona_id, 'financiero', 'cargo_generado',
      v_concepto,
      'Cargo recurrente generado (' || v_row.plan_nombre || ') por $' || v_neto::text,
      'Sistema (cron)',
      jsonb_build_object('monto', v_neto, 'plan_id', v_row.plan_id, 'periodo', v_periodo, 'cargo_id', v_cargo_id)
    );

    IF v_desc_monto > 0 THEN
      INSERT INTO evento_timeline (
        id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
      ) VALUES (
        gen_random_uuid(), p_academia_id, v_row.persona_id, 'FINANZAS', 'DESCUENTO',
        v_desc_label,
        v_concepto || ': $' || v_row.monto::int || ' → $' || v_neto::int || ' (−$' || v_desc_monto::int || ')',
        '00000000-0000-0000-0000-000000000000'::uuid,
        jsonb_build_object(
          'descuento_tipo', v_desc_tipo, 'descuento_monto', v_desc_monto,
          'monto_bruto', v_row.monto, 'periodo', v_periodo, 'cargo_id', v_cargo_id
        )
      );
    END IF;

    -- Aplicación de Saldo a Favor (FIFO)
    v_saldo_cargo := v_neto;
    v_credito_usado := 0;
    FOR v_mov IN
      SELECT id, monto_disponible FROM movimiento
      WHERE academia_id = p_academia_id AND persona_id = v_row.persona_id AND monto_disponible > 0
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

    v_cargos_creados := v_cargos_creados + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success',            true,
    'cargos_creados',     v_cargos_creados,
    'omitidos_duplicado', v_omitidos,
    'saldo_favor_aplicado', v_credito_total
  );
END;
$$;


-- 6.5. generar_mensualidad_esquema_v1 (leído directo de persona)
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
  v_regla          record;
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
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;
  v_actor_id := sipra_auth.get_my_user_id();

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

  SELECT id, nombre, monto, frecuencia, activo INTO v_plan
  FROM planes_cobro WHERE id = p_plan_cobro_id AND academia_id = p_academia_id;
  IF NOT FOUND OR v_plan.frecuencia <> 'mensual' OR NOT v_plan.activo OR COALESCE(v_plan.monto, 0) <= 0 THEN
    RETURN jsonb_build_object('generado', false, 'motivo', 'plan_no_aplica');
  END IF;

  SELECT estado_registro, etiqueta,
         descuento_hermanos_activo, descuento_hermanos_monto, beca_activa, beca_porcentaje
    INTO v_persona
  FROM persona WHERE id = p_persona_id AND academia_id = p_academia_id;
  IF NOT FOUND OR v_persona.etiqueta <> 'alumno' OR v_persona.estado_registro <> 'activo' THEN
    RETURN jsonb_build_object('generado', false, 'motivo', 'alumno_no_aplica');
  END IF;

  IF COALESCE(v_config->'meses_sin_cobro', '[]'::jsonb) @> to_jsonb(v_mes_actual) THEN
    RETURN jsonb_build_object('generado', false, 'motivo', 'mes_sin_cobro');
  END IF;

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

  IF jsonb_array_length(COALESCE(v_config->'reglas_dias', '[]'::jsonb)) > 0 THEN
    FOR v_regla IN SELECT * FROM jsonb_array_elements(v_config->'reglas_dias')
    LOOP
      v_dia_fin_eval := CASE
        WHEN v_regla.value->>'dia_fin' = 'fin_mes' THEN v_dias_mes
        ELSE (v_regla.value->>'dia_fin')::int
      END;
      IF v_dia BETWEEN (v_regla.value->>'dia_inicio')::int AND v_dia_fin_eval THEN
        v_regla_match := v_regla.value;
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


-- 6.6. archivar_plan_v1 (usando persona)
CREATE OR REPLACE FUNCTION public.archivar_plan_v1(
  p_academia_id     uuid,
  p_plan_id         uuid,
  p_plan_id_destino uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_afectados int := 0;
  v_modo      text;
BEGIN
  IF NOT sipra_auth.is_admin_of_tenant(p_academia_id)
     OR NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM planes_cobro WHERE id = p_plan_id AND academia_id = p_academia_id) THEN
    RAISE EXCEPTION 'PLAN_NO_ENCONTRADO' USING ERRCODE = 'P0002';
  END IF;

  IF p_plan_id_destino IS NOT NULL THEN
    IF p_plan_id_destino = p_plan_id THEN
      RAISE EXCEPTION 'DESTINO_INVALIDO' USING ERRCODE = 'P0002';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM planes_cobro
      WHERE id = p_plan_id_destino AND academia_id = p_academia_id AND activo = true
    ) THEN
      RAISE EXCEPTION 'PLAN_DESTINO_NO_VALIDO' USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.persona
    SET plan_cobro_id = p_plan_id_destino
    WHERE academia_id = p_academia_id AND plan_cobro_id = p_plan_id;
    GET DIAGNOSTICS v_afectados = ROW_COUNT;
    v_modo := 'migrado';
  ELSE
    UPDATE public.persona
    SET plan_cobro_id = NULL
    WHERE academia_id = p_academia_id AND plan_cobro_id = p_plan_id;
    GET DIAGNOSTICS v_afectados = ROW_COUNT;
    v_modo := 'huerfano';
  END IF;

  UPDATE planes_cobro SET activo = false WHERE id = p_plan_id AND academia_id = p_academia_id;

  RETURN jsonb_build_object(
    'success',          true,
    'plan_id',          p_plan_id,
    'destino',          p_plan_id_destino,
    'modo',             v_modo,
    'alumnos_afectados', v_afectados
  );
END;
$$;


-- 6.7. archivar_grupo_v1 (usando persona)
CREATE OR REPLACE FUNCTION public.archivar_grupo_v1(
  p_academia_id      uuid,
  p_grupo_id         uuid,
  p_grupo_id_destino uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_afectados int := 0;
  v_modo      text;
BEGIN
  IF NOT sipra_auth.is_admin_of_tenant(p_academia_id)
     OR NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM grupo WHERE id = p_grupo_id AND academia_id = p_academia_id) THEN
    RAISE EXCEPTION 'GRUPO_NO_ENCONTRADO' USING ERRCODE = 'P0002';
  END IF;

  IF p_grupo_id_destino IS NOT NULL THEN
    IF p_grupo_id_destino = p_grupo_id THEN
      RAISE EXCEPTION 'DESTINO_INVALIDO' USING ERRCODE = 'P0002';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM grupo
      WHERE id = p_grupo_id_destino AND academia_id = p_academia_id AND estado = 'activo'
    ) THEN
      RAISE EXCEPTION 'GRUPO_DESTINO_NO_VALIDO' USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.persona
    SET grupo_id = p_grupo_id_destino
    WHERE academia_id = p_academia_id AND grupo_id = p_grupo_id;
    GET DIAGNOSTICS v_afectados = ROW_COUNT;
    v_modo := 'migrado';
  ELSE
    UPDATE public.persona
    SET grupo_id = NULL
    WHERE academia_id = p_academia_id AND grupo_id = p_grupo_id;
    GET DIAGNOSTICS v_afectados = ROW_COUNT;
    v_modo := 'huerfano';
  END IF;

  UPDATE grupo SET estado = 'archivado', updated_at = now()
  WHERE id = p_grupo_id AND academia_id = p_academia_id;

  RETURN jsonb_build_object(
    'success',          true,
    'grupo_id',         p_grupo_id,
    'destino',          p_grupo_id_destino,
    'modo',             v_modo,
    'alumnos_afectados', v_afectados
  );
END;
$$;

COMMIT;
