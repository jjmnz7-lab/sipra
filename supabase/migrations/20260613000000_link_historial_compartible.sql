-- ==============================================================================
-- Migración: link_historial_compartible
-- Descripción: Enlace público de historial financiero por alumno, accesible por
--   token (UUID) sin necesidad de iniciar sesión.
--
--   1) persona.share_token        → UUID único e irrepetible (no usa el id
--                                    secuencial). Default gen_random_uuid() y
--                                    backfill automático para alumnos existentes.
--   2) persona.share_link_bloqueado → bloqueo manual del enlace (kebab del dueño).
--   3) RPC obtener_historial_publico_v1(p_token) → lectura pública en vivo.
--      SECURITY DEFINER, expuesta al rol `anon`. Devuelve:
--        - marca de la academia (nombre + logo),
--        - datos NO sensibles del alumno (nombre/apellido; nunca teléfono/email),
--        - saldo deudor y saldo a favor,
--        - cargos activos (campos mínimos para reconstruir el semáforo),
--        - movimientos financieros: cargos, pagos/abonos y anulaciones.
--          Se EXCLUYEN las promesas de pago (compromiso interno) y se ocultan los
--          motivos internos de las anulaciones (descripcion → NULL).
--      disponible=false si el alumno está suspendido (estado_registro != 'activo')
--      o si el enlace fue bloqueado manualmente, y para cualquier token inválido.
--
-- DOWN (referencia):
--   DROP FUNCTION IF EXISTS public.obtener_historial_publico_v1(uuid);
--   DROP INDEX IF EXISTS public.idx_persona_share_token;
--   ALTER TABLE public.persona DROP COLUMN IF EXISTS share_link_bloqueado;
--   ALTER TABLE public.persona DROP COLUMN IF EXISTS share_token;
-- ==============================================================================

-- 1. Columnas -------------------------------------------------------------------
-- gen_random_uuid() es volátil: cada fila existente recibe un token distinto en
-- el backfill, por lo que el índice único es válido inmediatamente.
ALTER TABLE public.persona
  ADD COLUMN IF NOT EXISTS share_token uuid NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE public.persona
  ADD COLUMN IF NOT EXISTS share_link_bloqueado boolean NOT NULL DEFAULT false;

-- Índice único: lookup O(1) por token y garantía matemática de unicidad.
CREATE UNIQUE INDEX IF NOT EXISTS idx_persona_share_token
  ON public.persona (share_token);

-- 2. RPC de lectura pública -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.obtener_historial_publico_v1(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_persona  record;
  v_academia record;
  v_deuda    numeric;
  v_favor    numeric;
  v_cargos   jsonb;
  v_movs     jsonb;
BEGIN
  -- Buscar alumno por token (único). Token inexistente → enlace no disponible.
  SELECT id, academia_id, nombre, apellido, estado_registro, share_link_bloqueado
    INTO v_persona
  FROM persona
  WHERE share_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('disponible', false);
  END IF;

  -- Bloqueo del enlace: suspensión (estado != activo) o bloqueo manual.
  -- No se revela el motivo: el visitante sólo ve "no disponible".
  IF v_persona.estado_registro <> 'activo' OR v_persona.share_link_bloqueado THEN
    RETURN jsonb_build_object('disponible', false);
  END IF;

  -- Marca de la academia (logo público vive en metadata.logo_url).
  SELECT nombre, metadata->>'logo_url' AS logo_url
    INTO v_academia
  FROM academia
  WHERE id = v_persona.academia_id;

  -- Saldo deudor: suma de saldos pendientes de cargos activos.
  SELECT COALESCE(sum(saldo_pendiente), 0) INTO v_deuda
  FROM cargo
  WHERE persona_id = v_persona.id
    AND academia_id = v_persona.academia_id
    AND estado_financiero IN ('pendiente', 'parcial', 'vencido');

  -- Saldo a favor: crédito disponible no aplicado (mismo cálculo que el perfil).
  SELECT COALESCE(sum(monto_disponible), 0) INTO v_favor
  FROM movimiento
  WHERE persona_id = v_persona.id
    AND academia_id = v_persona.academia_id;

  -- Cargos activos: campos mínimos para reconstruir el semáforo en el cliente
  -- con la misma regla (clasificarAlumno) que usa la app del dueño.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'concepto', concepto,
           'estado_financiero', estado_financiero,
           'fecha_vencimiento', fecha_vencimiento
         )), '[]'::jsonb) INTO v_cargos
  FROM cargo
  WHERE persona_id = v_persona.id
    AND academia_id = v_persona.academia_id
    AND estado_financiero IN ('pendiente', 'parcial', 'vencido');

  -- Movimientos financieros visibles al tutor: cargos, pagos/abonos y anulaciones.
  -- Se excluyen las promesas de pago y se ocultan los motivos internos de las
  -- anulaciones (descripcion → NULL en esos tipos).
  SELECT COALESCE(jsonb_agg(m ORDER BY m.fecha_evento DESC), '[]'::jsonb) INTO v_movs
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
    FROM evento_timeline
    WHERE persona_id = v_persona.id
      AND academia_id = v_persona.academia_id
      AND categoria = 'FINANZAS'
      AND tipo IN (
        'CARGO_RECURRENTE', 'RECARGO_TARDIO', 'INSCRIPCION', 'CARGO_UNICO',
        'CARGO_MASIVO', 'PAGO_ABONO', 'ANULACION_CARGO', 'ANULACION_PAGO'
      )
  ) m;

  RETURN jsonb_build_object(
    'disponible', true,
    'academia', jsonb_build_object(
      'nombre', v_academia.nombre,
      'logo_url', v_academia.logo_url
    ),
    'alumno', jsonb_build_object(
      'nombre', v_persona.nombre,
      'apellido', v_persona.apellido
    ),
    'deuda', v_deuda,
    'saldo_a_favor', v_favor,
    'cargos_activos', v_cargos,
    'movimientos', v_movs
  );
END;
$$;

-- El enlace es público: el rol anónimo puede ejecutar la RPC, pero NO tiene
-- acceso directo a ninguna tabla (la función es SECURITY DEFINER y sólo expone
-- el subconjunto curado de arriba). Se revoca el grant implícito a PUBLIC.
REVOKE ALL ON FUNCTION public.obtener_historial_publico_v1(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_historial_publico_v1(uuid) TO anon, authenticated;
