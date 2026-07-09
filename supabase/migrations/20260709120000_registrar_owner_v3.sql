-- Migración: registrar_owner_v3
-- Timestamp: 20260709120000
-- Descripción: Registro de nueva academia con planes, recargos y políticas simplificadas en un flujo atómico.

CREATE OR REPLACE FUNCTION public.registrar_owner_v3(
  p_nombre_academia   text,
  p_nombre_owner      text,
  p_apellido_owner    text    DEFAULT NULL,
  p_telefono          text    DEFAULT NULL,
  p_plan_nombre       text    DEFAULT 'Mensualidad Regular',
  p_plan_monto        numeric DEFAULT 300,
  p_meses_sin_cobro   jsonb   DEFAULT '[]'::jsonb,
  p_critico_activo    boolean DEFAULT false,
  p_critico_dia       integer DEFAULT 10,
  p_regimen_alta      text    DEFAULT 'completo',
  p_allow_partial     boolean DEFAULT true,
  p_allow_overpayment boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth, auth
AS $$
DECLARE
  v_user_id     uuid;
  v_email       text;
  v_academia_id uuid := gen_random_uuid();
  v_metadata    jsonb := '{}'::jsonb;
  v_plan_id     uuid;
  v_tel         text;
BEGIN
  -- 1. Identificar usuario desde el auth token
  v_user_id := auth.uid();
  v_email   := auth.jwt() ->> 'email';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NO_AUTENTICADO' USING ERRCODE = 'P0001';
  END IF;

  -- 2. Validar que no tenga ya un usuario creado
  IF EXISTS (SELECT 1 FROM public.usuario WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'USUARIO_YA_REGISTRADO' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Resolver metadata
  v_tel := NULLIF(trim(COALESCE(p_telefono, '')), '');
  IF v_tel IS NOT NULL THEN
    v_metadata := jsonb_build_object('telefono', v_tel);
  END IF;

  -- 4. Crear Academia con flags y "Smart Defaults"
  INSERT INTO public.academia (
    id,
    nombre,
    estado_tenant,
    multi_plan_enabled,
    allow_partial_payments,
    allow_overpayment,
    config_cobro,
    config_recargos,
    metadata
  ) VALUES (
    v_academia_id,
    p_nombre_academia,
    'activa',
    true, -- Soporte para multi-planes activo globalmente
    p_allow_partial,
    p_allow_overpayment,
    jsonb_build_object(
      'regimen_alta', p_regimen_alta,
      'proporcional_redondeo', '1',
      'reglas_dias', '[{"dia_inicio": 1, "dia_fin": 5, "accion": "completo"}, {"dia_inicio": 6, "dia_fin": "fin_mes", "accion": "proporcional"}]'::jsonb,
      'modo_prorrateo', CASE WHEN p_regimen_alta = 'completo' THEN 'completo' ELSE 'proporcional' END,
      'meses_sin_cobro', p_meses_sin_cobro,
      'dias_generacion', '[1]'::jsonb,
      'horas_minimas_recordatorio', 48
    ),
    jsonb_build_object(
      'marcar_critico', jsonb_build_object('activo', p_critico_activo, 'dia_umbral', p_critico_dia),
      'aplicar_recargos', false,
      'reglas', '[]'::jsonb
    ),
    v_metadata
  );

  -- 5. Crear Suscripción (Trial 14 días)
  INSERT INTO public.suscripcion_academia (
    academia_id, plan_codigo, estado, is_current,
    precio_mensual, fecha_inicio, fecha_fin, trial_ends_at
  ) VALUES (
    v_academia_id, 'trial', 'trial', true,
    0, now(), now() + interval '14 days', now() + interval '14 days'
  );

  -- 6. Crear Usuario (Owner)
  INSERT INTO public.usuario (id, academia_id, nombre, apellido, email_snapshot, rol, estado)
  VALUES (v_user_id, v_academia_id, p_nombre_owner, p_apellido_owner, v_email, 'owner', 'activo');

  -- 7. Claims del JWT para RLS
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('academia_id', v_academia_id, 'rol', 'owner', 'claims_version', 1)
  WHERE id = v_user_id;

  -- 8. Crear primer plan de cobro base
  IF p_plan_nombre IS NOT NULL AND p_plan_monto IS NOT NULL AND p_plan_monto >= 0 THEN
    INSERT INTO public.planes_cobro (academia_id, nombre, monto, frecuencia)
    VALUES (v_academia_id, p_plan_nombre, p_plan_monto, 'mensual')
    RETURNING id INTO v_plan_id;
  END IF;

  RETURN jsonb_build_object(
    'success',     true,
    'academia_id', v_academia_id,
    'plan_id',     v_plan_id
  );
END;
$$;

-- DOWN
-- DROP FUNCTION IF EXISTS public.registrar_owner_v3(text, text, text, text, text, numeric, jsonb, boolean, integer, text, boolean, boolean);
