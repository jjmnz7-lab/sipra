-- Migración: 006_rpc_onboarding
-- Descripción: Creación de RPC para inicializar un tenant (Academia + Suscripción Trial + Usuario Owner).

CREATE OR REPLACE FUNCTION public.registrar_owner_v1(
  p_nombre_academia text,
  p_nombre_owner text,
  p_apellido_owner text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth, auth
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_academia_id uuid := gen_random_uuid();
BEGIN
  -- 1. Identificar usuario desde el auth token
  v_user_id := auth.uid();
  v_email := auth.jwt() ->> 'email';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NO_AUTENTICADO' USING ERRCODE = 'P0001';
  END IF;

  -- 2. Validar que no tenga ya un usuario creado
  IF EXISTS (SELECT 1 FROM public.usuario WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'USUARIO_YA_REGISTRADO' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Crear Academia
  INSERT INTO public.academia (id, nombre, estado_tenant)
  VALUES (v_academia_id, p_nombre_academia, 'activa');

  -- 4. Crear Suscripción (Trial 14 días)
  INSERT INTO public.suscripcion_academia (
    academia_id, plan_codigo, estado, is_current, 
    precio_mensual, fecha_inicio, fecha_fin, trial_ends_at
  ) VALUES (
    v_academia_id, 'trial', 'trial', true, 
    0, now(), now() + interval '14 days', now() + interval '14 days'
  );

  -- 5. Crear Usuario (Owner)
  INSERT INTO public.usuario (id, academia_id, nombre, apellido, email_snapshot, rol, estado)
  VALUES (v_user_id, v_academia_id, p_nombre_owner, p_apellido_owner, v_email, 'owner', 'activo');

  -- 6. Actualizar claims del JWT en auth.users para que las futuras peticiones tengan los permisos correctos
  UPDATE auth.users 
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('academia_id', v_academia_id, 'rol', 'owner', 'claims_version', 1)
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'academia_id', v_academia_id
  );
END;
$$;
