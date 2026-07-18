-- Crear tabla hq_configuracion_global
CREATE TABLE public.hq_configuracion_global (
  clave      text PRIMARY KEY,
  valor      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.hq_configuracion_global ENABLE ROW LEVEL SECURITY;

-- Permitir lectura de la tabla de configuración global a usuarios autenticados y anónimos (para verificar el mantenimiento)
CREATE POLICY hq_configuracion_global_read_policy ON public.hq_configuracion_global
  FOR SELECT TO authenticated, anon
  USING (true);

-- Sembrar valores por defecto
INSERT INTO public.hq_configuracion_global (clave, valor) VALUES 
('version', '{"numero": "1.4.2"}'::jsonb),
('mantenimiento', '{"activo": false, "mensaje": "SIPRA se encuentra en mantenimiento programado. Volveremos en breve."}'::jsonb),
('limites', '{"max_alumnos_defecto": 500, "max_usuarios_defecto": 5, "max_almacenamiento_mb": 1024}'::jsonb)
ON CONFLICT (clave) DO NOTHING;
