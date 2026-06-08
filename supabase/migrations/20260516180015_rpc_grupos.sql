-- Migración: 015_rpc_grupos
-- Descripción: RPCs operativos para la pantalla de Grupos (cargos, avisos, membresía).

-- ==============================================================================
-- 1. crear_cargo_grupal_v1
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.crear_cargo_grupal_v1(
  p_academia_id    uuid,
  p_grupo_id       uuid,
  p_concepto       text,
  p_monto          numeric,
  p_fecha_vencimiento date,
  p_excluded_persona_ids uuid[],
  p_idempotency_key text,
  p_origen         text DEFAULT 'grupal'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_persona        record;
  v_cargos_creados integer := 0;
  v_tl_id          uuid;
  v_actor_id       uuid;
BEGIN
  -- 1. SEGURIDAD
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  v_actor_id := sipra_auth.get_my_user_id();

  -- 2. VALIDACIONES Y IDEMPOTENCIA
  IF p_monto <= 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;

  -- Comprobar Idempotencia usando metadata de cargo
  IF EXISTS (
    SELECT 1 FROM cargo 
    WHERE academia_id = p_academia_id 
      AND metadata->>'idempotency_key' = p_idempotency_key
  ) THEN
    -- Retornar éxito silente (Idempotent hit)
    RETURN jsonb_build_object(
      'success', true,
      'cargos_creados', 0,
      'idempotent_hit', true,
      'needs_refresh', false
    );
  END IF;

  -- 3. BUCLE SOBRE MIEMBROS ACTIVOS DEL GRUPO (Aplicando Exclusiones)
  FOR v_persona IN 
    SELECT pg.persona_id
    FROM persona_grupo pg
    JOIN persona p ON p.id = pg.persona_id
    WHERE pg.academia_id = p_academia_id
      AND pg.grupo_id = p_grupo_id
      AND pg.estado = 'activo'
      AND p.estado_registro = 'activo'
      AND NOT (pg.persona_id = ANY(p_excluded_persona_ids))
    ORDER BY pg.persona_id ASC
  LOOP
    -- INSERTAR CARGO INDIVIDUAL
    INSERT INTO cargo (
      academia_id, persona_id, concepto, monto_original, saldo_pendiente,
      estado_financiero, fecha_vencimiento, origen, metadata
    ) VALUES (
      p_academia_id, v_persona.persona_id, p_concepto, p_monto, p_monto,
      'pendiente', p_fecha_vencimiento, p_origen,
      jsonb_build_object(
        'generado_grupal', true, 
        'grupo_id', p_grupo_id, 
        'idempotency_key', p_idempotency_key
      )
    );

    -- TIMELINE: Evento inyectado de forma atómica en la transacción
    v_tl_id := gen_random_uuid();
    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
    ) VALUES (
      v_tl_id, p_academia_id, v_persona.persona_id, 'financiero', 'cargo_generado',
      'Cargo grupal generado: ' || p_concepto,
      'Se generó un cargo de $' || p_monto::text,
      v_actor_id,
      jsonb_build_object('monto', p_monto, 'grupo_id', p_grupo_id)
    );

    v_cargos_creados := v_cargos_creados + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'cargos_creados', v_cargos_creados,
    'idempotent_hit', false,
    'needs_refresh', true
  );
EXCEPTION WHEN OTHERS THEN 
  RAISE;
END;
$$;

-- ==============================================================================
-- 2. agregar_persona_a_grupo_v1
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.agregar_persona_a_grupo_v1(
  p_academia_id uuid,
  p_grupo_id    uuid,
  p_persona_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_rel_id uuid;
  v_estado text;
BEGIN
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  SELECT id, estado INTO v_rel_id, v_estado
  FROM persona_grupo
  WHERE academia_id = p_academia_id AND grupo_id = p_grupo_id AND persona_id = p_persona_id;

  IF FOUND THEN
    IF v_estado = 'removido' THEN
      UPDATE persona_grupo SET estado = 'activo', updated_at = now() WHERE id = v_rel_id;
    END IF;
  ELSE
    INSERT INTO persona_grupo (academia_id, grupo_id, persona_id, estado)
    VALUES (p_academia_id, p_grupo_id, p_persona_id, 'activo');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ==============================================================================
-- 3. remover_persona_de_grupo_v1
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.remover_persona_de_grupo_v1(
  p_academia_id uuid,
  p_grupo_id    uuid,
  p_persona_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
BEGIN
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  UPDATE persona_grupo 
  SET estado = 'removido', fecha_remocion = now(), updated_at = now()
  WHERE academia_id = p_academia_id AND grupo_id = p_grupo_id AND persona_id = p_persona_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ==============================================================================
-- 4. crear_aviso_grupal_v1
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.crear_aviso_grupal_v1(
  p_academia_id uuid,
  p_grupo_id    uuid,
  p_titulo      text,
  p_descripcion text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_persona record;
  v_actor_id uuid;
BEGIN
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  v_actor_id := sipra_auth.get_my_user_id();

  FOR v_persona IN 
    SELECT pg.persona_id FROM persona_grupo pg
    JOIN persona p ON p.id = pg.persona_id
    WHERE pg.academia_id = p_academia_id AND pg.grupo_id = p_grupo_id AND pg.estado = 'activo' AND p.estado_registro = 'activo'
  LOOP
    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, v_persona.persona_id, 'operativo', 'aviso_grupal',
      p_titulo, p_descripcion, v_actor_id,
      jsonb_build_object('grupo_id', p_grupo_id)
    );
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;
