-- ==============================================================================
-- Migración: actividades
-- Timestamp: 20260610130000
-- Descripción: Los "talleres" pasan a llamarse "actividades" y dejan de ser
--   esquemas de cobro. Una actividad (grupo.es_temporal = true) ya no tiene
--   plan de cobro ni plan sugerido: al inscribir a un alumno se genera un
--   cargo único (sin fecha de vencimiento) por el costo de la actividad.
--
--   Cambios:
--     1) grupo.costo_taller → grupo.costo_actividad (+ comentarios).
--     2) cargo.origen admite 'actividad'.
--     3) Nueva RPC inscribir_alumno_a_actividad_v1: inscripción + cargo único
--        en una sola transacción (sin plan).
--     4) inscribir_alumno_a_grupo_v1: el evento operativo de alta en grupo
--        temporal pasa de INSCRIPCION_TALLER/'Taller asignado' a
--        INSCRIPCION_ACTIVIDAD/'Actividad asignada'.
--     5) Datos: se quitan los planes automáticos "Taller: %" del catálogo
--        (alumno_planes cae por ON DELETE CASCADE y grupo.plan_sugerido_id por
--        ON DELETE SET NULL) y se renombran los eventos históricos
--        INSCRIPCION_TALLER. Los cargos/pagos históricos no se tocan.
-- ==============================================================================

-- 1. Rename de columna + comentarios -------------------------------------------
ALTER TABLE public.grupo RENAME COLUMN costo_taller TO costo_actividad;

COMMENT ON COLUMN public.grupo.es_temporal IS
  'true = actividad (evento temporal con fechas y cargo único); false = grupo regular.';
COMMENT ON COLUMN public.grupo.fecha_inicio IS
  'Fecha de inicio para actividades. Obligatorio si es_temporal = true.';
COMMENT ON COLUMN public.grupo.fecha_fin IS
  'Fecha de fin para actividades (= fecha_inicio si es de un solo día). Obligatorio si es_temporal = true.';
COMMENT ON COLUMN public.grupo.costo_actividad IS
  'Precio único de la actividad; genera un cargo único al inscribir. Obligatorio si es_temporal = true.';

-- 2. cargo.origen admite 'actividad' -------------------------------------------
ALTER TABLE public.cargo DROP CONSTRAINT IF EXISTS chk_cargo_origen;
ALTER TABLE public.cargo ADD CONSTRAINT chk_cargo_origen
  CHECK (origen IN (
    'manual','grupal','mensualidad','ajuste','1er mensualidad',
    'inscripcion','recurrente','visita_express','actividad'
  ));

-- 3. RPC: inscribir_alumno_a_actividad_v1 ---------------------------------------
--    Inscripción a una actividad + cargo único por su costo, atómico.
--    El cargo NO lleva fecha de vencimiento (cargo one-off: nunca genera mora).
CREATE OR REPLACE FUNCTION public.inscribir_alumno_a_actividad_v1(
  p_academia_id uuid,
  p_persona_id  uuid,
  p_grupo_id    uuid,
  p_monto       numeric DEFAULT NULL,
  p_fecha_inscripcion date DEFAULT current_date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_actor_id  uuid;
  v_pg_id     uuid;
  v_cargo_id  uuid;
  v_grupo     record;
  v_persona   record;
  v_ya_activo boolean;
  v_monto     numeric;
BEGIN
  -- 1. SEGURIDAD
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  v_actor_id := sipra_auth.get_my_user_id();

  -- 2. VALIDACIÓN DE NEGOCIO
  SELECT id, nombre, es_temporal, estado, costo_actividad INTO v_grupo
  FROM grupo WHERE id = p_grupo_id AND academia_id = p_academia_id;
  IF NOT FOUND OR NOT v_grupo.es_temporal THEN
    RAISE EXCEPTION 'ACTIVIDAD_NO_ENCONTRADA' USING ERRCODE = 'P0002';
  END IF;
  IF v_grupo.estado <> 'activo' THEN
    RAISE EXCEPTION 'ACTIVIDAD_ARCHIVADA' USING ERRCODE = 'P0002';
  END IF;

  SELECT id, estado_registro INTO v_persona
  FROM persona WHERE id = p_persona_id AND academia_id = p_academia_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PERSONA_NO_ENCONTRADA' USING ERRCODE = 'P0002';
  END IF;
  IF v_persona.estado_registro <> 'activo' THEN
    RAISE EXCEPTION 'PERSONA_SUSPENDIDA' USING ERRCODE = 'P0002';
  END IF;

  -- Monto efectivo: editable desde UI; por defecto, el costo de la actividad.
  v_monto := COALESCE(p_monto, v_grupo.costo_actividad, 0);
  IF v_monto < 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;

  -- Evitar doble inscripción (y doble cargo) sobre la misma actividad.
  SELECT EXISTS (
    SELECT 1 FROM persona_grupo
    WHERE persona_id = p_persona_id AND grupo_id = p_grupo_id AND estado = 'activo'
  ) INTO v_ya_activo;
  IF v_ya_activo THEN
    RAISE EXCEPTION 'YA_INSCRITO' USING ERRCODE = 'P0002';
  END IF;

  -- 3. LEDGER/RELACIÓN: alta (o reactivación) en persona_grupo
  INSERT INTO persona_grupo (academia_id, persona_id, grupo_id, estado, fecha_inscripcion, created_by)
  VALUES (p_academia_id, p_persona_id, p_grupo_id, 'activo', p_fecha_inscripcion, v_actor_id)
  ON CONFLICT (persona_id, grupo_id)
  DO UPDATE SET estado = 'activo', fecha_inscripcion = p_fecha_inscripcion, updated_at = now()
  RETURNING id INTO v_pg_id;

  -- 4. TIMELINE: evento OPERATIVO de alta en la actividad
  INSERT INTO evento_timeline (
    id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
  ) VALUES (
    gen_random_uuid(), p_academia_id, p_persona_id, 'OPERATIVO', 'INSCRIPCION_ACTIVIDAD',
    'Actividad asignada', v_grupo.nombre, v_actor_id,
    jsonb_build_object('grupo_id', p_grupo_id)
  );

  -- 5. CARGO ÚNICO (si hay monto > 0): sin fecha de vencimiento (no genera mora)
  IF v_monto > 0 THEN
    INSERT INTO cargo (
      academia_id, persona_id, grupo_id_origen, concepto, monto_original, saldo_pendiente,
      estado_financiero, fecha_vencimiento, origen, metadata, created_by
    ) VALUES (
      p_academia_id, p_persona_id, p_grupo_id, v_grupo.nombre, v_monto, v_monto,
      'pendiente', NULL, 'actividad',
      jsonb_build_object('actividad', true, 'cargo_unico', true, 'grupo_id', p_grupo_id),
      v_actor_id
    ) RETURNING id INTO v_cargo_id;

    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_id, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, p_persona_id, 'FINANZAS', 'CARGO_UNICO',
      'Cargo: Actividad',
      v_grupo.nombre,
      v_monto,
      v_actor_id,
      jsonb_build_object('monto', v_monto, 'grupo_id', p_grupo_id, 'cargo_id', v_cargo_id)
    );
  END IF;

  RETURN jsonb_build_object(
    'success',          true,
    'persona_grupo_id', v_pg_id,
    'cargo_id',         v_cargo_id,
    'monto',            v_monto,
    'needs_refresh',    false
  );
