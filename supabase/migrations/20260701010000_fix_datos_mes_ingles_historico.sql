-- ==============================================================================
-- Corrección de DATOS HISTÓRICOS: cargos y eventos de timeline cuya mensualidad
-- quedó etiquetada en inglés ("Mensualidad July 2026") por el bug de locale de
-- generar_cargos_recurrentes_v1 (ver 20260701000000_fix_mes_espanol_...).
--
-- Los 119 cargos de mensualidad generados el 2026-07-01 en cloud quedaron con el
-- mes en inglés. Esta migración traduce el mes a español SOLO cuando encuentra el
-- patrón exacto "Mensualidad <MesInglés> <AÑO 4 dígitos>", de modo que NO toca
-- conceptos legítimos como "Mensualidad Diablos" o "Mensualidad Hermano" (nombres
-- de grupo/plan). Es idempotente: en bases sin filas en inglés (local, fresh) es
-- un no-op.
-- ==============================================================================
DO $$
DECLARE
  v_n int;
  -- Mapa mes inglés → español (el server locale puede haber emitido cualquiera).
  v_meses constant text[][] := ARRAY[
    ARRAY['January','Enero'],   ARRAY['February','Febrero'], ARRAY['March','Marzo'],
    ARRAY['April','Abril'],     ARRAY['May','Mayo'],         ARRAY['June','Junio'],
    ARRAY['July','Julio'],      ARRAY['August','Agosto'],    ARRAY['September','Septiembre'],
    ARRAY['October','Octubre'], ARRAY['November','Noviembre'],ARRAY['December','Diciembre']
  ];
  v_en text;
  v_es text;
  i int;
BEGIN
  FOR i IN 1 .. array_length(v_meses, 1) LOOP
    v_en := v_meses[i][1];
    v_es := v_meses[i][2];

    -- 1) cargo.concepto  (forma exacta "Mensualidad <Mes> <AÑO>")
    UPDATE cargo
       SET concepto = replace(concepto, 'Mensualidad ' || v_en || ' ', 'Mensualidad ' || v_es || ' ')
     WHERE concepto ~ ('^Mensualidad ' || v_en || ' [0-9]{4}$');
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n > 0 THEN RAISE NOTICE 'cargo.concepto (%) -> % : % filas', v_en, v_es, v_n; END IF;

    -- 2) evento_timeline.titulo  (cargo_generado usa el concepto tal cual)
    UPDATE evento_timeline
       SET titulo = replace(titulo, 'Mensualidad ' || v_en || ' ', 'Mensualidad ' || v_es || ' ')
     WHERE titulo ~ ('^Mensualidad ' || v_en || ' [0-9]{4}$');
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n > 0 THEN RAISE NOTICE 'timeline.titulo (%) -> % : % filas', v_en, v_es, v_n; END IF;

    -- 3) evento_timeline.descripcion  (el mes aparece embebido: "... a Mensualidad
    --    July 2026", "Mensualidad July 2026: $...", "Mensualidad July 2026 · exento")
    UPDATE evento_timeline
       SET descripcion = replace(descripcion, 'Mensualidad ' || v_en || ' ', 'Mensualidad ' || v_es || ' ')
     WHERE descripcion ~ ('Mensualidad ' || v_en || ' [0-9]{4}');
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n > 0 THEN RAISE NOTICE 'timeline.descripcion (%) -> % : % filas', v_en, v_es, v_n; END IF;
  END LOOP;
END $$;
