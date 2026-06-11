-- ==============================================================================
-- Migración: timeline_v2
-- Descripción: Refactor del historial del alumno (evento_timeline) al modelo
--   de 3 categorías + matriz de movimientos tipados.
--
--   1) Nueva columna `monto numeric(10,2)` (impacto directo en saldo; nullable).
--   2) Categorías normalizadas: 'FINANZAS' | 'OPERATIVO' | 'COMUNICACION'.
--   3) Tipos de movimiento (código interno único):
--        FINANZAS:     CARGO_RECURRENTE, RECARGO_TARDIO, INSCRIPCION,
--                      CARGO_UNICO, CARGO_MASIVO, PAGO_ABONO, PROMESA,
--                      ANULACION_CARGO, ANULACION_PAGO
--        OPERATIVO:    REGISTRO, INSCRIPCION_NUEVO_GRUPO, INSCRIPCION_TALLER,
--                      ESTATUS_CAMBIO, GRUPO_MUTACION, ESQUEMA_MUTACION,
--                      NOTA, AVISO_GRUPAL
--        COMUNICACION: MENSAJE_AUTOMATICO (reservado para V2; sin productor en V1)
--   4) Trigger BEFORE INSERT que normaliza inserts legacy (categorías en
--      minúscula, tipo 'cargo_generado', monto en metadata) para que cualquier
--      productor no migrado siga funcionando sin violar el nuevo CHECK.
--   5) Backfill heurístico de las filas existentes.
--   6) Reescritura de los RPCs productores activos para emitir títulos /
--      subtítulos / montos conforme a la matriz, y nuevos eventos OPERATIVO
--      (alta en grupo, taller, esquema, remoción).
--
--   NOTA: se conservan los nombres de columna existentes:
--     descripcion  = subtítulo de la UI
--     fecha_evento = created_at de la UI
--
-- DOWN (referencia):
--   DROP TRIGGER IF EXISTS trg_normalizar_evento_timeline ON public.evento_timeline;
--   DROP FUNCTION IF EXISTS public.normalizar_evento_timeline();
--   DROP INDEX IF EXISTS public.idx_timeline_persona_categoria;
--   ALTER TABLE public.evento_timeline DROP CONSTRAINT IF EXISTS chk_et_categoria;
--   ALTER TABLE public.evento_timeline ADD CONSTRAINT chk_et_categoria
--     CHECK (categoria IN ('financiero', 'comunicacion', 'sistema', 'operativo'));
--   ALTER TABLE public.evento_timeline DROP COLUMN IF EXISTS monto;
--   -- (los datos de categoria/tipo backfilleados y los RPCs requieren restaurar
--   --  las versiones previas desde sus migraciones de origen)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Columna monto (impacto financiero del movimiento; positivo siempre,
--    el signo lo decide la UI según el tipo).
-- ------------------------------------------------------------------------------
ALTER TABLE public.evento_timeline
  ADD COLUMN IF NOT EXISTS monto numeric(10,2);

-- ------------------------------------------------------------------------------
-- 2. Trigger de normalización para inserts legacy.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalizar_evento_timeline()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 2.a Categoría legacy (minúsculas) → nueva taxonomía
  NEW.categoria := CASE lower(COALESCE(NEW.categoria, ''))
    WHEN 'financiero'   THEN 'FINANZAS'
    WHEN 'finanzas'     THEN 'FINANZAS'
    WHEN 'comunicacion' THEN 'COMUNICACION'
    WHEN 'operativo'    THEN 'OPERATIVO'
    WHEN 'sistema'      THEN 'OPERATIVO'
    ELSE upper(COALESCE(NEW.categoria, 'OPERATIVO'))
  END;

  -- 2.b Tipos legacy → códigos nuevos
  IF NEW.tipo IN ('cargo_generado', 'cargo_creado', 'cargo_individual') THEN
    NEW.tipo := CASE
      WHEN NEW.titulo ILIKE '%recargo%'
        THEN 'RECARGO_TARDIO'
      WHEN NEW.titulo ILIKE '%inscripci%' OR COALESCE(NEW.descripcion, '') ILIKE '%inscribir%'
        THEN 'INSCRIPCION'
      WHEN NEW.titulo ILIKE '%grupal%' OR COALESCE(NEW.metadata->>'generado_grupal', '') = 'true'
        THEN 'CARGO_MASIVO'
      WHEN NEW.titulo ILIKE '%mensualidad%' OR NEW.titulo ILIKE '%cuota semanal%'
        OR COALESCE(NEW.descripcion, '') ILIKE '%recurrente%' OR NEW.metadata ? 'periodo'
        THEN 'CARGO_RECURRENTE'
      ELSE 'CARGO_UNICO'
    END;
  ELSIF NEW.tipo = lower(NEW.tipo) THEN
    NEW.tipo := CASE NEW.tipo
      WHEN 'abono_registrado'     THEN 'PAGO_ABONO'
      WHEN 'pago_anulado'         THEN 'ANULACION_PAGO'
      WHEN 'cargo_anulado'        THEN 'ANULACION_CARGO'
      WHEN 'promesa_pago'         THEN 'PROMESA'
      WHEN 'nota'                 THEN 'NOTA'
      WHEN 'aviso_grupal'         THEN 'AVISO_GRUPAL'
      WHEN 'recordatorio_enviado' THEN 'MENSAJE_AUTOMATICO'
      ELSE upper(NEW.tipo)
    END;
  END IF;

  -- 2.c Monto desde metadata si el productor legacy no lo mandó en columna
  IF NEW.monto IS NULL AND NEW.categoria = 'FINANZAS' THEN
    BEGIN
      NEW.monto := COALESCE(
        nullif(NEW.metadata->>'monto', ''),
        nullif(NEW.metadata->>'monto_recargo', ''),
        nullif(NEW.metadata->>'monto_anulado', ''),
        nullif(NEW.metadata->>'monto_original', '')
      )::numeric(10,2);
    EXCEPTION WHEN OTHERS THEN
      NEW.monto := NULL;  -- metadata con formato inesperado: no bloquear el insert
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalizar_evento_timeline ON public.evento_timeline;
CREATE TRIGGER trg_normalizar_evento_timeline
BEFORE INSERT ON public.evento_timeline
FOR EACH ROW EXECUTE FUNCTION public.normalizar_evento_timeline();

-- ------------------------------------------------------------------------------
-- 3. Backfill heurístico de filas existentes (mismas reglas que el trigger).
--    El CHECK legacy (valores en minúscula) se suelta ANTES de actualizar.
-- ------------------------------------------------------------------------------
ALTER TABLE public.evento_timeline DROP CONSTRAINT IF EXISTS chk_et_categoria;

