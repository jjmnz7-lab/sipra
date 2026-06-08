-- ============================================================================
-- SIPRA · SEED DE DATOS DE PRUEBA (DESTRUCTIVO)
-- ----------------------------------------------------------------------------
-- Nombres reales del esquema: academia, grupo, persona, persona_grupo,
-- alumno_planes, cargo, movimiento, aplicacion_movimiento, evento_timeline.
-- saldo_acumulado lo calcula el trigger trg_cargo_sync_saldo (no se setea a mano).
-- Owners de prueba (login):  owner1@sipra.dev / owner2@sipra.dev  ·  pass: Sipra2025!
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. LIMPIEZA TOTAL
-- ----------------------------------------------------------------------------
TRUNCATE TABLE
  public.aplicacion_movimiento,
  public.movimiento,
  public.cargo,
  public.evento_timeline,
  public.envio_sugerido,
  public.alumno_planes,
  public.persona_grupo,
  public.persona,
  public.planes_cobro,
  public.grupo,
  public.suscripcion_academia,
  public.usuario,
  public.academia
RESTART IDENTITY CASCADE;

-- Limpia los usuarios de auth de seeds previos (idempotencia).
DELETE FROM auth.identities WHERE user_id IN (
  'a1111111-1111-4111-8111-111111111111',
  'a2222222-2222-4222-8222-222222222222'
);
DELETE FROM auth.users WHERE id IN (
  'a1111111-1111-4111-8111-111111111111',
  'a2222222-2222-4222-8222-222222222222'
);

-- ----------------------------------------------------------------------------
-- 2. AUTH (owners) — necesarios porque movimiento.created_by es NOT NULL → usuario → auth.users
-- ----------------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES
(
  '00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'owner1@sipra.dev', crypt('Sipra2025!', gen_salt('bf')), now() - interval '120 days',
  '{"provider":"email","providers":["email"],"academia_id":"11111111-1111-4111-8111-111111111111","rol":"owner","claims_version":1}'::jsonb,
  '{"nombre":"Carlos Owner"}'::jsonb, now() - interval '120 days', now() - interval '120 days', '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000', 'a2222222-2222-4222-8222-222222222222',
  'authenticated', 'authenticated', 'owner2@sipra.dev', crypt('Sipra2025!', gen_salt('bf')), now() - interval '120 days',
  '{"provider":"email","providers":["email"],"academia_id":"22222222-2222-4222-8222-222222222222","rol":"owner","claims_version":1}'::jsonb,
  '{"nombre":"Ana Owner"}'::jsonb, now() - interval '120 days', now() - interval '120 days', '', '', '', ''
);

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES
('a1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111',
  '{"sub":"a1111111-1111-4111-8111-111111111111","email":"owner1@sipra.dev","email_verified":true,"phone_verified":false}'::jsonb,
  'email', now() - interval '5 days', now() - interval '120 days', now() - interval '120 days'),
('a2222222-2222-4222-8222-222222222222', 'a2222222-2222-4222-8222-222222222222',
  '{"sub":"a2222222-2222-4222-8222-222222222222","email":"owner2@sipra.dev","email_verified":true,"phone_verified":false}'::jsonb,
  'email', now() - interval '5 days', now() - interval '120 days', now() - interval '120 days');

-- ----------------------------------------------------------------------------
-- 2b. ACADEMIAS (2 escenarios de control)
-- ----------------------------------------------------------------------------
INSERT INTO public.academia (id, nombre, estado_tenant, timezone, config_cobro, multi_plan_enabled, allow_partial_payments, created_at) VALUES
('11111111-1111-4111-8111-111111111111', 'Club Deportivo Mazatlán', 'activa', 'America/Mazatlan',
  '{"regimen_alta":"completo","modo_prorrateo":"completo","cobra_inscripcion":false}'::jsonb, false, false, now() - interval '120 days'),
('22222222-2222-4222-8222-222222222222', 'Studio de Danza UpDance', 'activa', 'America/Mexico_City',
  '{"regimen_alta":"proporcional","modo_prorrateo":"proporcional","proporcional_redondeo":"10","cobra_inscripcion":false}'::jsonb, true, true, now() - interval '120 days');

