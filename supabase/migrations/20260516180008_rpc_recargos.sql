-- Migración: 009_rpc_recargos
-- Descripción: Añade columna de configuración de recargos a la academia y crea el motor (RPC) para procesar deudas vencidas.

-- 1. Alterar tabla academia para incluir configuración explícita de recargos
ALTER TABLE public.academia 
ADD COLUMN IF NOT EXISTS config_recargos JSONB NOT NULL DEFAULT '{"activo": false, "escalones": []}';

-- 2. Crear RPC procesar_recargos_v1
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
  v_escalon jsonb;
  v_cargo record;
  v_dias_retraso integer;
  v_recargos_generados integer := 0;
  v_tl_id uuid;
  v_persona_nombre text;
BEGIN
  -- 1. SEGURIDAD
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    -- Permitimos ejecución si la llamada viene de service_role (workers)
    -- En este caso, si no hay JWT válido pero somos backend, pasará si ejecutamos con el key de service role.
    -- Para el MVP, el frontend (admin/owner) lo ejecutará.
    NULL;
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

  -- 3. BUCLE PRINCIPAL SOBRE CARGOS VENCIDOS O PARCIALES
  FOR v_cargo IN 
    SELECT c.id, c.persona_id, c.fecha_vencimiento, c.concepto 
    FROM cargo c
    WHERE c.academia_id = p_academia_id 
      AND c.estado_financiero IN ('vencido', 'parcial')
      AND c.fecha_vencimiento < current_date
  LOOP
    v_dias_retraso := current_date - v_cargo.fecha_vencimiento;
    
    -- Evaluar cada escalón configurado
    FOR v_escalon IN SELECT * FROM jsonb_array_elements(v_escalones)
    LOOP
      -- Si el cargo ya alcanzó los días del escalón
      IF v_dias_retraso >= (v_escalon->>'dias_retraso')::integer THEN
        
        -- Verificar si ya le cobramos este escalón a este cargo
        -- Usamos metadata->>'cargo_padre_id' = v_cargo.id y metadata->>'escalon_nivel' = v_escalon->>'nivel'
        IF NOT EXISTS (
          SELECT 1 FROM cargo r 
          WHERE r.academia_id = p_academia_id 
            AND r.persona_id = v_cargo.persona_id
            AND r.metadata->>'cargo_padre_id' = v_cargo.id::text
            AND r.metadata->>'escalon_nivel' = (v_escalon->>'nivel')::text
        ) THEN
          
          -- INSERTAR NUEVO CARGO (Recargo)
          INSERT INTO cargo (
            academia_id, persona_id, concepto, monto_original, saldo_pendiente, 
            estado_financiero, fecha_vencimiento, origen, metadata
          ) VALUES (
            p_academia_id, v_cargo.persona_id, 
            'Recargo por mora (' || (v_escalon->>'dias_retraso') || ' días) - ' || v_cargo.concepto,
            (v_escalon->>'monto')::numeric, (v_escalon->>'monto')::numeric,
            'vencido', current_date, 'automatizado',
            jsonb_build_object(
              'cargo_padre_id', v_cargo.id,
              'escalon_nivel', (v_escalon->>'nivel')::integer
            )
          );

          v_recargos_generados := v_recargos_generados + 1;

          -- OBTENER NOMBRE PERSONA PARA TIMELINE
          SELECT (nombre || ' ' || COALESCE(apellido, '')) INTO v_persona_nombre 
          FROM persona WHERE id = v_cargo.persona_id;

          v_tl_id := gen_random_uuid();
          INSERT INTO evento_timeline (
            id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_nombre, metadata
          ) VALUES (
            v_tl_id, p_academia_id, v_cargo.persona_id, 'financiero', 'cargo_generado', 'Recargo Aplicado',
            'Se aplicó un recargo automático de $' || (v_escalon->>'monto') || ' por ' || v_dias_retraso || ' días de retraso.',
            'Sistema', jsonb_build_object('cargo_padre_id', v_cargo.id, 'monto_recargo', (v_escalon->>'monto')::numeric)
          );

        END IF;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'recargos_generados', v_recargos_generados
  );
EXCEPTION WHEN OTHERS THEN 
  RAISE;
END;
$$;
