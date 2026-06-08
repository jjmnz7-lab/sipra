-- ==============================================================================
-- calcular_cargo_inscripcion_v1 v2: soporta regimen_alta + redondeo + reglas_dias.
--
-- Esquema esperado en academia.config_cobro:
--   {
--     "regimen_alta": "completo" | "proporcional" | "no_cobrar" | "reglas_dias",
--     "proporcional_redondeo": "ninguno" | "1" | "5" | "10" | "50" | "100",
--     "reglas_dias": [ { "dia_inicio": int, "dia_fin": int|"fin_mes", "accion": text }, ... ],
--     "modo_prorrateo": "completo" | "proporcional"   -- legacy fallback
--   }
--
-- Mantiene el shape de salida existente (monto_mensualidad_calculado,
-- monto_inscripcion_calculado, fecha_vencimiento, etc.) para no romper a los
-- consumidores actuales (crear-persona-drawer, generar-mensualidades-drawer).
-- Agrega 'regimen_aplicado' y 'regla_aplicada' como info de debug.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.calcular_cargo_inscripcion_v1(
  p_grupo_id          uuid,
  p_fecha_inscripcion date DEFAULT current_date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_grupo            record;
  v_config           jsonb;
  v_regimen          text;
  v_redondeo_str     text;
  v_redondeo         int;
  v_cobra_insc       boolean;
  v_dias_mes         int;
  v_dia_inscripcion  int;
  v_dias_restantes   int;
  v_monto_mens       numeric;
  v_monto_insc       numeric;
  v_fecha_venc       date;
  v_regla            jsonb;
  v_regla_match      jsonb := NULL;
  v_accion           text;
  v_dia_fin_eval     int;
BEGIN
  SELECT id, academia_id, costo_mensualidad, costo_inscripcion
    INTO v_grupo
  FROM grupo
  WHERE id = p_grupo_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'GRUPO_NO_ENCONTRADO' USING ERRCODE = 'P0002';
  END IF;

  IF NOT sipra_auth.is_auth_user_for_tenant(v_grupo.academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  SELECT config_cobro INTO v_config FROM academia WHERE id = v_grupo.academia_id;

  -- Régimen: nuevo formato → fallback al legacy modo_prorrateo → default proporcional.
  v_regimen := COALESCE(
    v_config->>'regimen_alta',
    CASE v_config->>'modo_prorrateo'
      WHEN 'completo'     THEN 'completo'
      WHEN 'proporcional' THEN 'proporcional'
      ELSE 'proporcional'
    END
  );

  v_redondeo_str := COALESCE(v_config->>'proporcional_redondeo', 'ninguno');
  v_redondeo := CASE v_redondeo_str
    WHEN 'ninguno' THEN 0
    ELSE v_redondeo_str::int
  END;

  v_cobra_insc := COALESCE((v_config->>'cobra_inscripcion')::boolean, false);

  -- Calendario
  v_dias_mes       := EXTRACT(day FROM (date_trunc('month', p_fecha_inscripcion) + interval '1 month - 1 day'))::int;
  v_dia_inscripcion:= EXTRACT(day FROM p_fecha_inscripcion)::int;
  v_dias_restantes := v_dias_mes - v_dia_inscripcion + 1;
  v_fecha_venc     := (date_trunc('month', p_fecha_inscripcion) + interval '1 month - 1 day')::date;

  -- Si el régimen es reglas_dias, ubicar la regla que contiene v_dia_inscripcion
  -- y reescribir v_regimen a la acción correspondiente para reutilizar la lógica.
  IF v_regimen = 'reglas_dias' THEN
    FOR v_regla IN SELECT * FROM jsonb_array_elements(COALESCE(v_config->'reglas_dias', '[]'::jsonb))
    LOOP
      v_dia_fin_eval := CASE
        WHEN v_regla->>'dia_fin' = 'fin_mes' THEN v_dias_mes
        ELSE (v_regla->>'dia_fin')::int
      END;
      IF v_dia_inscripcion BETWEEN (v_regla->>'dia_inicio')::int AND v_dia_fin_eval THEN
        v_regla_match := v_regla;
        EXIT;
      END IF;
    END LOOP;

    IF v_regla_match IS NOT NULL THEN
      v_accion := v_regla_match->>'accion';
    ELSE
      v_accion := 'completo';
    END IF;
  ELSE
    v_accion := v_regimen;
  END IF;

  -- Mensualidad: aplicar la acción resuelta
  IF v_grupo.costo_mensualidad IS NULL OR v_grupo.costo_mensualidad = 0 THEN
    v_monto_mens := 0;
  ELSIF v_accion = 'no_cobrar' THEN
    v_monto_mens := 0;
    -- Cargo del próximo mes: día 1 del siguiente mes
    v_fecha_venc := (date_trunc('month', p_fecha_inscripcion) + interval '1 month')::date;
  ELSIF v_accion = 'proporcional' THEN
    v_monto_mens := round(v_grupo.costo_mensualidad * v_dias_restantes::numeric / v_dias_mes::numeric, 2);
    -- Redondeo al múltiplo configurado (sólo aplica si la acción es proporcional y redondeo > 0).
    IF v_redondeo IS NOT NULL AND v_redondeo > 0 THEN
      v_monto_mens := round(v_monto_mens / v_redondeo) * v_redondeo;
    END IF;
  ELSE  -- 'completo' (o cualquier valor desconocido cae aquí)
    v_monto_mens := v_grupo.costo_mensualidad;
  END IF;

  -- Inscripción (sin cambios respecto a v1)
  IF v_cobra_insc AND v_grupo.costo_inscripcion IS NOT NULL AND v_grupo.costo_inscripcion > 0 THEN
    v_monto_insc := v_grupo.costo_inscripcion;
  ELSE
    v_monto_insc := 0;
  END IF;

  RETURN jsonb_build_object(
    'costo_mensualidad_grupo',     COALESCE(v_grupo.costo_mensualidad, 0),
    'costo_inscripcion_grupo',     COALESCE(v_grupo.costo_inscripcion, 0),
    'modo_prorrateo',              CASE WHEN v_accion = 'proporcional' THEN 'proporcional' ELSE 'completo' END,
    'cobra_inscripcion',           v_cobra_insc,
    'dias_mes',                    v_dias_mes,
    'dias_restantes',              v_dias_restantes,
    'monto_mensualidad_calculado', v_monto_mens,
    'monto_inscripcion_calculado', v_monto_insc,
    'fecha_vencimiento',           v_fecha_venc,
    'regimen_aplicado',            v_regimen,
    'accion_aplicada',             v_accion,
    'regla_aplicada',              v_regla_match
  );
END;
$$;
