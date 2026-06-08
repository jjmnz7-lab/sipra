-- ==============================================================================
-- Migración: registrar_owner_v2
-- Descripción: Onboarding extendido. Igual que registrar_owner_v1 (academia +
--   suscripción trial + usuario owner + claims), pero además recibe la
--   configuración inicial del modelo de negocio:
--     - p_telefono            -> academia.metadata.telefono (contacto)
--     - p_modelo              -> 'simple' | 'avanzado'
--     - p_monto_mensualidad   -> solo modelo simple: crea plan 'Mensualidad General'
--
--   Modelo SIMPLE  : multi_plan_enabled = false, allow_partial_payments = false
--                    + 1 plan_cobro 'Mensualidad General' (frecuencia mensual).
--   Modelo AVANZADO: multi_plan_enabled = true,  allow_partial_payments = true
--                    (el owner crea sus planes después, en Configuración).
--
--   Todo en una sola transacción SECURITY DEFINER para evitar problemas de
--   timing entre la creación de claims del JWT y las políticas RLS.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.registrar_owner_v2(
  p_nombre_academia   text,
  p_nombre_owner      text,
  p_apellido_owner    text    DEFAULT NULL,
  p_telefono          text    DEFAULT NULL,
  p_modelo            text    DEFAULT 'simple',
  p_monto_mensualidad numeric DEFAULT NULL
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
  v_avanzado    boolean;
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

  -- 3. Resolver modelo y metadata
  v_avanzado := (p_modelo = 'avanzado');

  v_tel := NULLIF(trim(COALESCE(p_telefono, '')), '');
  IF v_tel IS NOT NULL THEN
    v_metadata := jsonb_build_object('telefono', v_tel);
  END IF;

  -- 4. Crear Academia con flags del modelo de negocio
  INSERT INTO public.academia (
    id, nombre, estado_tenant, multi_plan_enabled, allow_partial_payments, metadata
  ) VALUES (
    v_academia_id, p_nombre_academia, 'activa',
    v_avanzado,        -- multi_plan_enabled
    v_avanzado,        -- allow_partial_payments (true en avanzado, false en simple)
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

  -- 7. Claims del JWT para las siguientes peticiones
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('academia_id', v_academia_id, 'rol', 'owner', 'claims_version', 1)
  WHERE id = v_user_id;

  -- 8. Modelo simple: crear el plan 'Mensualidad General' (si se indicó monto)
  IF NOT v_avanzado AND p_monto_mensualidad IS NOT NULL AND p_monto_mensualidad > 0 THEN
    INSERT INTO public.planes_cobro (academia_id, nombre, monto, frecuencia)
    VALUES (v_academia_id, 'Mensualidad General', p_monto_mensualidad, 'mensual')
    RETURNING id INTO v_plan_id;
  END IF;

  RETURN jsonb_build_object(
    'success',     true,
    'academia_id', v_academia_id,
    'modelo',      p_modelo,
    'plan_id',     v_plan_id
  );
END;
$$;
