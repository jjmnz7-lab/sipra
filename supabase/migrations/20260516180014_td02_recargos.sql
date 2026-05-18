-- Migración: 20260516180014_td02_recargos.sql
-- Descripción: Refactor de procesar_recargos_v1 para usar operaciones SET-based en lugar de bucles PL/pgSQL (TD-02).

CREATE OR REPLACE FUNCTION public.procesar_recargos_v1(
  p_academia_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_config jsonb;
  v_is_active boolean;
  v_escalones jsonb;
  v_recargos_generados integer := 0;
BEGIN
  -- 1. SEGURIDAD (Mantenemos la lógica de Fase 1 con el fix de seguridad)
  IF auth.uid() IS NOT NULL AND NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  -- 2. CARGAR CONFIGURACIÓN
  SELECT config_recargos INTO v_config
  FROM academia
  WHERE id = p_academia_id;

  v_is_active := COALESCE((v_config->>'activo')::boolean, false);
  v_escalones := COALESCE(v_config->'escalones', '[]'::jsonb);

  IF NOT v_is_active OR jsonb_array_length(v_escalones) = 0 THEN
    RETURN jsonb_build_object('success', true, 'recargos_generados', 0, 'message', 'Recargos desactivados o sin escalones');
  END IF;

  -- 3. OPERACIÓN SET-BASED (TD-02)
  -- Insertamos todos los cargos de recargo que correspondan en una sola operación
  -- y luego insertamos sus respectivos eventos en el timeline.
  
  WITH candidate_recargos AS (
    -- Cruzamos cargos vencidos con los escalones de la configuración
    SELECT 
      c.id as cargo_padre_id,
      c.persona_id,
      c.concepto as cargo_concepto,
      c.fecha_vencimiento as fecha_vencimiento_padre,
      (escalon->>'monto')::numeric as monto_recargo,
      (escalon->>'nivel')::integer as escalon_nivel,
      (escalon->>'dias_retraso')::integer as dias_retraso,
      current_date - c.fecha_vencimiento as dias_retraso_actual
    FROM cargo c
    CROSS JOIN jsonb_array_elements(v_escalones) AS escalon
    WHERE c.academia_id = p_academia_id 
      AND c.estado_financiero IN ('vencido', 'parcial')
      AND c.fecha_vencimiento < current_date
      AND (current_date - c.fecha_vencimiento) >= (escalon->>'dias_retraso')::integer
  ),
  filtered_recargos AS (
    -- Filtramos los que ya existen
    SELECT cr.*
    FROM candidate_recargos cr
    WHERE NOT EXISTS (
      SELECT 1 FROM cargo r 
      WHERE r.academia_id = p_academia_id 
        AND r.persona_id = cr.persona_id
        AND r.metadata->>'cargo_padre_id' = cr.cargo_padre_id::text
        AND r.metadata->>'escalon_nivel' = cr.escalon_nivel::text
    )
  ),
  inserted_cargos AS (
    -- Insertamos los nuevos cargos de recargo
    INSERT INTO cargo (
      academia_id, persona_id, concepto, monto_original, saldo_pendiente, 
      estado_financiero, fecha_vencimiento, origen, metadata
    )
    SELECT 
      p_academia_id, 
      fr.persona_id, 
      'Recargo por mora (' || fr.dias_retraso || ' días) - ' || fr.cargo_concepto,
      fr.monto_recargo, 
      fr.monto_recargo,
      'vencido', 
      current_date, 
      'automatizado',
      jsonb_build_object(
        'cargo_padre_id', fr.cargo_padre_id,
        'escalon_nivel', fr.escalon_nivel,
        'fecha_vencimiento_padre', fr.fecha_vencimiento_padre
      )
    FROM filtered_recargos fr
    RETURNING id, persona_id, monto_original, metadata
  ),
  inserted_events AS (
    -- Insertamos los eventos en el timeline para los cargos creados
    INSERT INTO evento_timeline (
      academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_nombre, metadata
    )
    SELECT 
      p_academia_id, 
      ic.persona_id, 
      'financiero', 
      'cargo_generado', 
      'Recargo Aplicado',
      'Se aplicó un recargo automático de $' || ic.monto_original || ' por ' || 
        (current_date - (ic.metadata->>'fecha_vencimiento_padre')::date) || ' días de retraso.',
      'Sistema', 
      jsonb_build_object(
        'cargo_padre_id', ic.metadata->>'cargo_padre_id', 
        'monto_recargo', ic.monto_original
      )
    FROM inserted_cargos ic
    RETURNING id
  )
  -- Contamos cuántos recargos se generaron
  SELECT count(*) INTO v_recargos_generados FROM inserted_cargos;

  RETURN jsonb_build_object(
    'success', true,
    'recargos_generados', v_recargos_generados
  );
EXCEPTION WHEN OTHERS THEN 
  RAISE;
END;
$$;