UPDATE public.evento_timeline SET categoria = CASE lower(categoria)
  WHEN 'financiero'   THEN 'FINANZAS'
  WHEN 'comunicacion' THEN 'COMUNICACION'
  WHEN 'operativo'    THEN 'OPERATIVO'
  WHEN 'sistema'      THEN 'OPERATIVO'
  ELSE upper(categoria)
END
WHERE categoria NOT IN ('FINANZAS', 'OPERATIVO', 'COMUNICACION');

UPDATE public.evento_timeline SET tipo = CASE
  WHEN titulo ILIKE '%recargo%' THEN 'RECARGO_TARDIO'
  WHEN titulo ILIKE '%inscripci%' OR COALESCE(descripcion, '') ILIKE '%inscribir%' THEN 'INSCRIPCION'
  WHEN titulo ILIKE '%grupal%' OR COALESCE(metadata->>'generado_grupal', '') = 'true' THEN 'CARGO_MASIVO'
  WHEN titulo ILIKE '%mensualidad%' OR titulo ILIKE '%cuota semanal%'
    OR COALESCE(descripcion, '') ILIKE '%recurrente%' OR metadata ? 'periodo' THEN 'CARGO_RECURRENTE'
  ELSE 'CARGO_UNICO'
END
WHERE tipo IN ('cargo_generado', 'cargo_creado', 'cargo_individual');

UPDATE public.evento_timeline SET tipo = CASE tipo
  WHEN 'abono_registrado'     THEN 'PAGO_ABONO'
  WHEN 'pago_anulado'         THEN 'ANULACION_PAGO'
  WHEN 'cargo_anulado'        THEN 'ANULACION_CARGO'
  WHEN 'promesa_pago'         THEN 'PROMESA'
  WHEN 'nota'                 THEN 'NOTA'
  WHEN 'aviso_grupal'         THEN 'AVISO_GRUPAL'
  WHEN 'recordatorio_enviado' THEN 'MENSAJE_AUTOMATICO'
  ELSE upper(tipo)
END
WHERE tipo = lower(tipo);

UPDATE public.evento_timeline SET monto = COALESCE(
  nullif(metadata->>'monto', ''),
  nullif(metadata->>'monto_recargo', ''),
  nullif(metadata->>'monto_anulado', ''),
  nullif(metadata->>'monto_original', '')
)::numeric(10,2)
WHERE monto IS NULL
  AND categoria = 'FINANZAS'
  AND COALESCE(
    nullif(metadata->>'monto', ''),
    nullif(metadata->>'monto_recargo', ''),
    nullif(metadata->>'monto_anulado', ''),
    nullif(metadata->>'monto_original', '')
  ) ~ '^-?[0-9]+(\.[0-9]+)?$';

-- ------------------------------------------------------------------------------
-- 4. CHECK de categoría (después del backfill para validar filas existentes).
-- ------------------------------------------------------------------------------
ALTER TABLE public.evento_timeline ADD CONSTRAINT chk_et_categoria
  CHECK (categoria IN ('FINANZAS', 'OPERATIVO', 'COMUNICACION'));

-- Índice para el filtro por categoría del historial completo.
CREATE INDEX IF NOT EXISTS idx_timeline_persona_categoria
  ON public.evento_timeline (academia_id, persona_id, categoria, fecha_evento DESC);

