-- ==============================================================================
-- 1. LIMPIEZA INICIAL DE TABLAS (Opcional, útil para re-sedear en local)
-- ==============================================================================
TRUNCATE TABLE public.aplicacion_movimiento CASCADE;
TRUNCATE TABLE public.movimiento CASCADE;
TRUNCATE TABLE public.cargo CASCADE;
TRUNCATE TABLE public.persona_grupo CASCADE;
TRUNCATE TABLE public.grupo CASCADE;
TRUNCATE TABLE public.persona CASCADE;
TRUNCATE TABLE public.usuario CASCADE;
TRUNCATE TABLE public.suscripcion_academia CASCADE;
TRUNCATE TABLE public.academia CASCADE;

-- Limpieza de usuarios auth de prueba removida para no chocar con la API oficial

-- ==============================================================================
-- 2. VARIABLES Y UUIDS ESTÁTICOS
-- ==============================================================================
-- Academias
DO $$
DECLARE
  v_academia1_id UUID := '11111111-1111-1111-1111-111111111111';
  v_academia2_id UUID := '22222222-2222-2222-2222-222222222222';
  
  -- Usuarios (auth.users)
  v_owner1_id UUID := '103c8fd2-f789-4ceb-aa19-e1b7c1726c4a';
  v_staff1_id UUID := 'e2f97370-829e-40cb-ae05-060013dd0096';
  v_owner2_id UUID := '8b5f18db-3486-4abe-9cb2-a4a18e36986f';
  v_staff2_id UUID := 'e911b22b-4eea-4936-a9a2-afc2870f9675';

  -- Personas (Alumnos Academia 1)
  v_alumno_al_corriente UUID := '30000000-0000-0000-0000-000000000001';
  v_alumno_vencido      UUID := '30000000-0000-0000-0000-000000000002';
  v_alumno_pendiente    UUID := '30000000-0000-0000-0000-000000000003';

  -- Grupos
  v_grupo_ballet UUID := '40000000-0000-0000-0000-000000000001';
  v_grupo_jazz   UUID := '40000000-0000-0000-0000-000000000002';
  v_grupo_karate UUID := '50000000-0000-0000-0000-000000000001';

  -- Movimientos y Cargos
  v_cargo1_id UUID := gen_random_uuid();
  v_cargo2_id UUID := gen_random_uuid();
  v_cargo3_id UUID := gen_random_uuid();
  v_mov1_id   UUID := gen_random_uuid();