-- Usuario owner por academia
INSERT INTO public.usuario (id, academia_id, nombre, apellido, email_snapshot, rol, estado, created_at) VALUES
('a1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'Carlos', 'Núñez', 'owner1@sipra.dev', 'owner', 'activo', now() - interval '120 days'),
('a2222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'Ana', 'Reyes', 'owner2@sipra.dev', 'owner', 'activo', now() - interval '120 days');

-- Suscripción activa por academia (requerida por can_write_to_academia)
INSERT INTO public.suscripcion_academia (academia_id, plan_codigo, estado, is_current, max_personas, max_usuarios, precio_mensual, moneda, fecha_inicio, created_by, created_at) VALUES
('11111111-1111-4111-8111-111111111111', 'pro',    'activa', true, 200, 5, 499, 'MXN', now() - interval '120 days', 'a1111111-1111-4111-8111-111111111111', now() - interval '120 days'),
('22222222-2222-4222-8222-222222222222', 'basico', 'activa', true, 100, 3, 299, 'MXN', now() - interval '120 days', 'a2222222-2222-4222-8222-222222222222', now() - interval '120 days');

-- ----------------------------------------------------------------------------
-- 3. CATÁLOGO DE PLANES DE COBRO
-- ----------------------------------------------------------------------------
-- Academia 1 (Fútbol): 1 plan único
INSERT INTO public.planes_cobro (id, academia_id, nombre, monto, frecuencia, activo, created_at) VALUES
('b0000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Mensualidad General', 800, 'mensual', true, now() - interval '115 days');

-- Academia 2 (Danza): 5 planes (uno archivado)
INSERT INTO public.planes_cobro (id, academia_id, nombre, monto, frecuencia, activo, created_at) VALUES
('b0000002-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'Plan 2 días', 750, 'mensual', true, now() - interval '115 days'),
('b0000003-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'Plan 5 días - Completo', 1200, 'mensual', true, now() - interval '115 days'),
('b0000004-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', 'Mensualidad Sabatina', 500, 'mensual', true, now() - interval '115 days'),
('b0000005-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', 'Clase Fitness Adultos', 90, 'por_visita', true, now() - interval '115 days'),
('b0000006-0000-4000-8000-000000000006', '22222222-2222-4222-8222-222222222222', 'Workshop Intensivo Verano', 600, 'pago_unico', false, now() - interval '110 days');

-- ----------------------------------------------------------------------------
-- 4. CATÁLOGO DE GRUPOS (con plan sugerido)
-- ----------------------------------------------------------------------------
INSERT INTO public.grupo (id, academia_id, nombre, descripcion, color, emoji, estado, orden_visual, plan_sugerido_id, created_at) VALUES
-- Academia 1
('c0000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Sub 9',  'Categoría infantil', 'azul',     '⚽', 'activo', 1, 'b0000001-0000-4000-8000-000000000001', now() - interval '110 days'),
('c0000002-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Sub 13', 'Categoría juvenil',  'verde',    '🥅', 'activo', 2, 'b0000001-0000-4000-8000-000000000001', now() - interval '110 days'),
-- Academia 2
('c0000003-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'Grupo Rosa (4-6 años)', 'Iniciación', 'rosa',   '🩰', 'activo', 1, NULL, now() - interval '110 days'),
('c0000004-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', 'Jazz Avanzado',          'Nivel alto', 'morado', '💃', 'activo', 2, NULL, now() - interval '110 days'),
('c0000005-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', 'Sabatino Intensivo',     'Solo sábados', 'naranja', '📅', 'activo', 3, 'b0000004-0000-4000-8000-000000000004', now() - interval '110 days'),
('c0000006-0000-4000-8000-000000000006', '22222222-2222-4222-8222-222222222222', 'Zumba Histórico',        'Grupo descontinuado', 'gris', '🎶', 'archivado', 4, NULL, now() - interval '100 days');

-- ----------------------------------------------------------------------------
-- 5. UNIVERSO DE ALUMNOS (10) — relaciones asimétricas
-- ----------------------------------------------------------------------------
INSERT INTO public.persona (id, academia_id, nombre, apellido, telefono_whatsapp, etiqueta, estado_registro, estado_global, created_at) VALUES
-- Academia 1 (Fútbol)
('d0000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Diego',  'Fútbol',   '6691000001', 'alumno', 'activo',   'al_corriente', now() - interval '90 days'),
('d0000002-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Mateo',  'Deuda',    '6691000002', 'alumno', 'activo',   'vencido',      now() - interval '88 days'),
('d0000003-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Bruno',  'Anulado',  '6691000003', 'alumno', 'activo',   'al_corriente', now() - interval '85 days'),
('d0000004-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'Iker',   'Suspendido','6691000004','alumno', 'inactivo', 'vencido',      now() - interval '80 days'),
-- Academia 2 (Danza)
('d0000005-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', 'Valentina', 'Multi',  '5551000005', 'alumno', 'activo',   'al_corriente', now() - interval '78 days'),
('d0000006-0000-4000-8000-000000000006', '22222222-2222-4222-8222-222222222222', 'Sofía',     'Morosa', '5551000006', 'alumno', 'activo',   'vencido',      now() - interval '76 days'),
('d0000007-0000-4000-8000-000000000007', '22222222-2222-4222-8222-222222222222', 'Emma',      'Fitness','5551000007', 'alumno', 'activo',   'pendiente',    now() - interval '70 days'),
('d0000008-0000-4000-8000-000000000008', '22222222-2222-4222-8222-222222222222', 'Regina',    'Huérfana','5551000008','alumno', 'activo',   'al_corriente', now() - interval '95 days'),
('d0000009-0000-4000-8000-000000000009', '22222222-2222-4222-8222-222222222222', 'Camila',    'SinAsignar','5551000009','alumno','activo',  'al_corriente', now() - interval '40 days'),
('d000000a-0000-4000-8000-00000000000a', '22222222-2222-4222-8222-222222222222', 'Lucía',     'Sabatina','5551000010','alumno', 'activo',   'vencido',      now() - interval '60 days');

-- 5b. Tabla puente alumno↔grupo (persona_grupo)
INSERT INTO public.persona_grupo (academia_id, persona_id, grupo_id, estado, fecha_inscripcion) VALUES
('11111111-1111-4111-8111-111111111111', 'd0000001-0000-4000-8000-000000000001', 'c0000001-0000-4000-8000-000000000001', 'activo', now() - interval '90 days'),
('11111111-1111-4111-8111-111111111111', 'd0000002-0000-4000-8000-000000000002', 'c0000002-0000-4000-8000-000000000002', 'activo', now() - interval '88 days'),
('11111111-1111-4111-8111-111111111111', 'd0000003-0000-4000-8000-000000000003', 'c0000001-0000-4000-8000-000000000001', 'activo', now() - interval '85 days'),
('11111111-1111-4111-8111-111111111111', 'd0000004-0000-4000-8000-000000000004', 'c0000002-0000-4000-8000-000000000002', 'activo', now() - interval '80 days'),
-- Valentina: multigrupo (Grupo Rosa + Sabatino Intensivo)
('22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'c0000003-0000-4000-8000-000000000003', 'activo', now() - interval '78 days'),
('22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'c0000005-0000-4000-8000-000000000005', 'activo', now() - interval '78 days'),
('22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', 'c0000004-0000-4000-8000-000000000004', 'activo', now() - interval '76 days'),
('22222222-2222-4222-8222-222222222222', 'd0000007-0000-4000-8000-000000000007', 'c0000004-0000-4000-8000-000000000004', 'activo', now() - interval '70 days'),
('22222222-2222-4222-8222-222222222222', 'd0000008-0000-4000-8000-000000000008', 'c0000004-0000-4000-8000-000000000004', 'activo', now() - interval '95 days'),
('22222222-2222-4222-8222-222222222222', 'd000000a-0000-4000-8000-00000000000a', 'c0000005-0000-4000-8000-000000000005', 'activo', now() - interval '60 days');
-- (Camila NO tiene grupo → huérfana de grupo)

-- 5c. Tabla puente alumno↔plan (alumno_planes)
INSERT INTO public.alumno_planes (academia_id, alumno_id, plan_cobro_id, created_at) VALUES
('11111111-1111-4111-8111-111111111111', 'd0000001-0000-4000-8000-000000000001', 'b0000001-0000-4000-8000-000000000001', now() - interval '90 days'),
('11111111-1111-4111-8111-111111111111', 'd0000002-0000-4000-8000-000000000002', 'b0000001-0000-4000-8000-000000000001', now() - interval '88 days'),
('11111111-1111-4111-8111-111111111111', 'd0000003-0000-4000-8000-000000000003', 'b0000001-0000-4000-8000-000000000001', now() - interval '85 days'),
('11111111-1111-4111-8111-111111111111', 'd0000004-0000-4000-8000-000000000004', 'b0000001-0000-4000-8000-000000000001', now() - interval '80 days'),
-- Valentina: multiplan (Plan 2 días + Mensualidad Sabatina)
('22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'b0000002-0000-4000-8000-000000000002', now() - interval '78 days'),
('22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'b0000004-0000-4000-8000-000000000004', now() - interval '78 days'),
('22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', 'b0000003-0000-4000-8000-000000000003', now() - interval '76 days'),
('22222222-2222-4222-8222-222222222222', 'd0000007-0000-4000-8000-000000000007', 'b0000005-0000-4000-8000-000000000005', now() - interval '70 days'),
-- Regina: SOLO plan archivado (Workshop) → huérfana financiera (cron la ignora)
('22222222-2222-4222-8222-222222222222', 'd0000008-0000-4000-8000-000000000008', 'b0000006-0000-4000-8000-000000000006', now() - interval '95 days'),
('22222222-2222-4222-8222-222222222222', 'd000000a-0000-4000-8000-00000000000a', 'b0000004-0000-4000-8000-000000000004', now() - interval '60 days');
-- (Camila NO tiene plan → huérfana de plan)

-- ----------------------------------------------------------------------------
-- 6. LEDGER CRONOLÓGICO (cargos, abonos, anulaciones)
--    El trigger trg_cargo_sync_saldo recalcula persona.saldo_acumulado = Σ saldo_pendiente.
-- ----------------------------------------------------------------------------

-- ===== CARGOS (estado final) =====
INSERT INTO public.cargo (id, academia_id, persona_id, grupo_id_origen, concepto, monto_original, saldo_pendiente, estado_financiero, origen, fecha_creacion, fecha_vencimiento, metadata, created_by) VALUES
-- Diego (Caso Éxito): mensualidad 800 liquidada
('e0000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'd0000001-0000-4000-8000-000000000001', 'c0000001-0000-4000-8000-000000000001', 'Mensualidad Marzo 2026', 800, 0, 'liquidado', 'recurrente', now() - interval '60 days', (now() - interval '45 days')::date, '{"plan_id":"b0000001-0000-4000-8000-000000000001"}'::jsonb, 'a1111111-1111-4111-8111-111111111111'),
-- Mateo (Deuda Acumulada): 2 meses sin pagar
('e0000002-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'd0000002-0000-4000-8000-000000000002', 'c0000002-0000-4000-8000-000000000002', 'Mensualidad Marzo 2026', 800, 800, 'vencido', 'recurrente', now() - interval '62 days', (now() - interval '47 days')::date, '{"plan_id":"b0000001-0000-4000-8000-000000000001"}'::jsonb, 'a1111111-1111-4111-8111-111111111111'),
('e0000003-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'd0000002-0000-4000-8000-000000000002', 'c0000002-0000-4000-8000-000000000002', 'Mensualidad Abril 2026', 800, 800, 'vencido', 'recurrente', now() - interval '31 days', (now() - interval '16 days')::date, '{"plan_id":"b0000001-0000-4000-8000-000000000001"}'::jsonb, 'a1111111-1111-4111-8111-111111111111'),
-- Bruno (Caso Anulación): mensualidad pagada + cargo erróneo anulado
('e0000004-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'd0000003-0000-4000-8000-000000000003', 'c0000001-0000-4000-8000-000000000001', 'Mensualidad Abril 2026', 800, 0, 'liquidado', 'recurrente', now() - interval '50 days', (now() - interval '35 days')::date, '{"plan_id":"b0000001-0000-4000-8000-000000000001"}'::jsonb, 'a1111111-1111-4111-8111-111111111111'),
('e0000005-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'd0000003-0000-4000-8000-000000000003', NULL, 'Cargo por error (uniforme duplicado)', 1000, 0, 'anulado', 'manual', now() - interval '20 days', (now() - interval '5 days')::date, '{"anulado":true}'::jsonb, 'a1111111-1111-4111-8111-111111111111'),
-- Iker (Suspendido con deuda)
('e0000006-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'd0000004-0000-4000-8000-000000000004', 'c0000002-0000-4000-8000-000000000002', 'Mensualidad Marzo 2026', 800, 800, 'vencido', 'recurrente', now() - interval '40 days', (now() - interval '25 days')::date, '{"plan_id":"b0000001-0000-4000-8000-000000000001"}'::jsonb, 'a1111111-1111-4111-8111-111111111111'),
-- Valentina (Multiplan, al día)
('e0000007-0000-4000-8000-000000000007', '22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'c0000003-0000-4000-8000-000000000003', 'Plan 2 días - Abril', 750, 0, 'liquidado', 'recurrente', now() - interval '35 days', (now() - interval '20 days')::date, '{"plan_id":"b0000002-0000-4000-8000-000000000002"}'::jsonb, 'a2222222-2222-4222-8222-222222222222'),
('e0000008-0000-4000-8000-000000000008', '22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'c0000005-0000-4000-8000-000000000005', 'Mensualidad Sabatina - Abril', 500, 0, 'liquidado', 'recurrente', now() - interval '35 days', (now() - interval '20 days')::date, '{"plan_id":"b0000004-0000-4000-8000-000000000004"}'::jsonb, 'a2222222-2222-4222-8222-222222222222'),
-- Sofía (Morosa / abonos parciales)
('e0000009-0000-4000-8000-000000000009', '22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', 'c0000004-0000-4000-8000-000000000004', 'Plan 5 días - Abril', 1200, 400, 'parcial', 'recurrente', now() - interval '42 days', (now() - interval '27 days')::date, '{"plan_id":"b0000003-0000-4000-8000-000000000003"}'::jsonb, 'a2222222-2222-4222-8222-222222222222'),
('e000000a-0000-4000-8000-00000000000a', '22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', NULL, 'Taller extra de contemporáneo', 150, 150, 'pendiente', 'manual', now() - interval '25 days', (now() - interval '10 days')::date, '{"manual":true}'::jsonb, 'a2222222-2222-4222-8222-222222222222'),
-- Emma (Fitness por visita)
('e000000b-0000-4000-8000-00000000000b', '22222222-2222-4222-8222-222222222222', 'd0000007-0000-4000-8000-000000000007', 'c0000004-0000-4000-8000-000000000004', 'Clase Fitness Adultos', 90, 0, 'liquidado', 'manual', now() - interval '20 days', (now() - interval '20 days')::date, '{"plan_id":"b0000005-0000-4000-8000-000000000005"}'::jsonb, 'a2222222-2222-4222-8222-222222222222'),
('e000000c-0000-4000-8000-00000000000c', '22222222-2222-4222-8222-222222222222', 'd0000007-0000-4000-8000-000000000007', 'c0000004-0000-4000-8000-000000000004', 'Clase Fitness Adultos', 90, 90, 'pendiente', 'manual', now() - interval '5 days', (now() - interval '5 days')::date, '{"plan_id":"b0000005-0000-4000-8000-000000000005"}'::jsonb, 'a2222222-2222-4222-8222-222222222222'),
-- Regina (Huérfana financiera): workshop pagado (plan ahora archivado)
('e000000d-0000-4000-8000-00000000000d', '22222222-2222-4222-8222-222222222222', 'd0000008-0000-4000-8000-000000000008', 'c0000004-0000-4000-8000-000000000004', 'Workshop Intensivo Verano', 600, 0, 'liquidado', 'inscripcion', now() - interval '75 days', (now() - interval '60 days')::date, '{"plan_id":"b0000006-0000-4000-8000-000000000006"}'::jsonb, 'a2222222-2222-4222-8222-222222222222'),
-- Lucía (Sabatina con abono parcial)
('e000000e-0000-4000-8000-00000000000e', '22222222-2222-4222-8222-222222222222', 'd000000a-0000-4000-8000-00000000000a', 'c0000005-0000-4000-8000-000000000005', 'Mensualidad Sabatina - Abril', 500, 300, 'parcial', 'recurrente', now() - interval '30 days', (now() - interval '15 days')::date, '{"plan_id":"b0000004-0000-4000-8000-000000000004"}'::jsonb, 'a2222222-2222-4222-8222-222222222222');

-- ===== MOVIMIENTOS (abonos) =====
INSERT INTO public.movimiento (id, academia_id, persona_id, monto_total, monto_disponible, metodo_pago, estado, idempotency_key, fecha_pago, created_by, created_at) VALUES
('f0000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'd0000001-0000-4000-8000-000000000001', 800, 0, 'efectivo',      'registrado', 'seed-mv-diego',    now() - interval '58 days', 'a1111111-1111-4111-8111-111111111111', now() - interval '58 days'),
('f0000002-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'd0000003-0000-4000-8000-000000000003', 800, 0, 'transferencia', 'registrado', 'seed-mv-bruno',    now() - interval '48 days', 'a1111111-1111-4111-8111-111111111111', now() - interval '48 days'),
('f0000003-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 750, 0, 'tarjeta',       'registrado', 'seed-mv-vale-2d',  now() - interval '34 days', 'a2222222-2222-4222-8222-222222222222', now() - interval '34 days'),
('f0000004-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 500, 0, 'tarjeta',       'registrado', 'seed-mv-vale-sab', now() - interval '34 days', 'a2222222-2222-4222-8222-222222222222', now() - interval '34 days'),
('f0000005-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', 500, 0, 'efectivo',      'registrado', 'seed-mv-sofia-1',  now() - interval '30 days', 'a2222222-2222-4222-8222-222222222222', now() - interval '30 days'),
('f0000006-0000-4000-8000-000000000006', '22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', 300, 0, 'efectivo',      'registrado', 'seed-mv-sofia-2',  now() - interval '15 days', 'a2222222-2222-4222-8222-222222222222', now() - interval '15 days'),
('f0000007-0000-4000-8000-000000000007', '22222222-2222-4222-8222-222222222222', 'd0000007-0000-4000-8000-000000000007', 90,  0, 'efectivo',      'registrado', 'seed-mv-emma',     now() - interval '19 days', 'a2222222-2222-4222-8222-222222222222', now() - interval '19 days'),
('f0000008-0000-4000-8000-000000000008', '22222222-2222-4222-8222-222222222222', 'd0000008-0000-4000-8000-000000000008', 600, 0, 'transferencia', 'registrado', 'seed-mv-regina',   now() - interval '73 days', 'a2222222-2222-4222-8222-222222222222', now() - interval '73 days'),
('f0000009-0000-4000-8000-000000000009', '22222222-2222-4222-8222-222222222222', 'd000000a-0000-4000-8000-00000000000a', 200, 0, 'efectivo',      'registrado', 'seed-mv-lucia',    now() - interval '20 days', 'a2222222-2222-4222-8222-222222222222', now() - interval '20 days');

-- ===== APLICACIONES (abono → cargo) =====
INSERT INTO public.aplicacion_movimiento (academia_id, movimiento_id, cargo_id, monto_aplicado, estado, created_at) VALUES
('11111111-1111-4111-8111-111111111111', 'f0000001-0000-4000-8000-000000000001', 'e0000001-0000-4000-8000-000000000001', 800, 'activa', now() - interval '58 days'),
('11111111-1111-4111-8111-111111111111', 'f0000002-0000-4000-8000-000000000002', 'e0000004-0000-4000-8000-000000000004', 800, 'activa', now() - interval '48 days'),
('22222222-2222-4222-8222-222222222222', 'f0000003-0000-4000-8000-000000000003', 'e0000007-0000-4000-8000-000000000007', 750, 'activa', now() - interval '34 days'),
('22222222-2222-4222-8222-222222222222', 'f0000004-0000-4000-8000-000000000004', 'e0000008-0000-4000-8000-000000000008', 500, 'activa', now() - interval '34 days'),
('22222222-2222-4222-8222-222222222222', 'f0000005-0000-4000-8000-000000000005', 'e0000009-0000-4000-8000-000000000009', 500, 'activa', now() - interval '30 days'),
('22222222-2222-4222-8222-222222222222', 'f0000006-0000-4000-8000-000000000006', 'e0000009-0000-4000-8000-000000000009', 300, 'activa', now() - interval '15 days'),
('22222222-2222-4222-8222-222222222222', 'f0000007-0000-4000-8000-000000000007', 'e000000b-0000-4000-8000-00000000000b', 90,  'activa', now() - interval '19 days'),
('22222222-2222-4222-8222-222222222222', 'f0000008-0000-4000-8000-000000000008', 'e000000d-0000-4000-8000-00000000000d', 600, 'activa', now() - interval '73 days'),
('22222222-2222-4222-8222-222222222222', 'f0000009-0000-4000-8000-000000000009', 'e000000e-0000-4000-8000-00000000000e', 200, 'activa', now() - interval '20 days');

-- ===== TIMELINE (Ledger cronológico narrativo) =====
INSERT INTO public.evento_timeline (academia_id, persona_id, categoria, tipo, titulo, descripcion, fecha_evento, actor_id, actor_nombre, metadata) VALUES
-- Diego
('11111111-1111-4111-8111-111111111111', 'd0000001-0000-4000-8000-000000000001', 'financiero', 'cargo_generado',   'Mensualidad Marzo 2026', 'Cargo recurrente por $800', now() - interval '60 days', NULL, 'Sistema (cron)', '{"monto":800,"plan_id":"b0000001-0000-4000-8000-000000000001"}'::jsonb),
('11111111-1111-4111-8111-111111111111', 'd0000001-0000-4000-8000-000000000001', 'financiero', 'abono_registrado', 'Pago registrado', 'Pago por $800 efectivo', now() - interval '58 days', 'a1111111-1111-4111-8111-111111111111', 'Carlos Núñez', '{"monto":800,"movimiento_id":"f0000001-0000-4000-8000-000000000001","metodo":"efectivo"}'::jsonb),
-- Mateo
('11111111-1111-4111-8111-111111111111', 'd0000002-0000-4000-8000-000000000002', 'financiero', 'cargo_generado', 'Mensualidad Marzo 2026', 'Cargo recurrente por $800', now() - interval '62 days', NULL, 'Sistema (cron)', '{"monto":800}'::jsonb),
('11111111-1111-4111-8111-111111111111', 'd0000002-0000-4000-8000-000000000002', 'financiero', 'cargo_generado', 'Mensualidad Abril 2026', 'Cargo recurrente por $800', now() - interval '31 days', NULL, 'Sistema (cron)', '{"monto":800}'::jsonb),
-- Bruno
('11111111-1111-4111-8111-111111111111', 'd0000003-0000-4000-8000-000000000003', 'financiero', 'cargo_generado',   'Mensualidad Abril 2026', 'Cargo recurrente por $800', now() - interval '50 days', NULL, 'Sistema (cron)', '{"monto":800}'::jsonb),
('11111111-1111-4111-8111-111111111111', 'd0000003-0000-4000-8000-000000000003', 'financiero', 'abono_registrado', 'Pago registrado', 'Pago por $800 transferencia', now() - interval '48 days', 'a1111111-1111-4111-8111-111111111111', 'Carlos Núñez', '{"monto":800,"movimiento_id":"f0000002-0000-4000-8000-000000000002","metodo":"transferencia"}'::jsonb),
('11111111-1111-4111-8111-111111111111', 'd0000003-0000-4000-8000-000000000003', 'financiero', 'cargo_generado', 'Cargo por error (uniforme duplicado)', 'Cargo manual por $1000', now() - interval '20 days', 'a1111111-1111-4111-8111-111111111111', 'Carlos Núñez', '{"monto":1000}'::jsonb),
('11111111-1111-4111-8111-111111111111', 'd0000003-0000-4000-8000-000000000003', 'financiero', 'cargo_anulado', 'Cargo anulado', 'Se anuló el cargo erróneo de $1000', now() - interval '20 days' + interval '1 hour', 'a1111111-1111-4111-8111-111111111111', 'Carlos Núñez', '{"monto":1000,"motivo":"Cargo duplicado por error"}'::jsonb),
-- Iker
('11111111-1111-4111-8111-111111111111', 'd0000004-0000-4000-8000-000000000004', 'financiero', 'cargo_generado', 'Mensualidad Marzo 2026', 'Cargo recurrente por $800', now() - interval '40 days', NULL, 'Sistema (cron)', '{"monto":800}'::jsonb),
-- Valentina
('22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'financiero', 'cargo_generado',   'Plan 2 días - Abril', 'Cargo recurrente por $750', now() - interval '35 days', NULL, 'Sistema (cron)', '{"monto":750}'::jsonb),
('22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'financiero', 'cargo_generado',   'Mensualidad Sabatina - Abril', 'Cargo recurrente por $500', now() - interval '35 days', NULL, 'Sistema (cron)', '{"monto":500}'::jsonb),
('22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'financiero', 'abono_registrado', 'Pago registrado', 'Pago por $750 tarjeta', now() - interval '34 days', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"monto":750,"movimiento_id":"f0000003-0000-4000-8000-000000000003","metodo":"tarjeta"}'::jsonb),
('22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'financiero', 'abono_registrado', 'Pago registrado', 'Pago por $500 tarjeta', now() - interval '34 days' + interval '5 minutes', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"monto":500,"movimiento_id":"f0000004-0000-4000-8000-000000000004","metodo":"tarjeta"}'::jsonb),
-- Sofía
('22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', 'financiero', 'cargo_generado',   'Plan 5 días - Abril', 'Cargo recurrente por $1200', now() - interval '42 days', NULL, 'Sistema (cron)', '{"monto":1200}'::jsonb),
('22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', 'financiero', 'abono_registrado', 'Pago registrado', 'Abono parcial por $500', now() - interval '30 days', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"monto":500,"movimiento_id":"f0000005-0000-4000-8000-000000000005","metodo":"efectivo"}'::jsonb),
('22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', 'financiero', 'cargo_generado',   'Taller extra de contemporáneo', 'Cargo manual por $150', now() - interval '25 days', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"monto":150}'::jsonb),
('22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', 'financiero', 'abono_registrado', 'Pago registrado', 'Abono parcial por $300', now() - interval '15 days', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"monto":300,"movimiento_id":"f0000006-0000-4000-8000-000000000006","metodo":"efectivo"}'::jsonb),
-- Emma
('22222222-2222-4222-8222-222222222222', 'd0000007-0000-4000-8000-000000000007', 'financiero', 'cargo_generado',   'Clase Fitness Adultos', 'Cargo por visita $90', now() - interval '20 days', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"monto":90}'::jsonb),
('22222222-2222-4222-8222-222222222222', 'd0000007-0000-4000-8000-000000000007', 'financiero', 'abono_registrado', 'Pago registrado', 'Pago por $90 efectivo', now() - interval '19 days', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"monto":90,"movimiento_id":"f0000007-0000-4000-8000-000000000007","metodo":"efectivo"}'::jsonb),
('22222222-2222-4222-8222-222222222222', 'd0000007-0000-4000-8000-000000000007', 'financiero', 'cargo_generado',   'Clase Fitness Adultos', 'Cargo por visita $90', now() - interval '5 days', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"monto":90}'::jsonb),
-- Regina
('22222222-2222-4222-8222-222222222222', 'd0000008-0000-4000-8000-000000000008', 'financiero', 'cargo_generado',   'Workshop Intensivo Verano', 'Cargo único por $600', now() - interval '75 days', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"monto":600}'::jsonb),
('22222222-2222-4222-8222-222222222222', 'd0000008-0000-4000-8000-000000000008', 'financiero', 'abono_registrado', 'Pago registrado', 'Pago por $600 transferencia', now() - interval '73 days', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"monto":600,"movimiento_id":"f0000008-0000-4000-8000-000000000008","metodo":"transferencia"}'::jsonb),
-- Lucía
('22222222-2222-4222-8222-222222222222', 'd000000a-0000-4000-8000-00000000000a', 'financiero', 'cargo_generado',   'Mensualidad Sabatina - Abril', 'Cargo recurrente por $500', now() - interval '30 days', NULL, 'Sistema (cron)', '{"monto":500}'::jsonb),
('22222222-2222-4222-8222-222222222222', 'd000000a-0000-4000-8000-00000000000a', 'financiero', 'abono_registrado', 'Pago registrado', 'Abono parcial por $200', now() - interval '20 days', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"monto":200,"movimiento_id":"f0000009-0000-4000-8000-000000000009","metodo":"efectivo"}'::jsonb);

COMMIT;
