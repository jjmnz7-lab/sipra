-- Migración: 20260715020000_flujo_invitacion
-- Descripción: Flujo de onboarding por invitación para dueños de academia.

CREATE OR REPLACE FUNCTION public.validar_invitacion_academia_v1(
  p_token text,
  p_ip text DEFAULT NULL,
  p_device text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_inv record;
  v_ac record;
BEGIN
  -- Buscar invitación
  SELECT * INTO v_inv
  FROM public.invitacion_academia
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NOT_FOUND',
      'message', 'Enlace de invitación no encontrado.'
    );
  END IF;

  IF v_inv.status = 'utilizada' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ALREADY_USED',
      'message', 'Esta invitación ya fue utilizada.'
    );
  END IF;

  IF v_inv.status = 'cancelada' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CANCELLED',
      'message', 'Esta invitación ha sido cancelada.'
    );
  END IF;

  IF v_inv.status = 'expirada' OR v_inv.expires_at <= now() THEN
    -- Actualizar estado si ya expiró por tiempo
    IF v_inv.status = 'pendiente' THEN
      UPDATE public.invitacion_academia
      SET status = 'expirada'
      WHERE id = v_inv.id;
    END IF;
    
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'EXPIRED',
      'message', 'Esta invitación ha expirado.'
    );
  END IF;

  -- Registrar apertura si no se había registrado
  IF v_inv.opened_at IS NULL THEN
    UPDATE public.invitacion_academia
    SET
      opened_at = now(),
      opened_ip = p_ip,
      opened_device = p_device
    WHERE id = v_inv.id;
  END IF;

  -- Obtener datos de la academia
  SELECT id, nombre, config_cobro, metadata
  INTO v_ac
  FROM public.academia
  WHERE id = v_inv.academia_id;

  RETURN jsonb_build_object(
    'success', true,
    'academia_id', v_ac.id,
    'nombre', v_ac.nombre,
    'telefono', v_ac.metadata ->> 'telefono',
    'plan_codigo', COALESCE((SELECT plan_codigo FROM public.suscripcion_academia WHERE academia_id = v_ac.id ORDER BY created_at DESC LIMIT 1), 'trial')
  );
END;
$$;


DROP FUNCTION IF EXISTS public.completar_invitacion_academia_v1(
  text, uuid, text, text, text, text, numeric, jsonb, boolean, integer, text, boolean, boolean, text, text
);

