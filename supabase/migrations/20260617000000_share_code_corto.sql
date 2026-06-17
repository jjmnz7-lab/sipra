-- ==============================================================================
-- share_code_corto: URLs públicas cortas para el historial de alumno
-- ==============================================================================
-- Añade share_code (6 chars, alfanumérico sin caracteres ambiguos) como
-- columna pública visible en /historial/{code}. El UUID share_token permanece
-- internamente. El RPC pasa a buscar por share_code.
--
-- Alfabeto: A-Z2-9 sin O,0,I,1 → 32 caracteres → 32^6 ≈ 1.073 billones.
-- Rollback: ver comentario al final del fichero.
-- ==============================================================================

-- 1. Función generadora de código único ----------------------------------------
CREATE OR REPLACE FUNCTION public.generar_share_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  _code   text;
BEGIN
  LOOP
    _code := '';
    FOR i IN 1..6 LOOP
      _code := _code || substr(_chars, floor(random() * 32)::int + 1, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.persona WHERE share_code = _code);
  END LOOP;
  RETURN _code;
END;
$$;

-- 2. Columna share_code ---------------------------------------------------------
ALTER TABLE public.persona
  ADD COLUMN IF NOT EXISTS share_code text;

-- 3. Backfill: asignar código único a cada persona existente -------------------
DO $$
DECLARE
  _rec RECORD;
BEGIN
  FOR _rec IN SELECT id FROM public.persona WHERE share_code IS NULL LOOP
    UPDATE public.persona
    SET share_code = public.generar_share_code()
    WHERE id = _rec.id;
  END LOOP;
END;
$$;

-- 4. Restricciones -------------------------------------------------------------
ALTER TABLE public.persona
  ALTER COLUMN share_code SET NOT NULL,
  ALTER COLUMN share_code SET DEFAULT public.generar_share_code();

CREATE UNIQUE INDEX IF NOT EXISTS idx_persona_share_code
  ON public.persona (share_code);

-- 5. Nuevo RPC busca por share_code --------------------------------------------
-- Eliminamos la versión anterior (firma distinta: uuid → text).
DROP FUNCTION IF EXISTS public.obtener_historial_publico_v1(uuid);

CREATE OR REPLACE FUNCTION public.obtener_historial_publico_v1(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _per     RECORD;
  _aca     RECORD;
  _cargos  jsonb;
  _movs    jsonb;
BEGIN
  -- Validación básica de formato
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

  -- Enlace bloqueado manualmente o alumno suspendido
  IF _per.share_link_bloqueado OR _per.estado_registro <> 'activo' THEN
    RETURN jsonb_build_object('disponible', false);
  END IF;

  SELECT a.nombre, a.logo_url
  INTO _aca
  FROM public.academia a
  WHERE a.id = _per.academia_id;

  -- Cargos activos (campos mínimos para el semáforo)
  SELECT jsonb_agg(
    jsonb_build_object(
      'concepto',           c.concepto,
      'estado_financiero',  c.estado_financiero,
      'fecha_vencimiento',  c.fecha_vencimiento
    ) ORDER BY c.fecha_vencimiento NULLS LAST
  )
  INTO _cargos
  FROM public.cargo c
  WHERE c.persona_id = _per.id
    AND c.estado_financiero IN ('pendiente', 'vencido', 'urgente');

  -- Movimientos (todos: pagos, abonos, anulaciones) — campos NO sensibles
  SELECT jsonb_agg(
    jsonb_build_object(
      'id',            m.id,
      'fecha_pago',    m.fecha_pago,
      'tipo',          m.tipo,
      'monto',         m.monto,
      'metodo_pago',   m.metodo_pago,
      'descripcion',   m.descripcion,
      'estado',        m.estado
    ) ORDER BY m.fecha_pago DESC
  )
  INTO _movs
  FROM public.movimiento m
  WHERE m.persona_id = _per.id;

  RETURN jsonb_build_object(
    'disponible',    true,
    'academia',      jsonb_build_object('nombre', _aca.nombre, 'logo_url', _aca.logo_url),
    'alumno',        jsonb_build_object('nombre', _per.nombre, 'apellido', _per.apellido),
    'deuda',         COALESCE((
                       SELECT SUM(c.saldo_pendiente)
                       FROM public.cargo c
                       WHERE c.persona_id = _per.id
                         AND c.estado_financiero IN ('pendiente','vencido','urgente')
                     ), 0),
    'saldo_a_favor', COALESCE((
                       SELECT m.monto_disponible
                       FROM public.movimiento_disponible m
                       WHERE m.persona_id = _per.id
                       LIMIT 1
                     ), 0),
    'cargos_activos', COALESCE(_cargos, '[]'::jsonb),
    'movimientos',    COALESCE(_movs,   '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obtener_historial_publico_v1(text) TO anon, authenticated;

-- ==============================================================================
-- ROLLBACK (ejecutar manualmente si es necesario):
--   DROP FUNCTION IF EXISTS public.obtener_historial_publico_v1(text);
--   DROP FUNCTION IF EXISTS public.generar_share_code();
--   DROP INDEX IF EXISTS public.idx_persona_share_code;
--   ALTER TABLE public.persona DROP COLUMN IF EXISTS share_code;
-- ==============================================================================
