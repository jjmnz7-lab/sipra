-- Migración: 016_grant_sipra_auth
-- Descripción: Otorgar permisos USAGE y EXECUTE sobre el schema sipra_auth
--              a los roles authenticated y anon. Sin esto, las políticas RLS
--              que invocan funciones de sipra_auth fallan con
--              "permission denied for schema sipra_auth".

-- 1. Permitir uso del schema
GRANT USAGE ON SCHEMA sipra_auth TO authenticated;
GRANT USAGE ON SCHEMA sipra_auth TO anon;

-- 2. Permitir ejecución de todas las funciones existentes en sipra_auth
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA sipra_auth TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA sipra_auth TO anon;

-- 3. Asegurar que funciones futuras creadas en sipra_auth también hereden el permiso
ALTER DEFAULT PRIVILEGES IN SCHEMA sipra_auth
  GRANT EXECUTE ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA sipra_auth
  GRANT EXECUTE ON FUNCTIONS TO anon;

-- DOWN (referencia):
-- REVOKE USAGE ON SCHEMA sipra_auth FROM authenticated, anon;
-- REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA sipra_auth FROM authenticated, anon;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA sipra_auth
--   REVOKE EXECUTE ON FUNCTIONS FROM authenticated, anon;
