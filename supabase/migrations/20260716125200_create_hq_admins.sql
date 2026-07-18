-- Crear tabla hq_admins
CREATE TABLE public.hq_admins (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'super_admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_hq_admin_role CHECK (
    role IN ('super_admin', 'support', 'sales')
  )
);

-- Habilitar RLS
ALTER TABLE public.hq_admins ENABLE ROW LEVEL SECURITY;

-- Política de lectura: los administradores solo pueden leer su propia fila
CREATE POLICY select_self_admin ON public.hq_admins
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());
