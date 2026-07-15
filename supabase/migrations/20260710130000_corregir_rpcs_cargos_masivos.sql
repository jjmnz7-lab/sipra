-- Migración: 20260710130000_corregir_rpcs_cargos_masivos
-- Descripción: Redefine crear_cargo_grupal_v1 e inscribir_alumno_a_actividad_v1 para usar directamente persona.grupo_id en vez de la tabla puente obsoleta persona_grupo.

BEGIN;

-- 1. Redefinir crear_cargo_grupal_v1
CREATE OR REPLACE FUNCTION public.crear_cargo_grupal_v1(
  p_academia_id    uuid,
  p_grupo_id       uuid,
  p_concepto       text,
  p_monto          numeric,
  p_excluded_persona_ids uuid[],
  p_idempotency_key text,
  p_origen         text DEFAULT 'grupal',
  p_lote_id        text DEFAULT NULL,
  p_aplicar_becas  boolean DEFAULT false
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
  v_cargo_id       uuid;
  v_grupo_nombre   text;
  v_desc_monto     numeric;
  v_neto           numeric;
  v_pct            int;
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

  IF EXISTS (
    SELECT 1 FROM cargo
    WHERE academia_id = p_academia_id
      AND metadata->>'idempotency_key' = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'cargos_creados', 0,
      'idempotent_hit', true,
      'needs_refresh', false
    );
  END IF;

  SELECT nombre INTO v_grupo_nombre FROM grupo WHERE id = p_grupo_id AND academia_id = p_academia_id;

  -- 3. BUCLE SOBRE MIEMBROS ACTIVOS DEL GRUPO (Aplicando Exclusiones)
  FOR v_persona IN
    SELECT p.id AS persona_id, p.beca_activa, p.beca_porcentaje
    FROM persona p
    WHERE p.academia_id = p_academia_id
      AND p.grupo_id = p_grupo_id
      AND p.estado_registro = 'activo'
      AND NOT (p.id = ANY(p_excluded_persona_ids))
    ORDER BY p.id ASC
  LOOP
    v_desc_monto := 0; v_neto := p_monto; v_pct := 0;
    IF p_aplicar_becas AND COALESCE(v_persona.beca_activa, false) AND COALESCE(v_persona.beca_porcentaje, 0) > 0 THEN
      v_pct        := v_persona.beca_porcentaje;
      v_desc_monto := round(p_monto * v_pct / 100.0);
      v_neto       := p_monto - v_desc_monto;
    END IF;

    IF v_neto <= 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM evento_timeline e
        WHERE e.academia_id = p_academia_id
          AND e.persona_id = v_persona.persona_id
          AND e.tipo = 'DESCUENTO'
          AND e.metadata->>'idempotency_key' = p_idempotency_key
      ) THEN
        INSERT INTO evento_timeline (
          id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
        ) VALUES (
          gen_random_uuid(), p_academia_id, v_persona.persona_id, 'FINANZAS', 'DESCUENTO',
          'Beca ' || v_pct || '%',
          p_concepto || ' · exento (−$' || v_desc_monto::int || ')',
          v_actor_id,
          jsonb_build_object(
            'descuento_tipo', 'beca', 'descuento_monto', v_desc_monto,
            'monto_bruto', p_monto, 'beca_porcentaje', v_pct,
            'grupo_id', p_grupo_id, 'idempotency_key', p_idempotency_key, 'exento', true
          )
        );
      END IF;
      CONTINUE;
    END IF;

    INSERT INTO cargo (
      academia_id, persona_id, concepto, monto_original, saldo_pendiente,
      estado_financiero, fecha_vencimiento, origen, metadata
    ) VALUES (
      p_academia_id, v_persona.persona_id, p_concepto, v_neto, v_neto,
      'pendiente', NULL, p_origen,
      jsonb_strip_nulls(jsonb_build_object(
        'generado_grupal', true,
        'grupo_id', p_grupo_id,
        'idempotency_key', p_idempotency_key,
        'lote_id', p_lote_id
      )) || (CASE WHEN v_desc_monto > 0 THEN jsonb_build_object(
        'monto_bruto', p_monto, 'descuento_tipo', 'beca', 'descuento_monto', v_desc_monto,
        'beca_porcentaje', v_pct
      ) ELSE '{}'::jsonb END)
    ) RETURNING id INTO v_cargo_id;

    v_tl_id := gen_random_uuid();
    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_id, metadata
    ) VALUES (
      v_tl_id, p_academia_id, v_persona.persona_id, 'FINANZAS', 'CARGO_MASIVO',
      'Cargo grupal',
      p_concepto || COALESCE(' · ' || v_grupo_nombre, ''),
      v_neto,
      v_actor_id,
      jsonb_build_object(
        'monto', v_neto, 'grupo_id', p_grupo_id, 'cargo_id', v_cargo_id,
        'idempotency_key', p_idempotency_key, 'lote_id', p_lote_id
      )
    );

    v_cargos_creados := v_cargos_creados + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'cargos_creados', v_cargos_creados,
    'idempotent_hit', false,
    'needs_refresh', false
  );
