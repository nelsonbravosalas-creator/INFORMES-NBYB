-- ============================================================================
-- INFORMES-NBYB — Migración 001: autenticación server-side, rate limiting
-- ============================================================================
-- Seguro de ejecutar sobre la base de datos YA EN PRODUCCIÓN: todos los
-- cambios son aditivos e idempotentes (CREATE ... IF NOT EXISTS,
-- DROP CONSTRAINT IF EXISTS antes de recrear). No borra ni modifica
-- ninguna fila de hvac_reports, service_orders, clients, sub_branches, etc.
--
-- Ejecutar una sola vez:
--   psql "$DATABASE_URL" -f db/migration_001_security.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. Alinear los roles de `users` con los perfiles usados en el cliente ──
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'tecnico';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Migrar valores del esquema anterior antes de aplicar el nuevo CHECK
UPDATE users SET role = 'administrador' WHERE role = 'admin';
UPDATE users SET role = 'tecnico' WHERE role = 'tech';
UPDATE users SET role = 'supervisor' WHERE role = 'viewer';

ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('administrador', 'supervisor', 'tecnico', 'contratista'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS cliente_id TEXT;

-- ── 2. Rate limiting persistente (a prueba de cold starts serverless) ──────
CREATE TABLE IF NOT EXISTS rate_limit_events (
  id          BIGSERIAL PRIMARY KEY,
  bucket      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_bucket_time ON rate_limit_events (bucket, created_at DESC);

-- ── 3. Sembrar usuarios de acceso si la tabla está vacía ───────────────────
-- Mismos PIN que el login de demo (admin: 3517, técnico: 1234), ahora
-- validados server-side con bcrypt (pgcrypto blowfish crypt = formato
-- bcrypt estándar, compatible con bcryptjs en Node).
INSERT INTO users (email, name, role, password_hash, is_active, cliente_id)
VALUES
  ('admin@nbyb.cl', 'Administrador NBYB', 'administrador', crypt('3517', gen_salt('bf', 10)), true, 'EECOL'),
  ('tecnico@nbyb.cl', 'Técnico Demo', 'tecnico', crypt('1234', gen_salt('bf', 10)), true, 'EECOL')
ON CONFLICT (email) DO NOTHING;
