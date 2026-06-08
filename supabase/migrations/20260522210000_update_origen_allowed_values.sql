-- Migración: 20260522210000_update_origen_allowed_values
-- Descripción: Refactoriza los valores permitidos del campo origen en la tabla cargo.
--              Estandariza registros existentes y redefine las RPCs afectadas.
--
-- DOWN (revertir):
-- ALTER TABLE public.cargo DROP CONSTRAINT IF EXISTS chk_cargo_origen;
-- ALTER TABLE public.cargo ADD CONSTRAINT chk_cargo_origen
--   CHECK (origen IN ('manual','grupal','automatico','ajuste','inscripcion'));

-- 1. Eliminar constraint de origen actual
ALTER TABLE public.cargo DROP CONSTRAINT IF EXISTS chk_cargo_origen;

-- 2. Migrar datos existentes a la nueva nomenclatura estándar
-- Estandarizar mensualidades automáticas y de cron a 'mensualidad'
UPDATE public.cargo
SET origen = 'mensualidad'
WHERE origen IN ('automatico', 'cron_mensual');

-- Identificar y actualizar primeras mensualidades prorrateadas a '1er mensualidad'
UPDATE public.cargo
SET origen = '1er mensualidad'
WHERE origen = 'inscripcion'
  AND (
    metadata->>'inscripcion_inicial' = 'true' 
    OR lower(concepto) LIKE 'mensualidad %'
  );

-- 3. Crear nuevo check constraint con los nuevos valores permitidos
ALTER TABLE public.cargo ADD CONSTRAINT chk_cargo_origen
  CHECK (origen IN ('manual', 'grupal', 'mensualidad', 'ajuste', '1er mensualidad', 'inscripcion'));


-- 4. Redefinir RPC: inscribir_alumno_a_grupo_v1
-- ==============================================================================
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
      'pendiente', v_fecha_venc, '1er mensualidad',
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


-- 5. Redefinir RPC: generar_mensualidades_mes_v1
-- ==============================================================================
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
      'pendiente', v_fecha_venc, 'mensualidad',
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