END;
$$;


-- 2. Redefinir inscribir_alumno_a_actividad_v1
CREATE OR REPLACE FUNCTION public.inscribir_alumno_a_actividad_v1(
  p_academia_id uuid,
  p_persona_id  uuid,
  p_grupo_id    uuid,
  p_monto       numeric DEFAULT NULL,
  p_fecha_inscripcion date DEFAULT current_date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_actor_id  uuid;
  v_cargo_id  uuid;
  v_grupo     record;
  v_persona   record;
  v_ya_activo boolean;
  v_monto     numeric;
BEGIN
  -- 1. SEGURIDAD
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  v_actor_id := sipra_auth.get_my_user_id();

  -- 2. VALIDACIÓN DE NEGOCIO
  SELECT id, nombre, es_temporal, estado, costo_actividad INTO v_grupo
  FROM grupo WHERE id = p_grupo_id AND academia_id = p_academia_id;
  IF NOT FOUND OR NOT v_grupo.es_temporal THEN
    RAISE EXCEPTION 'ACTIVIDAD_NO_ENCONTRADA' USING ERRCODE = 'P0002';
  END IF;
  IF v_grupo.estado <> 'activo' THEN
    RAISE EXCEPTION 'ACTIVIDAD_ARCHIVADA' USING ERRCODE = 'P0002';
  END IF;

  SELECT id, estado_registro, grupo_id INTO v_persona
  FROM persona WHERE id = p_persona_id AND academia_id = p_academia_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PERSONA_NO_ENCONTRADA' USING ERRCODE = 'P0002';
  END IF;
  IF v_persona.estado_registro <> 'activo' THEN
    RAISE EXCEPTION 'PERSONA_SUSPENDIDA' USING ERRCODE = 'P0002';
  END IF;

  -- Monto efectivo: editable desde UI; por defecto, el costo de la actividad.
  v_monto := COALESCE(p_monto, v_grupo.costo_actividad, 0);
  IF v_monto < 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;

  v_ya_activo := (COALESCE(v_persona.grupo_id, '00000000-0000-0000-0000-000000000000'::uuid) = p_grupo_id);
  IF v_ya_activo THEN
    RAISE EXCEPTION 'YA_INSCRITO' USING ERRCODE = 'P0002';
  END IF;

  -- 3. LEDGER/RELACIÓN: alta en persona
  UPDATE persona
  SET grupo_id = p_grupo_id
  WHERE id = p_persona_id AND academia_id = p_academia_id;

  -- 4. TIMELINE: evento OPERATIVO de alta en la actividad
  INSERT INTO evento_timeline (
    id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
  ) VALUES (
    gen_random_uuid(), p_academia_id, p_persona_id, 'OPERATIVO', 'INSCRIPCION_ACTIVIDAD',
    'Actividad asignada', v_grupo.nombre, v_actor_id,
    jsonb_build_object('grupo_id', p_grupo_id)
  );

  -- 5. CARGO ÚNICO (si hay monto > 0): sin fecha de vencimiento (no genera mora)
  IF v_monto > 0 THEN
    INSERT INTO cargo (
      academia_id, persona_id, grupo_id_origen, concepto, monto_original, saldo_pendiente,
      estado_financiero, fecha_vencimiento, origen, metadata, created_by
    ) VALUES (
      p_academia_id, p_persona_id, p_grupo_id, v_grupo.nombre, v_monto, v_monto,
      'pendiente', NULL, 'actividad',
      jsonb_build_object('actividad', true, 'cargo_unico', true, 'grupo_id', p_grupo_id),
      v_actor_id
    ) RETURNING id INTO v_cargo_id;

    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_id, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, p_persona_id, 'FINANZAS', 'CARGO_UNICO',
      'Cargo: Actividad',
      v_grupo.nombre,
      v_monto,
      v_actor_id,
      jsonb_build_object('monto', v_monto, 'grupo_id', p_grupo_id, 'cargo_id', v_cargo_id)
    );
  END IF;

  RETURN jsonb_build_object(
    'success',          true,
    'persona_grupo_id', p_persona_id,
    'cargo_id',         v_cargo_id,
    'monto',            v_monto,
    'needs_refresh',    false
  );
END;
$$;

COMMIT;