-- ==============================================================================
-- 5. RPCs productores: emiten eventos conforme a la matriz de movimientos.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 5.1 registrar_pago_atomico_v1 → PAGO_ABONO
--     (cuerpo de 20260528030000; sólo cambia el INSERT del timeline)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_pago_atomico_v1(
  p_academia_id uuid,
  p_persona_id uuid,
  p_cargo_ids uuid[],
  p_monto_total numeric,
  p_metodo_pago text,
  p_idempotency_key text,
  p_referencia text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_mov_id uuid := gen_random_uuid();
  v_tl_id uuid := gen_random_uuid();
  v_cargo record;
  v_monto_restante numeric := p_monto_total;
  v_monto_aplicado numeric;
  v_nuevo_saldo numeric;
  v_nuevo_estado text;
  v_persona_nombre text;
  v_allow_partial boolean;
  v_total_adeudo numeric;
  v_es_abono boolean;
BEGIN
  -- 1. SEGURIDAD
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  -- 2. VALIDACIÓN DE NEGOCIO
  IF p_monto_total <= 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;

  -- 2.b CONTROL DE ABONOS PARCIALES
  SELECT allow_partial_payments INTO v_allow_partial
  FROM academia WHERE id = p_academia_id;

  SELECT COALESCE(SUM(saldo_pendiente), 0) INTO v_total_adeudo
  FROM cargo
  WHERE id = ANY(p_cargo_ids)
    AND academia_id = p_academia_id
    AND estado_financiero <> 'anulado';

  IF NOT COALESCE(v_allow_partial, true) AND p_monto_total < v_total_adeudo THEN
    RAISE EXCEPTION 'PAGO_PARCIAL_NO_PERMITIDO' USING ERRCODE = 'P0002';
  END IF;

  v_es_abono := p_monto_total < v_total_adeudo;

  SELECT (nombre || ' ' || COALESCE(apellido, '')) INTO v_persona_nombre
  FROM persona WHERE id = p_persona_id AND academia_id = p_academia_id;

  -- Insertar movimiento (Idempotencia protegida por UNIQUE constraint)
  INSERT INTO movimiento (id, academia_id, persona_id, monto_total, monto_disponible, metodo_pago, referencia, idempotency_key, created_by)
  VALUES (v_mov_id, p_academia_id, p_persona_id, p_monto_total, p_monto_total, p_metodo_pago, p_referencia, p_idempotency_key, COALESCE(p_actor_id, sipra_auth.get_my_user_id()));

  -- 3. LOCKS
  FOR v_cargo IN
    SELECT id, saldo_pendiente, monto_original, estado_financiero
    FROM cargo
    WHERE id = ANY(p_cargo_ids) AND academia_id = p_academia_id
    ORDER BY id ASC
    FOR UPDATE
  LOOP
    IF v_monto_restante <= 0 THEN
      EXIT;
    END IF;

    IF v_cargo.saldo_pendiente > 0 THEN
      IF v_monto_restante >= v_cargo.saldo_pendiente THEN
        v_monto_aplicado := v_cargo.saldo_pendiente;
      ELSE
        v_monto_aplicado := v_monto_restante;
      END IF;

      v_nuevo_saldo := v_cargo.saldo_pendiente - v_monto_aplicado;

      IF v_nuevo_saldo = 0 THEN
        v_nuevo_estado := 'liquidado';
      ELSIF v_nuevo_saldo < v_cargo.monto_original THEN
        v_nuevo_estado := 'parcial';
      ELSE
        v_nuevo_estado := v_cargo.estado_financiero;
      END IF;

      -- 4. LEDGER (aplicación + actualización de cargo → trigger ajusta saldo_acumulado)
      INSERT INTO aplicacion_movimiento (academia_id, movimiento_id, cargo_id, monto_aplicado)
      VALUES (p_academia_id, v_mov_id, v_cargo.id, v_monto_aplicado);

      UPDATE cargo
      SET saldo_pendiente = v_nuevo_saldo,
          estado_financiero = v_nuevo_estado,
          updated_at = now()
      WHERE id = v_cargo.id;

      v_monto_restante := v_monto_restante - v_monto_aplicado;

      -- 5. SIDE EFFECTS
      IF v_nuevo_estado = 'liquidado' THEN
        UPDATE envio_sugerido
        SET estado = 'invalidado', invalid_reason = 'Cargo liquidado'
        WHERE cargo_id = v_cargo.id AND estado = 'pendiente_revision';
      END IF;
    END IF;
  END LOOP;

  -- Actualizar monto disponible del movimiento (crédito sobrante no aplicado)
  UPDATE movimiento SET monto_disponible = v_monto_restante WHERE id = v_mov_id;

  -- 6. TIMELINE → PAGO_ABONO
  INSERT INTO evento_timeline (id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_id, actor_nombre, metadata)
  VALUES (v_tl_id, p_academia_id, p_persona_id, 'FINANZAS', 'PAGO_ABONO', 'Pago recibido',
          (CASE WHEN v_es_abono THEN 'Abono' ELSE 'Pago' END) || ' · ' || p_metodo_pago,
          p_monto_total,
          COALESCE(p_actor_id, sipra_auth.get_my_user_id()), v_persona_nombre,
          jsonb_build_object('movimiento_id', v_mov_id, 'monto', p_monto_total, 'metodo', p_metodo_pago, 'es_abono', v_es_abono));

  RETURN jsonb_build_object(
    'success', true,
    'operation_id', v_mov_id,
    'timeline_event_id', v_tl_id,
    'data', jsonb_build_object('monto_sobrante', v_monto_restante),
    'warnings', '[]'::jsonb,
    'needs_refresh', false
  );
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5.2 revertir_pago_atomico_v1 → ANULACION_PAGO
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revertir_pago_atomico_v1(
  p_academia_id uuid,
  p_movimiento_id uuid,
  p_motivo text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_tl_id uuid := gen_random_uuid();
  v_movimiento record;
  v_aplicacion record;
  v_cargo record;
  v_nuevo_saldo numeric;
  v_nuevo_estado text;
  v_persona_nombre text;
BEGIN
  -- 1. SEGURIDAD
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  -- 2. VALIDACIÓN DEL MOVIMIENTO
  SELECT * INTO v_movimiento
  FROM movimiento
  WHERE id = p_movimiento_id AND academia_id = p_academia_id AND estado = 'registrado'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MOVIMIENTO_NO_VALIDO_O_YA_ANULADO' USING ERRCODE = 'P0003';
  END IF;

  SELECT (nombre || ' ' || COALESCE(apellido, '')) INTO v_persona_nombre
  FROM persona WHERE id = v_movimiento.persona_id AND academia_id = p_academia_id;

  -- 3. LOCKS Y REVERSIÓN EN CARGOS
  FOR v_aplicacion IN
    SELECT * FROM aplicacion_movimiento
    WHERE movimiento_id = p_movimiento_id AND academia_id = p_academia_id
    ORDER BY cargo_id ASC
  LOOP
    SELECT * INTO v_cargo FROM cargo
    WHERE id = v_aplicacion.cargo_id AND academia_id = p_academia_id
    FOR UPDATE;

    IF FOUND THEN
      v_nuevo_saldo := v_cargo.saldo_pendiente + v_aplicacion.monto_aplicado;

      IF v_nuevo_saldo >= v_cargo.monto_original THEN
        v_nuevo_estado := 'vencido';
        IF v_cargo.fecha_vencimiento > now() THEN
           v_nuevo_estado := 'pendiente';
        END IF;
      ELSE
        v_nuevo_estado := 'parcial';
      END IF;

      UPDATE cargo
      SET saldo_pendiente = v_nuevo_saldo,
          estado_financiero = v_nuevo_estado,
          updated_at = now()
      WHERE id = v_cargo.id;
    END IF;
  END LOOP;

  -- 4. ACTUALIZAR LEDGER (Marcar movimiento como anulado)
  UPDATE movimiento
  SET estado = 'anulado',
      updated_at = now()
  WHERE id = p_movimiento_id;

  -- 5. TIMELINE → ANULACION_PAGO
  INSERT INTO evento_timeline (id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_id, actor_nombre, metadata)
  VALUES (v_tl_id, p_academia_id, v_movimiento.persona_id, 'FINANZAS', 'ANULACION_PAGO', 'Pago cancelado',
          p_motivo,
          v_movimiento.monto_total,
          COALESCE(p_actor_id, sipra_auth.get_my_user_id()), v_persona_nombre,
          jsonb_build_object('movimiento_id', p_movimiento_id, 'monto_anulado', v_movimiento.monto_total, 'motivo', p_motivo));

  RETURN jsonb_build_object(
    'success', true,
    'operation_id', p_movimiento_id,
    'timeline_event_id', v_tl_id,
    'data', jsonb_build_object(),
    'warnings', '[]'::jsonb,
    'needs_refresh', true
  );
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5.3 procesar_recargos_v1 → RECARGO_TARDIO
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.procesar_recargos_v1(
  p_academia_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_config             jsonb;
  v_is_active          boolean;
  v_reglas             jsonb;
  v_regla              jsonb;
  v_cargo              record;
  v_dias_retraso       integer;
  v_recargos_generados integer := 0;
  v_tl_id              uuid;
  v_persona_nombre     text;
  v_monto_base         numeric;
  v_monto_recargo      numeric;
  v_regla_dia          int;
  v_regla_tipo         text;
  v_regla_valor        numeric;
BEGIN
  -- 1. SEGURIDAD (idéntica a v1)
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    NULL;  -- Permitido cuando viene de service_role / cron.
  END IF;

  -- 2. CARGAR CONFIGURACIÓN
  SELECT config_recargos INTO v_config
  FROM academia
  WHERE id = p_academia_id;

  -- 3. RESOLVER FLAG DE ACTIVACIÓN (acepta ambos formatos)
  v_is_active := COALESCE(
    (v_config->>'aplicar_recargos')::boolean,
    (v_config->>'activo')::boolean,
    false
  );

  -- 4. NORMALIZAR REGLAS (nueva shape → ok; legacy → mapear desde escalones).
  IF v_config ? 'reglas' THEN
    v_reglas := v_config->'reglas';
  ELSIF v_config ? 'escalones' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'dia',   (e->>'dias_retraso')::int,
      'tipo',  'monto_fijo',
      'valor', (e->>'monto')::numeric
    )), '[]'::jsonb)
      INTO v_reglas
    FROM jsonb_array_elements(v_config->'escalones') AS e;
  ELSE
    v_reglas := '[]'::jsonb;
  END IF;

  IF NOT v_is_active OR jsonb_array_length(v_reglas) = 0 THEN
    RETURN jsonb_build_object('success', true, 'recargos_generados', 0,
                              'message', 'Recargos desactivados o sin reglas');
  END IF;

  -- 5. BUCLE PRINCIPAL SOBRE CARGOS VENCIDOS O PARCIALES
  FOR v_cargo IN
    SELECT c.id, c.persona_id, c.fecha_vencimiento, c.concepto, c.monto_original
    FROM cargo c
    WHERE c.academia_id = p_academia_id
      AND c.estado_financiero IN ('vencido', 'parcial')
      AND c.fecha_vencimiento < current_date
  LOOP
    v_dias_retraso := current_date - v_cargo.fecha_vencimiento;
    v_monto_base := COALESCE(v_cargo.monto_original, 0);

    FOR v_regla IN SELECT * FROM jsonb_array_elements(v_reglas)
    LOOP
      v_regla_dia   := (v_regla->>'dia')::int;
      v_regla_tipo  := v_regla->>'tipo';
      v_regla_valor := (v_regla->>'valor')::numeric;

      IF v_dias_retraso >= v_regla_dia THEN
        IF NOT EXISTS (
          SELECT 1 FROM cargo r
          WHERE r.academia_id = p_academia_id
            AND r.persona_id = v_cargo.persona_id
            AND r.metadata->>'cargo_padre_id' = v_cargo.id::text
            AND r.metadata->>'regla_dia' = v_regla_dia::text
        ) THEN
          v_monto_recargo := CASE v_regla_tipo
            WHEN 'porcentaje' THEN round(v_monto_base * v_regla_valor / 100.0, 2)
            ELSE v_regla_valor
          END;

          IF v_monto_recargo > 0 THEN
            INSERT INTO cargo (
              academia_id, persona_id, concepto, monto_original, saldo_pendiente,
              estado_financiero, fecha_vencimiento, origen, metadata
            ) VALUES (
              p_academia_id, v_cargo.persona_id,
              'Recargo por mora (' || v_regla_dia || ' días) - ' || v_cargo.concepto,
              v_monto_recargo, v_monto_recargo,
              'vencido', current_date, 'automatizado',
              jsonb_build_object(
                'cargo_padre_id', v_cargo.id,
                'regla_dia',      v_regla_dia,
                'regla_tipo',     v_regla_tipo,
                'regla_valor',    v_regla_valor
              )
            );

            v_recargos_generados := v_recargos_generados + 1;

            SELECT (nombre || ' ' || COALESCE(apellido, '')) INTO v_persona_nombre
            FROM persona WHERE id = v_cargo.persona_id;

            v_tl_id := gen_random_uuid();
            INSERT INTO evento_timeline (
              id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_nombre, metadata
            ) VALUES (
              v_tl_id, p_academia_id, v_cargo.persona_id, 'FINANZAS', 'RECARGO_TARDIO', 'Recargo por atraso',
              v_dias_retraso || ' días de retraso · ' || v_cargo.concepto,
              v_monto_recargo,
              'Sistema', jsonb_build_object(
                'cargo_padre_id', v_cargo.id,
                'monto_recargo',  v_monto_recargo,
                'regla_dia',      v_regla_dia,
                'regla_tipo',     v_regla_tipo
              )
            );
          END IF;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'recargos_generados', v_recargos_generados
  );
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5.4 generar_cargos_recurrentes_v1 → CARGO_RECURRENTE (+ PAGO_ABONO por
--     saldo a favor). Cuerpo de 20260603000000.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generar_cargos_recurrentes_v1(
  p_academia_id uuid,
  p_fecha       date DEFAULT current_date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_row            record;
  v_dow            int;
  v_periodo        text;
  v_concepto       text;
  v_titulo         text;
  v_fecha_venc     date;
  v_due            boolean;
  v_cargos_creados int := 0;
  v_omitidos       int := 0;
  v_credito_total  numeric := 0;
  -- Aplicación de saldo a favor
  v_cargo_id       uuid;
  v_mov            record;
  v_saldo_cargo    numeric;
  v_aplicar        numeric;
  v_credito_usado  numeric;
  v_nuevo_estado   text;
BEGIN
  v_dow := EXTRACT(isodow FROM p_fecha)::int;  -- 1 = lunes ... 7 = domingo

  FOR v_row IN
    SELECT ap.alumno_id AS persona_id, pc.id AS plan_id, pc.nombre AS plan_nombre,
           pc.monto, pc.frecuencia
    FROM alumno_planes ap
    JOIN planes_cobro pc ON pc.id = ap.plan_cobro_id
    JOIN persona p       ON p.id = ap.alumno_id
    WHERE ap.academia_id = p_academia_id
      AND pc.frecuencia IN ('mensual', 'semanal')   -- 'por_visita'/'pago_unico' se ignoran
      AND pc.monto > 0
      AND p.estado_registro = 'activo'              -- suspendidos no reciben cargos recurrentes
      AND p.etiqueta = 'alumno'
  LOOP
    IF v_row.frecuencia = 'mensual' THEN
      v_due        := (EXTRACT(day FROM p_fecha)::int = 1);   -- corte: día 1
      v_periodo    := 'M' || to_char(p_fecha, 'YYYY-MM');
      v_concepto   := 'Mensualidad ' || to_char(date_trunc('month', p_fecha), 'TMMonth YYYY');
      v_titulo     := 'Cargo: Mensualidad';
      v_fecha_venc := (date_trunc('month', p_fecha) + interval '1 month - 1 day')::date;
    ELSE  -- semanal
      v_due        := (v_dow = 1);                            -- corte: lunes
      v_periodo    := 'W' || to_char(p_fecha, 'IYYY-IW');
      v_concepto   := 'Cuota semanal ' || to_char(p_fecha, 'DD/MM/YYYY');
      v_titulo     := 'Cargo: Cuota semanal';
      v_fecha_venc := p_fecha + 6;                            -- fin de la semana
    END IF;

    IF NOT v_due THEN
      CONTINUE;
    END IF;

    -- Idempotencia por (persona, plan, periodo)
    IF EXISTS (
      SELECT 1 FROM cargo c
      WHERE c.academia_id = p_academia_id
        AND c.persona_id = v_row.persona_id
        AND c.estado_financiero <> 'anulado'
        AND c.metadata->>'plan_id' = v_row.plan_id::text
        AND c.metadata->>'periodo' = v_periodo
    ) THEN
      v_omitidos := v_omitidos + 1;
      CONTINUE;
    END IF;

    -- El INSERT dispara trg_cargo_sync_saldo → suma al saldo_acumulado.
    INSERT INTO cargo (
      academia_id, persona_id, concepto, monto_original, saldo_pendiente,
      estado_financiero, fecha_vencimiento, origen, metadata
    ) VALUES (
      p_academia_id, v_row.persona_id, v_concepto, v_row.monto, v_row.monto,
      'pendiente', v_fecha_venc, 'recurrente',
      jsonb_build_object(
        'plan_id', v_row.plan_id, 'plan_nombre', v_row.plan_nombre,
        'periodo', v_periodo, 'frecuencia', v_row.frecuencia
      )
    ) RETURNING id INTO v_cargo_id;

    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_nombre, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, v_row.persona_id, 'FINANZAS', 'CARGO_RECURRENTE',
      v_titulo,
      v_row.plan_nombre || ' · ' || v_concepto,
      v_row.monto,
      'Sistema (cron)',
      jsonb_build_object('monto', v_row.monto, 'plan_id', v_row.plan_id, 'periodo', v_periodo, 'cargo_id', v_cargo_id)
    );

    v_cargos_creados := v_cargos_creados + 1;

    -- ----------------------------------------------------------------------------
    -- Consumo automático del SALDO A FAVOR (FIFO) sobre la cuota recurrente recién
    -- creada. Solo aplica a cuotas recurrentes (este es justamente ese motor).
    -- ----------------------------------------------------------------------------
    v_saldo_cargo   := v_row.monto;
    v_credito_usado := 0;

    FOR v_mov IN
      SELECT id, monto_disponible
      FROM movimiento
      WHERE academia_id = p_academia_id
        AND persona_id = v_row.persona_id
        AND monto_disponible > 0
      ORDER BY created_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_saldo_cargo <= 0;

      v_aplicar := LEAST(v_mov.monto_disponible, v_saldo_cargo);

      INSERT INTO aplicacion_movimiento (academia_id, movimiento_id, cargo_id, monto_aplicado)
      VALUES (p_academia_id, v_mov.id, v_cargo_id, v_aplicar);

      UPDATE movimiento
      SET monto_disponible = monto_disponible - v_aplicar
      WHERE id = v_mov.id;

      v_saldo_cargo   := v_saldo_cargo - v_aplicar;
      v_credito_usado := v_credito_usado + v_aplicar;
    END LOOP;

    IF v_credito_usado > 0 THEN
      v_nuevo_estado := CASE
        WHEN v_saldo_cargo <= 0            THEN 'liquidado'
        WHEN v_saldo_cargo < v_row.monto   THEN 'parcial'
        ELSE 'pendiente'
      END;

      -- Baja el saldo del cargo (trigger ajusta saldo_acumulado).
      UPDATE cargo
      SET saldo_pendiente   = v_saldo_cargo,
          estado_financiero = v_nuevo_estado,
          updated_at        = now()
      WHERE id = v_cargo_id;

      INSERT INTO evento_timeline (
        id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_nombre, metadata
      ) VALUES (
        gen_random_uuid(), p_academia_id, v_row.persona_id, 'FINANZAS', 'PAGO_ABONO',
        'Pago recibido',
        'Saldo a favor aplicado · ' || v_concepto,
        v_credito_usado,
        'Sistema (cron)',
        jsonb_build_object('monto', v_credito_usado, 'cargo_id', v_cargo_id, 'tipo', 'saldo_a_favor')
      );

      v_credito_total := v_credito_total + v_credito_usado;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success',            true,
    'cargos_creados',     v_cargos_creados,
    'omitidos_duplicado', v_omitidos,
    'saldo_favor_aplicado', v_credito_total,
    'fecha',              p_fecha
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5.5 crear_cargo_manual_v1 → CARGO_UNICO (o INSCRIPCION si el concepto lo es)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_cargo_manual_v1(
  p_academia_id uuid,
  p_alumno_id   uuid,
  p_monto       numeric,
  p_concepto    text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_actor_id uuid;
  v_cargo_id uuid;
  v_es_inscripcion boolean;
BEGIN
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;
  IF p_monto <= 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;
  IF char_length(trim(COALESCE(p_concepto, ''))) = 0 THEN
    RAISE EXCEPTION 'CONCEPTO_REQUERIDO' USING ERRCODE = 'P0002';
  END IF;

  v_actor_id := sipra_auth.get_my_user_id();
  v_es_inscripcion := trim(p_concepto) ILIKE 'inscripci%';

  INSERT INTO cargo (
    academia_id, persona_id, concepto, monto_original, saldo_pendiente,
    estado_financiero, fecha_vencimiento, origen, metadata, created_by
  ) VALUES (
    p_academia_id, p_alumno_id, trim(p_concepto), p_monto, p_monto,
    'pendiente', current_date, 'manual',
    jsonb_build_object('manual', true, 'cargo_unico', true),
    v_actor_id
  ) RETURNING id INTO v_cargo_id;

  INSERT INTO evento_timeline (
    id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_id, metadata
  ) VALUES (
    gen_random_uuid(), p_academia_id, p_alumno_id, 'FINANZAS',
    CASE WHEN v_es_inscripcion THEN 'INSCRIPCION' ELSE 'CARGO_UNICO' END,
    CASE WHEN v_es_inscripcion THEN 'Cargo: Inscripción' ELSE 'Cargo individual' END,
    trim(p_concepto),
    p_monto,
    v_actor_id,
    jsonb_build_object('monto', p_monto, 'cargo_id', v_cargo_id)
  );

  RETURN jsonb_build_object('success', true, 'cargo_id', v_cargo_id);
END;
$$;

-- ------------------------------------------------------------------------------
-- 5.6 crear_cargo_manual_v2 → CARGO_UNICO / INSCRIPCION
-- ------------------------------------------------------------------------------
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
  v_es_inscripcion boolean;
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
  v_es_inscripcion := (p_origen = 'inscripcion') OR (trim(p_concepto) ILIKE 'inscripci%');

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
    id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_id, metadata
  ) VALUES (
    gen_random_uuid(), p_academia_id, p_alumno_id, 'FINANZAS',
    CASE WHEN v_es_inscripcion THEN 'INSCRIPCION' ELSE 'CARGO_UNICO' END,
    CASE WHEN v_es_inscripcion THEN 'Cargo: Inscripción' ELSE 'Cargo individual' END,
    v_concepto,
    p_monto,
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

-- ------------------------------------------------------------------------------
-- 5.7 crear_cargo_individual_v1 → CARGO_UNICO / INSCRIPCION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_cargo_individual_v1(
  p_academia_id      uuid,
  p_persona_id       uuid,
  p_concepto         text,
  p_monto            numeric,
  p_fecha_vencimiento date,
  p_origen           text DEFAULT 'manual'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_actor_id uuid;
  v_cargo_id uuid;
  v_es_inscripcion boolean;
BEGIN
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;
  IF p_monto <= 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;
  IF char_length(trim(p_concepto)) = 0 THEN
    RAISE EXCEPTION 'CONCEPTO_REQUERIDO' USING ERRCODE = 'P0002';
  END IF;

  v_actor_id := sipra_auth.get_my_user_id();
  v_es_inscripcion := (p_origen = 'inscripcion') OR (trim(p_concepto) ILIKE 'inscripci%');

  INSERT INTO cargo (
    academia_id, persona_id, concepto, monto_original, saldo_pendiente,
    estado_financiero, fecha_vencimiento, origen, metadata
  ) VALUES (
    p_academia_id, p_persona_id, p_concepto, p_monto, p_monto,
    'pendiente', p_fecha_vencimiento, p_origen,
    jsonb_build_object('manual', true)
  ) RETURNING id INTO v_cargo_id;

  INSERT INTO evento_timeline (
    id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_id, metadata
  ) VALUES (
    gen_random_uuid(), p_academia_id, p_persona_id, 'FINANZAS',
    CASE WHEN v_es_inscripcion THEN 'INSCRIPCION' ELSE 'CARGO_UNICO' END,
    CASE WHEN v_es_inscripcion THEN 'Cargo: Inscripción' ELSE 'Cargo individual' END,
    trim(p_concepto),
    p_monto,
    v_actor_id,
    jsonb_build_object('monto', p_monto, 'cargo_id', v_cargo_id)
  );

  RETURN jsonb_build_object('success', true, 'cargo_id', v_cargo_id);
END;
$$;

-- ------------------------------------------------------------------------------
-- 5.8 crear_cargo_grupal_v1 → CARGO_MASIVO
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_cargo_grupal_v1(
  p_academia_id    uuid,
  p_grupo_id       uuid,
  p_concepto       text,
  p_monto          numeric,
  p_fecha_vencimiento date,
  p_excluded_persona_ids uuid[],
  p_idempotency_key text,
  p_origen         text DEFAULT 'grupal'
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
    SELECT pg.persona_id
    FROM persona_grupo pg
    JOIN persona p ON p.id = pg.persona_id
    WHERE pg.academia_id = p_academia_id
      AND pg.grupo_id = p_grupo_id
      AND pg.estado = 'activo'
      AND p.estado_registro = 'activo'
      AND NOT (pg.persona_id = ANY(p_excluded_persona_ids))
    ORDER BY pg.persona_id ASC
  LOOP
    INSERT INTO cargo (
      academia_id, persona_id, concepto, monto_original, saldo_pendiente,
      estado_financiero, fecha_vencimiento, origen, metadata
    ) VALUES (
      p_academia_id, v_persona.persona_id, p_concepto, p_monto, p_monto,
      'pendiente', p_fecha_vencimiento, p_origen,
      jsonb_build_object(
        'generado_grupal', true,
        'grupo_id', p_grupo_id,
        'idempotency_key', p_idempotency_key
      )
    ) RETURNING id INTO v_cargo_id;

    -- TIMELINE → CARGO_MASIVO
    v_tl_id := gen_random_uuid();
    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_id, metadata
    ) VALUES (
      v_tl_id, p_academia_id, v_persona.persona_id, 'FINANZAS', 'CARGO_MASIVO',
      'Cargo grupal',
      p_concepto || COALESCE(' · ' || v_grupo_nombre, ''),
      p_monto,
      v_actor_id,
      jsonb_build_object('monto', p_monto, 'grupo_id', p_grupo_id, 'cargo_id', v_cargo_id)
    );

    v_cargos_creados := v_cargos_creados + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'cargos_creados', v_cargos_creados,
    'idempotent_hit', false,
    'needs_refresh', true
  );
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5.9 procesar_visita_express_v1 → CARGO_UNICO + PAGO_ABONO
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.procesar_visita_express_v1(
  p_academia_id     uuid,
  p_alumno_id       uuid,
  p_monto_cargo     numeric,
  p_concepto        text   DEFAULT 'Visita / Clase suelta',
  p_monto_pago      numeric DEFAULT NULL,
  p_metodo_pago     text   DEFAULT 'efectivo',
  p_idempotency_key text   DEFAULT NULL,
  p_referencia      text   DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_actor_id        uuid;
  v_cargo_id        uuid := gen_random_uuid();
  v_mov_id          uuid;
  v_concepto        text;
  v_persona_nombre  text;
  v_solo_cargar     boolean;
  v_monto_pago      numeric;
  v_monto_aplicado  numeric;
  v_nuevo_saldo     numeric;
  v_nuevo_estado    text;
BEGIN
  -- 1. SEGURIDAD
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  -- 2. VALIDACIÓN
  IF p_monto_cargo IS NULL OR p_monto_cargo <= 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;

  v_monto_pago  := COALESCE(p_monto_pago, 0);
  v_solo_cargar := (v_monto_pago = 0);

  IF v_monto_pago < 0 OR v_monto_pago > p_monto_cargo THEN
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;

  SELECT (nombre || ' ' || COALESCE(apellido, '')) INTO v_persona_nombre
  FROM persona
  WHERE id = p_alumno_id AND academia_id = p_academia_id;
  IF v_persona_nombre IS NULL THEN
    RAISE EXCEPTION 'ALUMNO_NO_ENCONTRADO' USING ERRCODE = 'P0002';
  END IF;

  v_actor_id := sipra_auth.get_my_user_id();
  v_concepto := trim(COALESCE(p_concepto, 'Visita / Clase suelta'));

  -- 3. INSERTAR CARGO (trigger sync_saldo_acumulado lo suma al saldo del alumno)
  INSERT INTO cargo (
    id, academia_id, persona_id, concepto, monto_original, saldo_pendiente,
    estado_financiero, fecha_vencimiento, origen, metadata, created_by
  ) VALUES (
    v_cargo_id, p_academia_id, p_alumno_id, v_concepto, p_monto_cargo, p_monto_cargo,
    'pendiente', current_date, 'visita_express',
    jsonb_build_object('visita_express', true, 'cobrado_en_el_momento', NOT v_solo_cargar),
    v_actor_id
  );

  INSERT INTO evento_timeline (
    id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_id, actor_nombre, metadata
  ) VALUES (
    gen_random_uuid(), p_academia_id, p_alumno_id, 'FINANZAS', 'CARGO_UNICO',
    'Cargo individual',
    'Visita: ' || v_concepto,
    p_monto_cargo,
    v_actor_id, v_persona_nombre,
    jsonb_build_object('cargo_id', v_cargo_id, 'monto', p_monto_cargo)
  );

  -- 4. SI VINO MONTO_PAGO: cargar y cobrar en la misma transacción.
  IF NOT v_solo_cargar THEN
    IF p_idempotency_key IS NULL OR char_length(trim(p_idempotency_key)) = 0 THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_REQUERIDA' USING ERRCODE = 'P0002';
    END IF;

    v_mov_id := gen_random_uuid();

    INSERT INTO movimiento (
      id, academia_id, persona_id, monto_total, monto_disponible,
      metodo_pago, referencia, idempotency_key, created_by
    ) VALUES (
      v_mov_id, p_academia_id, p_alumno_id, v_monto_pago, 0,
      p_metodo_pago, p_referencia, p_idempotency_key, v_actor_id
    );

    v_monto_aplicado := LEAST(v_monto_pago, p_monto_cargo);
    v_nuevo_saldo    := p_monto_cargo - v_monto_aplicado;
    v_nuevo_estado   := CASE
      WHEN v_nuevo_saldo = 0           THEN 'liquidado'
      WHEN v_nuevo_saldo < p_monto_cargo THEN 'parcial'
      ELSE 'pendiente'
    END;

    INSERT INTO aplicacion_movimiento (academia_id, movimiento_id, cargo_id, monto_aplicado)
    VALUES (p_academia_id, v_mov_id, v_cargo_id, v_monto_aplicado);

    UPDATE cargo
    SET saldo_pendiente   = v_nuevo_saldo,
        estado_financiero = v_nuevo_estado,
        updated_at        = now()
    WHERE id = v_cargo_id;

    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_id, actor_nombre, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, p_alumno_id, 'FINANZAS', 'PAGO_ABONO',
      'Pago recibido',
      'Pago · ' || p_metodo_pago || ' · visita',
      v_monto_pago,
      v_actor_id, v_persona_nombre,
      jsonb_build_object('movimiento_id', v_mov_id, 'cargo_id', v_cargo_id, 'monto', v_monto_pago, 'metodo', p_metodo_pago)
    );
  END IF;

  RETURN jsonb_build_object(
    'success',     true,
    'modo',        CASE WHEN v_solo_cargar THEN 'solo_cargar' ELSE 'cargar_y_cobrar' END,
    'cargo_id',    v_cargo_id,
    'movimiento_id', v_mov_id,
    'monto_cargo', p_monto_cargo,
    'monto_pago',  v_monto_pago
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5.10 inscribir_alumno_a_grupo_v1 → eventos OPERATIVO (grupo / taller /
--      esquema) + cargo inicial como INSCRIPCION.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inscribir_alumno_a_grupo_v1(
  p_academia_id       uuid,
  p_persona_id        uuid,
  p_grupo_id          uuid,
  p_plan_cobro_id     uuid    DEFAULT NULL,
  p_monto             numeric DEFAULT 0,
  p_concepto          text    DEFAULT NULL,
  p_fecha_inscripcion date    DEFAULT current_date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_actor_id        uuid;
  v_pg_id           uuid;
  v_cargo_id        uuid;
  v_fecha_venc      date;
  v_plan            record;
  v_grupo           record;
  v_concepto        text;
  v_ya_activo       boolean;
  v_otros_grupos    int;
  v_plan_vinculado  int := 0;
  v_tipo_evento     text;
  v_titulo_evento   text;
BEGIN
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  IF p_monto < 0 THEN
    RAISE EXCEPTION 'MONTO_INVALIDO' USING ERRCODE = 'P0002';
  END IF;

  v_actor_id   := sipra_auth.get_my_user_id();
  v_fecha_venc := (date_trunc('month', p_fecha_inscripcion) + interval '1 month - 1 day')::date;

  SELECT id, nombre, es_temporal INTO v_grupo
  FROM grupo WHERE id = p_grupo_id AND academia_id = p_academia_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'GRUPO_NO_ENCONTRADO' USING ERRCODE = 'P0002';
  END IF;

  -- Contexto previo para tipificar el evento operativo.
  SELECT EXISTS (
    SELECT 1 FROM persona_grupo
    WHERE persona_id = p_persona_id AND grupo_id = p_grupo_id AND estado = 'activo'
  ) INTO v_ya_activo;

  SELECT count(*) INTO v_otros_grupos
  FROM persona_grupo
  WHERE academia_id = p_academia_id
    AND persona_id = p_persona_id
    AND grupo_id <> p_grupo_id
    AND estado = 'activo';

  -- 1) persona_grupo (upsert: reactivar si ya existía)
  INSERT INTO persona_grupo (academia_id, persona_id, grupo_id, estado, fecha_inscripcion, created_by)
  VALUES (p_academia_id, p_persona_id, p_grupo_id, 'activo', p_fecha_inscripcion, v_actor_id)
  ON CONFLICT (persona_id, grupo_id)
  DO UPDATE SET estado = 'activo', fecha_inscripcion = p_fecha_inscripcion, updated_at = now()
  RETURNING id INTO v_pg_id;

  -- 1.b) Evento OPERATIVO de alta en grupo (sólo si no estaba ya activo)
  IF NOT v_ya_activo THEN
    IF v_grupo.es_temporal THEN
      v_tipo_evento   := 'INSCRIPCION_TALLER';
      v_titulo_evento := 'Taller asignado';
    ELSIF v_otros_grupos > 0 THEN
      v_tipo_evento   := 'INSCRIPCION_NUEVO_GRUPO';
      v_titulo_evento := 'Alta en grupo extra';
    ELSE
      v_tipo_evento   := 'GRUPO_MUTACION';
      v_titulo_evento := 'Grupo asignado';
    END IF;

    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, p_persona_id, 'OPERATIVO', v_tipo_evento,
      v_titulo_evento, v_grupo.nombre, v_actor_id,
      jsonb_build_object('grupo_id', p_grupo_id)
    );
  END IF;

  -- 2) Plan de cobro (opcional)
  IF p_plan_cobro_id IS NOT NULL THEN
    SELECT id, academia_id, nombre, frecuencia INTO v_plan
    FROM planes_cobro WHERE id = p_plan_cobro_id;

    IF NOT FOUND OR v_plan.academia_id <> p_academia_id THEN
      RAISE EXCEPTION 'PLAN_NO_ENCONTRADO' USING ERRCODE = 'P0002';
    END IF;

    -- Vincular plan al alumno (idempotente)
    INSERT INTO alumno_planes (academia_id, alumno_id, plan_cobro_id)
    VALUES (p_academia_id, p_persona_id, p_plan_cobro_id)
    ON CONFLICT (alumno_id, plan_cobro_id) DO NOTHING;
    GET DIAGNOSTICS v_plan_vinculado = ROW_COUNT;

    -- 2.b) Evento OPERATIVO de esquema asignado (sólo si fue vínculo nuevo)
    IF v_plan_vinculado > 0 THEN
      INSERT INTO evento_timeline (
        id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
      ) VALUES (
        gen_random_uuid(), p_academia_id, p_persona_id, 'OPERATIVO', 'ESQUEMA_MUTACION',
        'Esquema asignado', v_plan.nombre, v_actor_id,
        jsonb_build_object('plan_id', p_plan_cobro_id)
      );
    END IF;

    v_concepto := COALESCE(NULLIF(trim(p_concepto), ''), v_plan.nombre);
  ELSE
    v_concepto := COALESCE(NULLIF(trim(p_concepto), ''), 'Cargo inicial');
  END IF;

  -- 3) Cargo inicial (si hay monto > 0) → INSCRIPCION
  IF p_monto > 0 THEN
    INSERT INTO cargo (
      academia_id, persona_id, concepto, monto_original, saldo_pendiente,
      estado_financiero, fecha_vencimiento, origen, metadata
    ) VALUES (
      p_academia_id, p_persona_id, v_concepto, p_monto, p_monto,
      'pendiente', v_fecha_venc, 'inscripcion',
      jsonb_build_object('grupo_id', p_grupo_id, 'plan_id', p_plan_cobro_id, 'inscripcion_inicial', true)
    ) RETURNING id INTO v_cargo_id;

    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, monto, actor_id, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, p_persona_id, 'FINANZAS', 'INSCRIPCION',
      'Cargo: Inscripción',
      v_concepto || ' · ' || v_grupo.nombre,
      p_monto,
      v_actor_id,
      jsonb_build_object('monto', p_monto, 'grupo_id', p_grupo_id, 'plan_id', p_plan_cobro_id, 'cargo_id', v_cargo_id)
    );
  END IF;

  RETURN jsonb_build_object(
    'success',          true,
    'persona_grupo_id', v_pg_id,
    'cargo_id',         v_cargo_id
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5.11 agregar_persona_a_grupo_v1 → GRUPO_MUTACION (Grupo asignado)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.agregar_persona_a_grupo_v1(
  p_academia_id uuid,
  p_grupo_id    uuid,
  p_persona_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_rel_id uuid;
  v_estado text;
  v_grupo_nombre text;
  v_alta boolean := false;
BEGIN
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  SELECT id, estado INTO v_rel_id, v_estado
  FROM persona_grupo
  WHERE academia_id = p_academia_id AND grupo_id = p_grupo_id AND persona_id = p_persona_id;

  IF FOUND THEN
    IF v_estado = 'removido' THEN
      UPDATE persona_grupo SET estado = 'activo', updated_at = now() WHERE id = v_rel_id;
      v_alta := true;
    END IF;
  ELSE
    INSERT INTO persona_grupo (academia_id, grupo_id, persona_id, estado)
    VALUES (p_academia_id, p_grupo_id, p_persona_id, 'activo');
    v_alta := true;
  END IF;

  IF v_alta THEN
    SELECT nombre INTO v_grupo_nombre FROM grupo WHERE id = p_grupo_id AND academia_id = p_academia_id;
    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, p_persona_id, 'OPERATIVO', 'GRUPO_MUTACION',
      'Grupo asignado', v_grupo_nombre, sipra_auth.get_my_user_id(),
      jsonb_build_object('grupo_id', p_grupo_id)
    );
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ------------------------------------------------------------------------------
-- 5.12 remover_persona_de_grupo_v1 → GRUPO_MUTACION (Grupo removido)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remover_persona_de_grupo_v1(
  p_academia_id uuid,
  p_grupo_id    uuid,
  p_persona_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_removidos int;
  v_grupo_nombre text;
BEGIN
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  UPDATE persona_grupo
  SET estado = 'removido', fecha_remocion = now(), updated_at = now()
  WHERE academia_id = p_academia_id AND grupo_id = p_grupo_id AND persona_id = p_persona_id
    AND estado = 'activo';
  GET DIAGNOSTICS v_removidos = ROW_COUNT;

  IF v_removidos > 0 THEN
    SELECT nombre INTO v_grupo_nombre FROM grupo WHERE id = p_grupo_id AND academia_id = p_academia_id;
    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, p_persona_id, 'OPERATIVO', 'GRUPO_MUTACION',
      'Grupo removido', v_grupo_nombre, sipra_auth.get_my_user_id(),
      jsonb_build_object('grupo_id', p_grupo_id)
    );
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ------------------------------------------------------------------------------
-- 5.13 crear_aviso_grupal_v1 → OPERATIVO / AVISO_GRUPAL
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_aviso_grupal_v1(
  p_academia_id uuid,
  p_grupo_id    uuid,
  p_titulo      text,
  p_descripcion text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sipra_auth
AS $$
DECLARE
  v_persona record;
  v_actor_id uuid;
BEGIN
  IF NOT sipra_auth.can_write_to_academia(p_academia_id) THEN
    RAISE EXCEPTION 'ACCESO_DENEGADO' USING ERRCODE = 'P0001';
  END IF;

  v_actor_id := sipra_auth.get_my_user_id();

  FOR v_persona IN
    SELECT pg.persona_id FROM persona_grupo pg
    JOIN persona p ON p.id = pg.persona_id
    WHERE pg.academia_id = p_academia_id AND pg.grupo_id = p_grupo_id AND pg.estado = 'activo' AND p.estado_registro = 'activo'
  LOOP
    INSERT INTO evento_timeline (
      id, academia_id, persona_id, categoria, tipo, titulo, descripcion, actor_id, metadata
    ) VALUES (
      gen_random_uuid(), p_academia_id, v_persona.persona_id, 'OPERATIVO', 'AVISO_GRUPAL',
      p_titulo, p_descripcion, v_actor_id,
      jsonb_build_object('grupo_id', p_grupo_id)
    );
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;
