-- ============================================================================
-- INFORMES-NBYB — Schema Postgres (Neon)
-- ============================================================================
-- Ejecutar desde la consola SQL de Neon o con psql:
--   psql "$DATABASE_URL" -f db/schema.sql
-- ============================================================================

-- Extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USUARIOS (técnicos / admins)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'tecnico' CHECK (role IN ('administrador', 'supervisor', 'tecnico', 'contratista')),
  password_hash TEXT,                     -- bcrypt del PIN de 4 dígitos (ver api/_lib/auth.ts)
  is_active   BOOLEAN NOT NULL DEFAULT true,
  cliente_id  TEXT,                       -- cliente asignado (coincide con AppUser.clienteId del front)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Usuarios de acceso iniciales (mismos PIN que el login de demo: admin 3517, técnico 1234)
INSERT INTO users (email, name, role, password_hash, is_active, cliente_id)
VALUES
  ('admin@nbyb.cl', 'Administrador NBYB', 'administrador', crypt('3517', gen_salt('bf', 10)), true, 'EECOL'),
  ('tecnico@nbyb.cl', 'Técnico Demo', 'tecnico', crypt('1234', gen_salt('bf', 10)), true, 'EECOL')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  password_hash = EXCLUDED.password_hash,
  is_active = true,
  cliente_id = EXCLUDED.cliente_id;

