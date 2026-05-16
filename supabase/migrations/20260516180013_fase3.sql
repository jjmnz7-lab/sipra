-- Migración: 013_fase3_optimizations
-- Descripción: RPC para KPIs del dashboard y optimización de recargos (TD-06, TD-07, TD-02)

-- 1. RPC para KPIs del Dashboard (TD-06, TD-07)
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis_v1(
  p_academia_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_timezone text;
  v_mes_inicio timestamptz;
  v_total_ingresos numeric;
  v_total_deuda_vencida numeric;
  v_cant_alumnos integer;
  v_cant_avisos integer;
  v_top_deudores jsonb;
BEGIN
  -- 1. SEGURIDAD
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  -- 2. OBTENER TIMEZONE
  SELECT timezone INTO v_timezone FROM academia WHERE id = p_academia_id;
  
  -- 3. CALCULAR INICIO DE MES EN EL TIMEZONE DE LA ACADEMIA
  v_mes_inicio := date_trunc('month', now() AT TIME ZONE v_timezone) AT TIME ZONE v_timezone;

  -- 4. INGRESOS DEL MES
  SELECT COALESCE(SUM(monto_total), 0) INTO v_total_ingresos
  FROM movimiento
  WHERE academia_id = p_academia_id
    AND estado = 'registrado'
    AND fecha_pago >= v_mes_inicio;

  -- 5. DEUDA VENCIDA TOTAL
  SELECT COALESCE(SUM(saldo_pendiente), 0) INTO v_total_deuda_vencida
  FROM cargo
  WHERE academia_id = p_academia_id
    AND estado_financiero = 'vencido';

  -- 6. ALUMNOS ACTIVOS
  SELECT COUNT(*) INTO v_cant_alumnos
  FROM persona
  WHERE academia_id = p_academia_id
    AND etiqueta = 'alumno'
    AND estado_registro = 'activo';

  -- 7. AVISOS PENDIENTES
  SELECT COUNT(*) INTO v_cant_avisos
  FROM envio_sugerido
  WHERE academia_id = p_academia_id
    AND estado = 'pendiente_revision';

  -- 8. TOP DEUDORES
  SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) INTO v_top_deudores FROM (
    SELECT c.persona_id, SUM(c.saldo_pendiente) as total, 
           jsonb_build_object('nombre', p.nombre, 'apellido', p.apellido, 'telefono_whatsapp', p.telefono_whatsapp) as persona
    FROM cargo c
    JOIN persona p ON p.id = c.persona_id
    WHERE c.academia_id = p_academia_id
      AND c.estado_financiero = 'vencido'
    GROUP BY c.persona_id, p.nombre, p.apellido, p.telefono_whatsapp
    ORDER BY total DESC
    LIMIT 5
  ) d;

  RETURN jsonb_build_object(
    'total_ingresos', v_total_ingresos,
    'total_deuda_vencida', v_total_deuda_vencida,
    'cant_alumnos', v_cant_alumnos,
    'cant_avisos', v_cant_avisos,
    'top_deudores', v_top_deudores
  );
END;
$$;

-- 2. Optimización de procesar_recargos_v1 (TD-02)
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
BEGIN
  -- 1. SEGURIDAD
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

  -- 3. BUCLE PRINCIPAL OPTIMIZADO (TD-02: JOIN al inicio)
  FOR v_cargo IN 
    SELECT c.id, c.persona_id, c.fecha_vencimiento, c.concepto,
           (p.nombre || ' ' || COALESCE(p.apellido, '')) AS persona_nombre
    FROM cargo c
    JOIN persona p ON p.id = c.persona_id
    WHERE c.academia_id = p_academia_id 
      AND c.estado_financiero IN ('vencido', 'parcial')
      AND c.fecha_vencimiento < current_date
  LOOP
    v_dias_retraso := current_date - v_cargo.fecha_vencimiento;
    
    FOR v_escalon IN SELECT * FROM jsonb_array_elements(v_escalones)
    LOOP
      IF v_dias_retraso >= (v_escalon->>'dias_retraso')::integer THEN
        IF NOT EXISTS (
          SELECT 1 FROM cargo r 
          WHERE r.academia_id = p_academia_id 
            AND r.persona_id = v_cargo.persona_id
            AND r.metadata->>'cargo_padre_id' = v_cargo.id::text
            AND r.metadata->>'escalon_nivel' = (v_escalon->>'nivel')::text
        ) THEN
          
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

          -- Ya no hacemos SELECT de persona aquí (TD-02)

          v_tl_id := gen_random_uuid();
          INSERT INTO evento_timeline (
            id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_nombre, metadata
          ) VALUES (
            v_tl_id, p_academia_id, v_cargo.persona_id, 'financiero', 'cargo_generado', 'Recargo Aplicado',
            'Se aplicó un recargo automático de $' || (v_escalon->>'monto') || ' por ' || v_dias_retraso || ' días de retraso a ' || v_cargo.persona_nombre || '.',
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
