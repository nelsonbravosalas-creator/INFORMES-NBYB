-- ============================================================================
-- INFORMES-NBYB - Migracion 003: reparar acceso inicial admin/tecnico
-- ============================================================================
-- Sintoma:
--   POST /api/auth/login responde 401 para admin@nbyb.cl / PIN 3517.
--
-- Causa probable:
--   La fila ya existia en `users`, por lo que los seeds anteriores con
--   ON CONFLICT DO NOTHING no actualizaron password_hash, role o is_active.
--
-- Efecto:
--   Restablece los accesos iniciales conocidos y limpia intentos fallidos de
--   login para evitar un 429 posterior por rate limit.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO users (email, name, role, password_hash, is_active, cliente_id)
VALUES
  ('admin@nbyb.cl', 'Administrador NBYB', 'administrador', crypt('3517', gen_salt('bf', 10)), true, 'EECOL'),
  ('tecnico@nbyb.cl', 'Tecnico Demo', 'tecnico', crypt('1234', gen_salt('bf', 10)), true, 'EECOL')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  password_hash = EXCLUDED.password_hash,
  is_active = true,
  cliente_id = EXCLUDED.cliente_id;

DELETE FROM rate_limit_events
WHERE bucket LIKE 'login:%';