END;
$$;

-- 4. inscribir_alumno_a_grupo_v1: evento de grupo temporal con la nueva
--    nomenclatura (INSCRIPCION_ACTIVIDAD / 'Actividad asignada').
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
  v_concepto        text;
  v_ya_activo       boolean;
  v_otros_grupos    int;
  v_plan_vinculado  int := 0;
  v_tipo_evento     text;
  v_titulo_evento   text;
BEGIN
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  IF p_monto < 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;

  v_actor_id   := sipra_auth.get_my_user_id();
  v_fecha_venc := (date_trunc('month', p_fecha_inscripcion) + interval '1 month - 1 day')::date;

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
  ELSE
    v_concepto := COALESCE(NULLIF(trim(p_concepto), ''), 'Cargo inicial');
  END IF;

  -- 3) Cargo inicial (si hay monto > 0) → INSCRIPCION
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
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_id, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, p_persona_id, 'FINANZAS', 'INSCRIPCION',
      'Cargo: Inscripción',
      v_concepto || ' · ' || v_grupo.nombre,
      p_monto,
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

-- 5. Migración de datos ----------------------------------------------------------

-- 5.1 Eventos históricos: INSCRIPCION_TALLER → INSCRIPCION_ACTIVIDAD.
UPDATE public.evento_timeline
SET tipo = 'INSCRIPCION_ACTIVIDAD',
    titulo = 'Actividad asignada'
WHERE tipo = 'INSCRIPCION_TALLER';

-- 5.2 Planes automáticos de talleres: se desvinculan y eliminan del catálogo.
--     alumno_planes cae por ON DELETE CASCADE; grupo.plan_sugerido_id queda en
--     NULL por ON DELETE SET NULL. Los cargos históricos no referencian al plan
--     por FK (solo metadata), así que se conservan intactos.
DELETE FROM public.planes_cobro
WHERE id IN (
  SELECT plan_sugerido_id FROM public.grupo
  WHERE es_temporal = true AND plan_sugerido_id IS NOT NULL
)
OR (nombre LIKE 'Taller: %' AND frecuencia = 'pago_unico');

-- DOWN (referencia):
-- ALTER TABLE public.grupo RENAME COLUMN costo_actividad TO costo_taller;
-- DROP FUNCTION IF EXISTS public.inscribir_alumno_a_actividad_v1(uuid, uuid, uuid, numeric, date);
-- ALTER TABLE public.cargo DROP CONSTRAINT IF EXISTS chk_cargo_origen;
-- ALTER TABLE public.cargo ADD CONSTRAINT chk_cargo_origen
--   CHECK (origen IN ('manual','grupal','mensualidad','ajuste','1er mensualidad','inscripcion','recurrente','visita_express'));
-- UPDATE public.evento_timeline SET tipo='INSCRIPCION_TALLER', titulo='Taller asignado' WHERE tipo='INSCRIPCION_ACTIVIDAD';
-- -- Los planes "Taller: %" eliminados y la versión previa de
-- -- inscribir_alumno_a_grupo_v1 deben restaurarse desde timeline_v2.
