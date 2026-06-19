-- ==============================================================================
-- fix_rpc_historial: Correcciones al RPC obtener_historial_publico_v1(text)
-- introducido en 20260617000000_share_code_corto.sql.
--
-- Errores corregidos:
--   1) academia.logo_url no existe → metadata->>'logo_url'
--   2) vista movimiento_disponible no existe → SUM(monto_disponible) FROM movimiento
--   3) 'urgente' no es valor válido de estado_financiero → 'parcial'
--   4) movimientos consultados de tabla movimiento (campos incorrectos)
--      → deben venir de evento_timeline (igual que la versión con p_token)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.obtener_historial_publico_v1(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _per    RECORD;
  _aca    RECORD;
  _cargos jsonb;
  _movs   jsonb;
BEGIN
  IF p_code IS NULL OR length(p_code) <> 6 THEN
    RETURN jsonb_build_object('disponible', false);
  END IF;

  SELECT p.id, p.nombre, p.apellido, p.academia_id,
         p.share_link_bloqueado, p.estado_registro
  INTO _per
  FROM public.persona p
  WHERE p.share_code = p_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('disponible', false);
  END IF;

  IF _per.share_link_bloqueado OR _per.estado_registro <> 'activo' THEN
    RETURN jsonb_build_object('disponible', false);
  END IF;

  -- logo_url vive en metadata, no es columna directa
  SELECT a.nombre, a.metadata->>'logo_url' AS logo_url
  INTO _aca
  FROM public.academia a
  WHERE a.id = _per.academia_id;

  -- Cargos activos para el semáforo; 'urgente' no existe → usar 'parcial'
  SELECT jsonb_agg(
    jsonb_build_object(
      'concepto',          c.concepto,
      'estado_financiero', c.estado_financiero,
      'fecha_vencimiento', c.fecha_vencimiento
    ) ORDER BY c.fecha_vencimiento NULLS LAST
  )
  INTO _cargos
  FROM public.cargo c
  WHERE c.persona_id = _per.id
    AND c.academia_id = _per.academia_id
    AND c.estado_financiero IN ('pendiente', 'parcial', 'vencido');

  -- Movimientos: deben venir de evento_timeline, igual que la versión uuid
  SELECT COALESCE(jsonb_agg(m ORDER BY m.fecha_evento DESC), '[]'::jsonb)
  INTO _movs
  FROM (
    SELECT
      id,
      tipo,
      titulo,
      CASE WHEN tipo IN ('ANULACION_CARGO', 'ANULACION_PAGO')
           THEN NULL ELSE descripcion END AS descripcion,
      monto,
      fecha_evento,
      'FINANZAS'::text AS categoria
    FROM public.evento_timeline
    WHERE persona_id = _per.id
      AND academia_id = _per.academia_id
      AND categoria = 'FINANZAS'
  ) m;

  RETURN jsonb_build_object(
    'disponible',    true,
    'academia',      jsonb_build_object('nombre', _aca.nombre, 'logo_url', _aca.logo_url),
    'alumno',        jsonb_build_object('nombre', _per.nombre, 'apellido', _per.apellido),
    'deuda',         COALESCE((
                       SELECT SUM(c.saldo_pendiente)
                       FROM public.cargo c
                       WHERE c.persona_id = _per.id
                         AND c.academia_id = _per.academia_id
                         AND c.estado_financiero IN ('pendiente', 'parcial', 'vencido')
                     ), 0),
    'saldo_a_favor', COALESCE((
                       SELECT SUM(m2.monto_disponible)
                       FROM public.movimiento m2
                       WHERE m2.persona_id = _per.id
                         AND m2.academia_id = _per.academia_id
                     ), 0),
    'cargos_activos', COALESCE(_cargos, '[]'::jsonb),
    'movimientos',    _movs
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obtener_historial_publico_v1(text) TO anon, authenticated;