CREATE OR REPLACE FUNCTION public.completar_invitacion_academia_v1(
  p_token text,
  p_user_id uuid,
  p_nombre_owner text,
  p_apellido_owner text DEFAULT NULL,
  p_nombre_academia text DEFAULT NULL,
  p_telefono text DEFAULT NULL,
  p_plan_nombre text DEFAULT 'Mensualidad Regular',
  p_plan_monto numeric DEFAULT 300,
  p_meses_sin_cobro jsonb DEFAULT '[]'::jsonb,
  p_critico_activo boolean DEFAULT false,
  p_critico_dia integer DEFAULT 10,
  p_regimen_alta text DEFAULT 'completo',
  p_allow_partial boolean DEFAULT true,
  p_allow_overpayment boolean DEFAULT true,
  p_opened_ip text DEFAULT NULL,
  p_opened_device text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth, auth
AS $$
DECLARE
  v_inv record;
  v_email text;
  v_plan_id uuid;
BEGIN
  -- 1. Revalidar invitación con LOCK (FOR UPDATE)
  SELECT * INTO v_inv
  FROM public.invitacion_academia
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVITACION_NO_ENCONTRADA' USING ERRCODE = 'P0001';
  END IF;

  IF v_inv.status <> 'pendiente' THEN
    RAISE EXCEPTION 'INVITACION_YA_PROCESADA' USING ERRCODE = 'P0002';
  END IF;

  IF v_inv.expires_at <= now() THEN
    UPDATE public.invitacion_academia SET status = 'expirada' WHERE id = v_inv.id;
    RAISE EXCEPTION 'INVITACION_EXPIRADA' USING ERRCODE = 'P0003';
  END IF;

  -- 2. Validar usuario auth e impedir duplicidad
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'USUARIO_AUTH_INEXISTENTE' USING ERRCODE = 'P0004';
  END IF;

  IF EXISTS (SELECT 1 FROM public.usuario WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'USUARIO_YA_REGISTRADO' USING ERRCODE = 'P0005';
  END IF;

  -- Bloquear academia para update seguro
  PERFORM 1 FROM public.academia WHERE id = v_inv.academia_id FOR UPDATE;

  -- 3. UPDATE academia
  UPDATE public.academia
  SET
    nombre = COALESCE(NULLIF(trim(p_nombre_academia), ''), nombre),
    estado_tenant = 'prueba',
    allow_partial_payments = p_allow_partial,
    allow_overpayment = p_allow_overpayment,
    config_cobro = jsonb_build_object(
      'regimen_alta', p_regimen_alta,
      'proporcional_redondeo', '1',
      'reglas_dias', '[{"dia_inicio": 1, "dia_fin": 5, "accion": "completo"}, {"dia_inicio": 6, "dia_fin": "fin_mes", "accion": "proporcional"}]'::jsonb,
      'modo_prorrateo', CASE WHEN p_regimen_alta = 'completo' THEN 'completo' ELSE 'proporcional' END,
      'meses_sin_cobro', p_meses_sin_cobro,
      'dias_generacion', '[1]'::jsonb,
      'horas_minimas_recordatorio', 48
    ),
    config_recargos = jsonb_build_object(
      'marcar_critico', jsonb_build_object('activo', p_critico_activo, 'dia_umbral', p_critico_dia),
      'aplicar_recargos', false,
      'reglas', '[]'::jsonb
    ),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('telefono', p_telefono)
  WHERE id = v_inv.academia_id;

  -- 4. Crear Suscripción (Trial 14 días)
  UPDATE public.suscripcion_academia
  SET is_current = false
  WHERE academia_id = v_inv.academia_id;

  INSERT INTO public.suscripcion_academia (
    academia_id, plan_codigo, estado, is_current,
    precio_mensual, fecha_inicio, fecha_fin, trial_ends_at
  ) VALUES (
    v_inv.academia_id, 'trial', 'trial', true,
    0, now(), now() + interval '14 days', now() + interval '14 days'
  );

  -- 5. Crear Usuario (Owner)
  INSERT INTO public.usuario (id, academia_id, nombre, apellido, email_snapshot, rol, estado)
  VALUES (p_user_id, v_inv.academia_id, p_nombre_owner, p_apellido_owner, v_email, 'owner', 'activo');

  -- 6. Claims del JWT
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('academia_id', v_inv.academia_id, 'rol', 'owner', 'claims_version', 1)
  WHERE id = p_user_id;

  -- 7. Crear primer plan de cobro
  IF p_plan_nombre IS NOT NULL AND p_plan_monto IS NOT NULL AND p_plan_monto >= 0 THEN
    INSERT INTO public.planes_cobro (academia_id, nombre, monto, frecuencia)
    VALUES (v_inv.academia_id, p_plan_nombre, p_plan_monto, 'mensual')
    RETURNING id INTO v_plan_id;
  END IF;

  -- 8. Marcar invitación como utilizada
  UPDATE public.invitacion_academia
  SET
    status = 'utilizada',
    opened_at = COALESCE(opened_at, now()),
    opened_ip = COALESCE(opened_ip, p_opened_ip),
    opened_device = COALESCE(opened_device, p_opened_device)
  WHERE id = v_inv.id;

  RETURN jsonb_build_object(
    'success', true,
    'academia_id', v_inv.academia_id,
    'plan_id', v_plan_id
  );
END;
$$;
