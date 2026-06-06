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
  role        TEXT NOT NULL DEFAULT 'tech' CHECK (role IN ('admin', 'tech', 'viewer')),
  password_hash TEXT,                     -- bcrypt, NULL si auth con magic link/OAuth
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

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
