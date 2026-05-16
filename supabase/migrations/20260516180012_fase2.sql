-- Migración: 012_fase2_refactors
-- Descripción: Optimización de seguridad y encapsulación de creación de cargos (TD-01, TD-04)

-- 1. TD-01: Optimizar can_write_to_academia con un solo JOIN
CREATE OR REPLACE FUNCTION sipra_auth.can_write_to_academia(tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = sipra_auth, public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuario u
    JOIN public.academia a ON a.id = u.academia_id
    JOIN public.suscripcion_academia s ON s.academia_id = u.academia_id
    WHERE u.id             = auth.uid()
      AND u.academia_id    = tenant_id
      AND u.estado         = 'activo'
      AND a.estado_tenant  = 'activa'
      AND s.is_current     = true
      AND s.estado         IN ('trial', 'activa', 'gracia')
  )
  AND tenant_id = sipra_auth.get_my_tenant_id();
$$;

-- 2. TD-04: Encapsular creación de cargo en RPC transaccional
CREATE OR REPLACE FUNCTION public.crear_cargo_v1(
  p_academia_id uuid,
  p_persona_id uuid,
  p_concepto text,
  p_monto_original numeric,
  p_fecha_vencimiento date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_cargo_id uuid;
  v_tl_id uuid;
  v_persona_nombre text;
BEGIN
  -- 1. SEGURIDAD
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  -- 2. VALIDACIONES BÁSICAS
  IF p_monto_original <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a cero' USING ERRCODE = 'MONTO_INVALIDO';
  END IF;

  -- 3. OBTENER PERSONA
  SELECT (nombre || ' ' || COALESCE(apellido, '')) INTO v_persona_nombre
  FROM persona WHERE id = p_persona_id AND academia_id = p_academia_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Persona no encontrada' USING ERRCODE = 'P0002';
  END IF;

  -- 4. INSERTAR CARGO
  INSERT INTO cargo (
    academia_id, persona_id, concepto, monto_original, saldo_pendiente,
    fecha_vencimiento, estado_financiero, origen
  ) VALUES (
    p_academia_id, p_persona_id, p_concepto, p_monto_original, p_monto_original,
    p_fecha_vencimiento, 'pendiente', 'manual'
  ) RETURNING id INTO v_cargo_id;

  -- 5. TIMELINE EVENT
  v_tl_id := gen_random_uuid();
  INSERT INTO evento_timeline (
    id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_nombre, metadata
  ) VALUES (
    v_tl_id, p_academia_id, p_persona_id, 'financiero', 'cargo_generado', 'Cargo Registrado',
    'Se creó manualmente un cargo por $' || p_monto_original || ' (' || p_concepto || ')',
    'Usuario', jsonb_build_object('cargo_id', v_cargo_id, 'monto', p_monto_original)
  );

  RETURN jsonb_build_object(
    'success', true,
    'cargo_id', v_cargo_id,
    'timeline_event_id', v_tl_id
  );
EXCEPTION WHEN OTHERS THEN 
  RAISE;
END;
$$;
