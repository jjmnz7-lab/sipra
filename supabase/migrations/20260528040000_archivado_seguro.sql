-- ==============================================================================
-- Migración: archivado_seguro
-- Descripción: Soft-delete (archivado) de planes/grupos, plan sugerido por grupo,
--   conversión multi→único y archivado con migración en lote. Protege el Ledger
--   (cargo/movimiento) NUNCA borrando cargos; solo se rompen/migran las tablas
--   puente (alumno_planes, persona_grupo).
--
--   Convenciones del esquema real:
--     - grupo  : ya tiene `estado` ('activo'|'archivado') → se reutiliza (NO se
--                agrega `activo` para evitar doble fuente de verdad).
--     - planes_cobro: se agrega `activo` boolean (no existía).
--     - puente alumno↔grupo = persona_grupo (tiene `estado`).
--     - puente alumno↔plan  = alumno_planes (sin estado → romper = DELETE filas).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Extensiones de tabla
-- ------------------------------------------------------------------------------
ALTER TABLE public.grupo
  ADD COLUMN IF NOT EXISTS plan_sugerido_id UUID REFERENCES public.planes_cobro(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.grupo.plan_sugerido_id IS
  'Plan de cobro sugerido por defecto al inscribir alumnos a este grupo. ON DELETE SET NULL.';

CREATE INDEX IF NOT EXISTS idx_grupo_plan_sugerido ON public.grupo (plan_sugerido_id);

ALTER TABLE public.planes_cobro
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.planes_cobro.activo IS
  'Soft-delete: false = plan archivado. El cron y los selectores lo ignoran, pero se preserva el historial del Ledger.';

CREATE INDEX IF NOT EXISTS idx_planes_cobro_activo ON public.planes_cobro (academia_id, activo);

-- ------------------------------------------------------------------------------
-- 2. Generador recurrente: ignorar planes archivados (activo = false)
--    Re-emisión idéntica + filtro pc.activo.
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
BEGIN
  v_dow := EXTRACT(isodow FROM p_fecha)::int;  -- 1 = lunes ... 7 = domingo

  FOR v_row IN
    SELECT ap.alumno_id AS persona_id, pc.id AS plan_id, pc.nombre AS plan_nombre,
           pc.monto, pc.frecuencia
    FROM alumno_planes ap
    JOIN planes_cobro pc ON pc.id = ap.plan_cobro_id
    JOIN persona p       ON p.id = ap.alumno_id
    WHERE ap.academia_id = p_academia_id
      AND pc.activo = true                          -- ignora planes archivados
      AND pc.frecuencia IN ('mensual', 'semanal')   -- 'por_visita'/'pago_unico' se ignoran
      AND pc.monto > 0
      AND p.estado_registro = 'activo'
      AND p.etiqueta = 'alumno'
  LOOP
    IF v_row.frecuencia = 'mensual' THEN
      v_due        := (EXTRACT(day FROM p_fecha)::int = 1);
      v_periodo    := 'M' || to_char(p_fecha, 'YYYY-MM');
      v_concepto   := 'Mensualidad ' || to_char(date_trunc('month', p_fecha), 'TMMonth YYYY');
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
-- 3. Conversión multi → único plan
--    Mueve a todos los alumnos activos al plan fallback (limpiando otros planes),
--    archiva el resto de planes y desactiva multi_plan_enabled.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.convertir_a_plan_unico_v1(
  p_academia_id     uuid,
  p_plan_id_fallback uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_alumnos_movidos   int := 0;
  v_planes_archivados int := 0;
BEGIN
  -- 1. Seguridad (operación administrativa)
  IF NOT sipra_auth.is_admin_of_tenant(p_academia_id)
     OR NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  -- 2. Validar plan fallback
  IF NOT EXISTS (
    SELECT 1 FROM planes_cobro WHERE id = p_plan_id_fallback AND academia_id = p_academia_id
  ) THEN
    RAISE EXCEPTION 'PLAN_FALLBACK_NO_ENCONTRADO' USING ERRCODE = 'P0002';
  END IF;

  -- Asegurar que el fallback quede activo
  UPDATE planes_cobro SET activo = true WHERE id = p_plan_id_fallback AND academia_id = p_academia_id;

  -- 3. Limpiar otras asociaciones de los alumnos ACTIVOS
  DELETE FROM alumno_planes ap
  WHERE ap.academia_id = p_academia_id
    AND ap.plan_cobro_id <> p_plan_id_fallback
    AND ap.alumno_id IN (
      SELECT id FROM persona
      WHERE academia_id = p_academia_id AND estado_registro = 'activo' AND etiqueta = 'alumno'
    );

  -- 4. Asignar el fallback a todos los alumnos activos (idempotente)
  INSERT INTO alumno_planes (academia_id, alumno_id, plan_cobro_id)
  SELECT p_academia_id, pe.id, p_plan_id_fallback
  FROM persona pe
  WHERE pe.academia_id = p_academia_id AND pe.estado_registro = 'activo' AND pe.etiqueta = 'alumno'
  ON CONFLICT (alumno_id, plan_cobro_id) DO NOTHING;

  GET DIAGNOSTICS v_alumnos_movidos = ROW_COUNT;

  -- 5. Archivar todos los planes distintos al fallback
  UPDATE planes_cobro
  SET activo = false
  WHERE academia_id = p_academia_id AND id <> p_plan_id_fallback AND activo = true;

  GET DIAGNOSTICS v_planes_archivados = ROW_COUNT;

  -- 6. Cambiar la academia a modo simple (no se toca allow_partial_payments)
  UPDATE academia SET multi_plan_enabled = false, updated_at = now() WHERE id = p_academia_id;

  RETURN jsonb_build_object(
    'success',           true,
    'plan_fallback',     p_plan_id_fallback,
    'alumnos_asignados', v_alumnos_movidos,
    'planes_archivados', v_planes_archivados
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Archivar PLAN de cobro (con migración en lote opcional)
-- ------------------------------------------------------------------------------
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
    -- Migración en lote: validar destino
    IF p_plan_id_destino = p_plan_id THEN
      RAISE EXCEPTION 'DESTINO_INVALIDO' USING ERRCODE = 'P0002';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM planes_cobro
      WHERE id = p_plan_id_destino AND academia_id = p_academia_id AND activo = true
    ) THEN
      RAISE EXCEPTION 'PLAN_DESTINO_NO_VALIDO' USING ERRCODE = 'P0002';
    END IF;

    -- Reasignar evitando conflicto de PK (alumno ya con el destino)
    INSERT INTO alumno_planes (academia_id, alumno_id, plan_cobro_id)
    SELECT academia_id, alumno_id, p_plan_id_destino
    FROM alumno_planes
    WHERE academia_id = p_academia_id AND plan_cobro_id = p_plan_id
    ON CONFLICT (alumno_id, plan_cobro_id) DO NOTHING;

    DELETE FROM alumno_planes
    WHERE academia_id = p_academia_id AND plan_cobro_id = p_plan_id;
    GET DIAGNOSTICS v_afectados = ROW_COUNT;
    v_modo := 'migrado';
  ELSE
    -- Sin destino: romper relaciones → alumnos huérfanos (el cron los ignora)
    DELETE FROM alumno_planes
    WHERE academia_id = p_academia_id AND plan_cobro_id = p_plan_id;
    GET DIAGNOSTICS v_afectados = ROW_COUNT;
    v_modo := 'huerfano';
  END IF;

  -- Soft-delete del plan (preserva el Ledger)
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

-- ------------------------------------------------------------------------------
-- 5. Archivar GRUPO (con migración en lote opcional)
--    Nota: los cargos recurrentes son por PLAN, no por grupo; archivar un grupo
--    afecta logística/inscripción, no el motor de cobros.
-- ------------------------------------------------------------------------------
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

    -- Migrar miembros activos al grupo destino (upsert sobre uq_pg_relacion)
    INSERT INTO persona_grupo (academia_id, persona_id, grupo_id, estado, fecha_inscripcion)
    SELECT academia_id, persona_id, p_grupo_id_destino, 'activo', now()
    FROM persona_grupo
    WHERE academia_id = p_academia_id AND grupo_id = p_grupo_id AND estado = 'activo'
    ON CONFLICT (persona_id, grupo_id) DO UPDATE SET estado = 'activo', updated_at = now();

    UPDATE persona_grupo
    SET estado = 'removido', fecha_remocion = now(), updated_at = now()
    WHERE academia_id = p_academia_id AND grupo_id = p_grupo_id AND estado = 'activo';
    GET DIAGNOSTICS v_afectados = ROW_COUNT;
    v_modo := 'migrado';
  ELSE
    -- Sin destino: orfandad (rompe relaciones del grupo)
    UPDATE persona_grupo
    SET estado = 'removido', fecha_remocion = now(), updated_at = now()
    WHERE academia_id = p_academia_id AND grupo_id = p_grupo_id AND estado = 'activo';
    GET DIAGNOSTICS v_afectados = ROW_COUNT;
    v_modo := 'huerfano';
  END IF;

  -- Soft-delete del grupo (reutiliza `estado`)
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