BEGIN

  -- ==============================================================================
  
  -- 4. ACADEMIAS Y SUSCRIPCIONES
  -- ==============================================================================
  INSERT INTO public.academia (id, nombre, estado_tenant, timezone)
  VALUES 
  (v_academia1_id, 'Academia de Danza Ritmo', 'activa', 'America/Mexico_City'),
  (v_academia2_id, 'Dojo Artes Marciales Sur', 'activa', 'America/Mexico_City');

  INSERT INTO public.suscripcion_academia (academia_id, plan_codigo, estado, is_current, precio_mensual, moneda)
  VALUES 
  (v_academia1_id, 'pro', 'activa', true, 999.00, 'MXN'),
  (v_academia2_id, 'basico', 'activa', true, 499.00, 'MXN');

  -- ==============================================================================
  -- 5. USUARIOS PUBLIC
  -- ==============================================================================
  INSERT INTO public.usuario (id, academia_id, nombre, apellido, email_snapshot, rol, estado)
  VALUES 
  (v_owner1_id, v_academia1_id, 'Valeria', 'Ruiz', 'admin@ritmo.com', 'owner', 'activo'),
  (v_staff1_id, v_academia1_id, 'Martín', 'Soto', 'staff@ritmo.com', 'staff', 'activo'),
  (v_owner2_id, v_academia2_id, 'Sensei', 'Kenji', 'admin@dojo.com', 'owner', 'activo'),
  (v_staff2_id, v_academia2_id, 'Lucía', 'Mendez', 'staff@dojo.com', 'staff', 'activo');

  -- ==============================================================================
  -- 6. GRUPOS
  -- ==============================================================================
  INSERT INTO public.grupo (id, academia_id, nombre, descripcion, estado, created_by)
  VALUES 
  (v_grupo_ballet, v_academia1_id, 'Ballet Intermedio', 'Lunes y Miércoles 5PM', 'activo', v_owner1_id),
  (v_grupo_jazz, v_academia1_id, 'Jazz Principiantes', 'Martes y Jueves 4PM', 'activo', v_owner1_id),
  (v_grupo_karate, v_academia2_id, 'Karate Do Adultos', 'Sábados intensivo', 'activo', v_owner2_id);

  -- ==============================================================================
  -- 7. PERSONAS (ALUMNOS) - ACADEMIA 1
  -- ==============================================================================
  INSERT INTO public.persona (id, academia_id, nombre, apellido, telefono_whatsapp, etiqueta, estado_global, created_by)
  VALUES 
  (v_alumno_al_corriente, v_academia1_id, 'Sofía', 'López', '5511223344', 'alumno', 'al_corriente', v_staff1_id),
  (v_alumno_vencido, v_academia1_id, 'Carlos', 'Mendoza', '5599887766', 'alumno', 'vencido', v_staff1_id),
  (v_alumno_pendiente, v_academia1_id, 'Andrea', 'Gómez', '5544332211', 'alumno', 'pendiente', v_staff1_id);

  -- INSCRIPCIONES A GRUPOS
  INSERT INTO public.persona_grupo (academia_id, persona_id, grupo_id, estado, created_by)
  VALUES 
  (v_academia1_id, v_alumno_al_corriente, v_grupo_ballet, 'activo', v_staff1_id),
  (v_academia1_id, v_alumno_vencido, v_grupo_ballet, 'activo', v_staff1_id),
  (v_academia1_id, v_alumno_pendiente, v_grupo_jazz, 'activo', v_staff1_id);

  -- ==============================================================================
  -- 8. CARGOS Y PAGOS (CRONOLOGÍA)
  -- ==============================================================================
  
  -- CASO A: Alumno Ejemplar (Cargo pagado del mes pasado)
  INSERT INTO public.cargo (id, academia_id, persona_id, grupo_id_origen, concepto, monto_original, saldo_pendiente, fecha_creacion, fecha_vencimiento, estado_financiero, origen, created_by)
  VALUES 
  (v_cargo1_id, v_academia1_id, v_alumno_al_corriente, v_grupo_ballet, 'Mensualidad Abril 2026', 850.00, 0.00, (now() - interval '45 days'), (now() - interval '40 days'), 'liquidado', 'grupal', v_owner1_id);

  -- Se liquida con un movimiento
  INSERT INTO public.movimiento (id, academia_id, persona_id, monto_total, monto_disponible, fecha_pago, metodo_pago, estado, idempotency_key, created_by)
  VALUES 
  (v_mov1_id, v_academia1_id, v_alumno_al_corriente, 850.00, 0.00, (now() - interval '43 days'), 'transferencia', 'registrado', 'seed-idempotency-1', v_staff1_id);

  INSERT INTO public.aplicacion_movimiento (academia_id, movimiento_id, cargo_id, monto_aplicado, estado)
  VALUES 
  (v_academia1_id, v_mov1_id, v_cargo1_id, 850.00, 'activa');

  -- CASO B: Alumno Moroso (Cargo vencido hace semanas)
  INSERT INTO public.cargo (id, academia_id, persona_id, grupo_id_origen, concepto, monto_original, saldo_pendiente, fecha_creacion, fecha_vencimiento, estado_financiero, origen, created_by)
  VALUES 
  (v_cargo2_id, v_academia1_id, v_alumno_vencido, v_grupo_ballet, 'Mensualidad Mayo 2026', 850.00, 850.00, (now() - interval '20 days'), (now() - interval '15 days'), 'vencido', 'grupal', v_owner1_id);

  -- CASO C: Alumno Reciente / Pendiente (Cargo emitido hoy, vence mañana)
  INSERT INTO public.cargo (id, academia_id, persona_id, grupo_id_origen, concepto, monto_original, saldo_pendiente, fecha_creacion, fecha_vencimiento, estado_financiero, origen, created_by)
  VALUES 
  (v_cargo3_id, v_academia1_id, v_alumno_pendiente, v_grupo_jazz, 'Inscripción Jazz', 500.00, 500.00, now(), (now() + interval '3 days'), 'pendiente', 'manual', v_staff1_id);

END $$;
