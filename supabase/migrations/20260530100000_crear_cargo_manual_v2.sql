-- ==============================================================================
-- Migración: crear_cargo_manual_v2
-- Descripción: Extiende crear_cargo_manual para soportar `nota_modificacion`
--   obligatoria cuando el operador altera el precio estándar (Motor B/C —
--   inscripciones con descuento, 2x1, etc.). La nota:
--     - se concatena al concepto del cargo (queda visible en el ledger),
--     - se guarda en cargo.metadata->>'nota_modificacion' (auditoría estructurada),
--     - se incluye en el evento_timeline.
--   Mantiene la firma de v1 sin tocar; las llamadas existentes siguen funcionando.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.crear_cargo_manual_v2(
  p_academia_id        uuid,
  p_alumno_id          uuid,
  p_monto              numeric,
  p_concepto           text,
  p_nota_modificacion  text DEFAULT NULL,
  p_fecha_vencimiento  date DEFAULT NULL,
  p_origen             text DEFAULT 'manual'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_actor_id     uuid;
  v_cargo_id     uuid;
  v_concepto     text;
  v_nota         text;
  v_metadata     jsonb;
  v_fecha_venc   date;
BEGIN
  -- 1. SEGURIDAD
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  -- 2. VALIDACIÓN
  IF p_monto <= 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;
  IF char_length(trim(COALESCE(p_concepto, ''))) = 0 THEN
    RAISE EXCEPTION 'CONCEPTO_REQUERIDO' USING ERRCODE = 'P0002';
  END IF;
  IF p_origen NOT IN ('manual','inscripcion','1er mensualidad','ajuste','grupal') THEN
    RAISE EXCEPTION 'ORIGEN_INVALIDO' USING ERRCODE = 'P0002';
  END IF;

  v_actor_id   := sipra_auth.get_my_user_id();
  v_nota       := NULLIF(trim(COALESCE(p_nota_modificacion, '')), '');
  v_fecha_venc := COALESCE(p_fecha_vencimiento, current_date);

  -- 3. CONCATENAR NOTA AL CONCEPTO (rastro de auditoría visible en ledger)
  v_concepto := trim(p_concepto);
  IF v_nota IS NOT NULL THEN
    v_concepto := v_concepto || ' (Nota: ' || v_nota || ')';
  END IF;

  -- 4. METADATA estructurada
  v_metadata := jsonb_build_object(
    'manual',      true,
    'cargo_unico', true
  );
  IF v_nota IS NOT NULL THEN
    v_metadata := v_metadata
      || jsonb_build_object('nota_modificacion', v_nota, 'precio_modificado', true);
  END IF;

  -- 5. INSERT (el trigger trg_cargo_sync_saldo actualiza persona.saldo_acumulado)
  INSERT INTO cargo (
    academia_id, persona_id, concepto, monto_original, saldo_pendiente,
    estado_financiero, fecha_vencimiento, origen, metadata, created_by
  ) VALUES (
    p_academia_id, p_alumno_id, v_concepto, p_monto, p_monto,
    'pendiente', v_fecha_venc, p_origen, v_metadata, v_actor_id
  ) RETURNING id INTO v_cargo_id;

  -- 6. TIMELINE
  INSERT INTO evento_timeline (
    id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
  ) VALUES (
    gen_random_uuid(), p_academia_id, p_alumno_id, 'financiero', 'cargo_generado',
    'Cargo: ' || v_concepto,
    'Cargo manual por $' || p_monto::text
      || CASE WHEN v_nota IS NOT NULL THEN ' — ' || v_nota ELSE '' END,
    v_actor_id,
    jsonb_build_object(
      'monto', p_monto,
      'cargo_id', v_cargo_id,
      'nota_modificacion', v_nota,
      'origen', p_origen
    )
  );

  RETURN jsonb_build_object(
    'success',  true,
    'cargo_id', v_cargo_id,
    'concepto', v_concepto
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.crear_cargo_manual_v2(uuid, uuid, numeric, text, text, date, text) TO authenticated;