-- ============================================================================
-- RATE LIMITING (login y OCR) — persistente para sobrevivir cold starts serverless
-- ============================================================================
CREATE TABLE IF NOT EXISTS rate_limit_events (
  id          BIGSERIAL PRIMARY KEY,
  bucket      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_bucket_time ON rate_limit_events (bucket, created_at DESC);

-- ============================================================================
-- CLIENTES (empresas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS clients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_id       TEXT UNIQUE,             -- ID original de LocalForage (para sync)
  name            TEXT NOT NULL,
  address         TEXT,
  region          TEXT,
  contact_person  TEXT,
  contact_role    TEXT,
  contact_email   TEXT,
  no_subs         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_legacy ON clients(legacy_id);

-- ============================================================================
-- SUCURSALES (SUB)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sub_branches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_id       TEXT UNIQUE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,            -- TIENDA, BODEGA, OFICINA, etc.
  code            VARCHAR(8) NOT NULL,
  name            TEXT NOT NULL,
  address         TEXT,
  region          TEXT,                     -- 'HEREDAR' o región específica
  same_contact    BOOLEAN NOT NULL DEFAULT true,
  contact_person  TEXT,
  contact_role    TEXT,
  contact_email   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subs_client ON sub_branches(client_id);
CREATE INDEX IF NOT EXISTS idx_subs_code ON sub_branches(code);

-- ============================================================================
-- EQUIPOS (activos inspeccionables por cliente/sitio)
-- ============================================================================
CREATE TABLE IF NOT EXISTS equipment (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_id         TEXT UNIQUE,
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  site_id           UUID NOT NULL REFERENCES sub_branches(id) ON DELETE CASCADE,
  code              VARCHAR(32),
  equipment_type    TEXT,
  brand             TEXT,
  model             TEXT,
  serial_number     TEXT NOT NULL,
  refrigerant_type  TEXT,
  capacity          TEXT,
  voltage           TEXT,
  amperage          TEXT,
  criticality       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_equipment_client_site_serial UNIQUE (client_id, site_id, serial_number)
);

CREATE INDEX IF NOT EXISTS idx_equipment_client_site ON equipment(client_id, site_id);
CREATE INDEX IF NOT EXISTS idx_equipment_serial ON equipment(serial_number);

-- Correlativo por equipo para informes: 0000..9999
CREATE TABLE IF NOT EXISTS equipment_report_counters (
  equipment_id       UUID PRIMARY KEY REFERENCES equipment(id) ON DELETE CASCADE,
  last_correlative   SMALLINT NOT NULL CHECK (last_correlative BETWEEN 0 AND 9999),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION next_equipment_report_correlative(p_equipment_id UUID)
RETURNS SMALLINT AS $$
DECLARE
  v_current SMALLINT;
  v_next SMALLINT;
  v_rows INTEGER;
BEGIN
  INSERT INTO equipment_report_counters (equipment_id, last_correlative)
  VALUES (p_equipment_id, 0)
  ON CONFLICT (equipment_id) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 1 THEN
    RETURN 0;
  END IF;

  SELECT last_correlative
  INTO v_current
  FROM equipment_report_counters
  WHERE equipment_id = p_equipment_id
  FOR UPDATE;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'No se pudo inicializar correlativo para equipo %', p_equipment_id;
  END IF;

  IF v_current >= 9999 THEN
    RAISE EXCEPTION 'Correlativo agotado para equipo %', p_equipment_id;
  END IF;

  v_next := v_current + 1;

  UPDATE equipment_report_counters
  SET last_correlative = v_next,
      updated_at = now()
  WHERE equipment_id = p_equipment_id;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CONFIGURACIÓN ADMIN (catálogos globales — singleton)
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_settings (
  id                INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- singleton
  company_name      TEXT NOT NULL DEFAULT 'ClimaTech Pro Servicios HVAC',
  company_address   TEXT,
  logo              TEXT,                   -- base64 (mover a Blob si > 1MB)
  brands            JSONB NOT NULL DEFAULT '[]'::jsonb,
  refrigerants      JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipment_types   JSONB NOT NULL DEFAULT '[]'::jsonb,
  techs             JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Asegurar singleton row
INSERT INTO admin_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INFORMES HVAC (Mantenimiento)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hvac_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_id       TEXT UNIQUE,
  folio           TEXT NOT NULL,
  report_date     DATE NOT NULL,

  technician_name TEXT NOT NULL,
  technician_id   UUID REFERENCES users(id) ON DELETE SET NULL,

  client_name     TEXT NOT NULL,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  branch_name     TEXT,
  branch_id       UUID REFERENCES sub_branches(id) ON DELETE SET NULL,
  equipment_id    UUID REFERENCES equipment(id) ON DELETE SET NULL,
  correlative     SMALLINT CHECK (correlative BETWEEN 0 AND 9999),
  correlative_label TEXT GENERATED ALWAYS AS (lpad(correlative::TEXT, 4, '0')) STORED,

  -- Equipo
  brand           TEXT,
  model           TEXT,
  serial_number   TEXT,
  refrigerant_type TEXT,
  capacity        TEXT,
  voltage         TEXT,
  amperage        TEXT,
  equipment_type  TEXT,
  criticality     TEXT,

  overall_status  TEXT NOT NULL CHECK (overall_status IN ('excellent','normal','requires_action','critical')),

  -- Datos completos (más flexibles como JSONB)
  measurements    JSONB,                    -- { ambientTemp, returnTemp, ... }
  circuits        JSONB NOT NULL DEFAULT '[]'::jsonb,
  checklist       JSONB NOT NULL DEFAULT '[]'::jsonb,
  signatures      JSONB,
  electric_scheme_note TEXT,
  custom_drawing_svg TEXT,
  general_comments TEXT,
  report_payload  JSONB NOT NULL DEFAULT '{}'::jsonb, -- copia completa del contrato del editor

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_version    INTEGER NOT NULL DEFAULT 1   -- para resolver conflictos en sync
);

CREATE INDEX IF NOT EXISTS idx_reports_folio   ON hvac_reports(folio);
CREATE INDEX IF NOT EXISTS idx_reports_date    ON hvac_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_reports_client  ON hvac_reports(client_name);
CREATE INDEX IF NOT EXISTS idx_reports_status  ON hvac_reports(overall_status);
CREATE INDEX IF NOT EXISTS idx_reports_legacy  ON hvac_reports(legacy_id);
CREATE INDEX IF NOT EXISTS idx_reports_circuits_gin ON hvac_reports USING GIN (circuits);
CREATE INDEX IF NOT EXISTS idx_reports_client_branch_equipment ON hvac_reports(client_id, branch_id, equipment_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_reports_equipment_correlative
  ON hvac_reports(client_id, branch_id, equipment_id, correlative)
  WHERE equipment_id IS NOT NULL AND correlative IS NOT NULL;

-- ============================================================================
-- ÓRDENES DE SERVICIO (OT)
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_id       TEXT UNIQUE,
  folio           TEXT NOT NULL,
  order_date      DATE NOT NULL,
  order_number    TEXT,
  service_type    TEXT NOT NULL CHECK (service_type IN ('preventivo','correctivo','urgencia','garantia','puesta_marcha')),

  technician_name TEXT NOT NULL,
  technician_id   UUID REFERENCES users(id) ON DELETE SET NULL,

  client_name     TEXT NOT NULL,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  branch_name     TEXT,
  branch_id       UUID REFERENCES sub_branches(id) ON DELETE SET NULL,
  client_contact_name TEXT,
  client_contact_role TEXT,
  client_location_address TEXT,

  diagnostic_rating TEXT NOT NULL CHECK (diagnostic_rating IN ('excellent','normal','requires_action','critical')),

  -- Contenido principal
  evidence        JSONB NOT NULL DEFAULT '[]'::jsonb,
  findings        TEXT,
  conclusions     TEXT,
  signatures      JSONB,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_version    INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_ot_folio   ON service_orders(folio);
CREATE INDEX IF NOT EXISTS idx_ot_date    ON service_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_ot_client  ON service_orders(client_name);
CREATE INDEX IF NOT EXISTS idx_ot_rating  ON service_orders(diagnostic_rating);
CREATE INDEX IF NOT EXISTS idx_ot_type    ON service_orders(service_type);
CREATE INDEX IF NOT EXISTS idx_ot_legacy  ON service_orders(legacy_id);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name   TEXT,
  action      TEXT NOT NULL,             -- create, update, delete, view, export
  entity_type TEXT NOT NULL,             -- hvac_report, service_order, client, ...
  entity_id   TEXT,
  metadata    JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user   ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_date   ON audit_log(created_at DESC);

-- ============================================================================
-- TRIGGERS — updated_at automático
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_clients ON clients;
CREATE TRIGGER set_updated_at_clients
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_reports ON hvac_reports;
CREATE TRIGGER set_updated_at_reports
  BEFORE UPDATE ON hvac_reports
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_equipment ON equipment;
CREATE TRIGGER set_updated_at_equipment
  BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_ot ON service_orders;
CREATE TRIGGER set_updated_at_ot
  BEFORE UPDATE ON service_orders
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================================================
-- VISTAS ÚTILES
-- ============================================================================

-- Dashboard: estadísticas por estado
CREATE OR REPLACE VIEW v_reports_stats AS
SELECT
  overall_status,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE report_date >= CURRENT_DATE - INTERVAL '30 days') AS last_30d
FROM hvac_reports
GROUP BY overall_status;

-- Lista de clientes con conteo de subs
CREATE OR REPLACE VIEW v_clients_with_subs AS
SELECT
  c.*,
  COUNT(s.id) AS sub_count
FROM clients c
LEFT JOIN sub_branches s ON s.client_id = c.id
GROUP BY c.id;
