-- ============================================================================
-- INFORMES-NBYB — Neon PostgreSQL Schema (Multitenant)
-- ============================================================================
-- Execute this file in Neon console to create complete database structure
-- ============================================================================

-- Enable UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TENANTS (Root organization isolation)
-- ============================================================================
CREATE TABLE tenants (
  tenant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_tenants_active ON tenants(is_active);

-- ============================================================================
-- 2. USERS (Technicians, Admins)
-- ============================================================================
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) CHECK (role IN ('admin', 'technician', 'viewer')) DEFAULT 'technician',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ,
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- 3. CLIENTS (Customer companies)
-- ============================================================================
CREATE TABLE clients (
  client_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  region VARCHAR(100),
  contact_person VARCHAR(255),
  contact_role VARCHAR(100),
  contact_email VARCHAR(255),
  no_subs BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_clients_tenant ON clients(tenant_id);
CREATE INDEX idx_clients_region ON clients(tenant_id, region);

-- ============================================================================
-- 4. SUB_BRANCHES (Locations/Sucursales)
-- ============================================================================
CREATE TABLE sub_branches (
  sub_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(client_id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'TIENDA', 'BODEGA', 'OFICINA', 'PLANTA', 'SUCURSAL',
    'LABORATORIO', 'DATA CENTER', 'HOSPITAL', 'HOTEL', 'MALL', 'OTRO'
  )),
  code VARCHAR(8) NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  region VARCHAR(100),
  same_contact BOOLEAN DEFAULT true,
  contact_person VARCHAR(255),
  contact_role VARCHAR(100),
  contact_email VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, code)
);

CREATE INDEX idx_subs_client ON sub_branches(client_id);
CREATE INDEX idx_subs_type ON sub_branches(type);
CREATE INDEX idx_subs_code ON sub_branches(code);

-- ============================================================================
-- 5. HVAC_REPORTS (Maintenance reports)
-- ============================================================================
CREATE TABLE hvac_reports (
  report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  folio VARCHAR(100) NOT NULL,
  report_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Technician & Client info
  technician_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  technician_name VARCHAR(255),
  client_id UUID REFERENCES clients(client_id) ON DELETE SET NULL,
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  sub_id UUID REFERENCES sub_branches(sub_id) ON DELETE SET NULL,
  branch_name VARCHAR(255),
  contact_person VARCHAR(255),
  contact_role VARCHAR(100),
  location_address TEXT,
  region VARCHAR(100),

  -- Equipment specifications
  brand VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  refrigerant_type VARCHAR(50),
  capacity VARCHAR(50),
  voltage VARCHAR(50),
  amperage VARCHAR(50),
  equipment_type VARCHAR(100),
  criticality VARCHAR(50) CHECK (criticality IN ('altamente_critico', 'critico', 'no_critico')),

  -- Measurements
  ambient_temp VARCHAR(50),
  return_temp VARCHAR(50),
  supply_temp VARCHAR(50),
  fan_amperage VARCHAR(50),
  set_point VARCHAR(50),

  -- Complex nested data (JSONB)
  circuits JSONB DEFAULT '[]'::jsonb,        -- Array<Circuit>
  checklist JSONB DEFAULT '[]'::jsonb,        -- Array<ChecklistItem>
  signatures JSONB,                          -- { technicianName, technicianSignature, clientName, clientSignature, signDate }

  -- Schematics
  electric_scheme_note TEXT,
  custom_drawing_svg TEXT,

  -- Summary
  general_comments TEXT,
  overall_status VARCHAR(50) CHECK (overall_status IN ('excellent', 'normal', 'requires_action', 'critical')),

  UNIQUE(tenant_id, folio)
);

CREATE INDEX idx_hvac_reports_tenant ON hvac_reports(tenant_id);
CREATE INDEX idx_hvac_reports_folio ON hvac_reports(folio);
CREATE INDEX idx_hvac_reports_date ON hvac_reports(report_date DESC);
CREATE INDEX idx_hvac_reports_status ON hvac_reports(overall_status);
CREATE INDEX idx_hvac_reports_tenant_date ON hvac_reports(tenant_id, report_date DESC);
CREATE INDEX idx_hvac_circuits_gin ON hvac_reports USING GIN(circuits);
CREATE INDEX idx_hvac_checklist_gin ON hvac_reports USING GIN(checklist);

-- ============================================================================
-- 6. SERVICE_ORDERS (Service order reports - Órdenes de Servicio)
-- ============================================================================
CREATE TABLE service_orders (
  order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  folio VARCHAR(100) NOT NULL,
  order_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Technician
  technician_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  technician_name VARCHAR(255),
  service_type VARCHAR(50) CHECK (service_type IN ('preventivo', 'correctivo', 'urgencia', 'garantia', 'puesta_marcha')),
  order_number VARCHAR(100),

  -- Client & Location
  client_id UUID REFERENCES clients(client_id) ON DELETE SET NULL,
  client_name VARCHAR(255),
  sub_id UUID REFERENCES sub_branches(sub_id) ON DELETE SET NULL,
  branch_location VARCHAR(255),
  contact_person VARCHAR(255),
  contact_role VARCHAR(100),
  location_address TEXT,

  -- Diagnostic
  diagnostic_rating VARCHAR(50) CHECK (diagnostic_rating IN ('excellent', 'normal', 'requires_action', 'critical')),

  -- Content
  evidence JSONB DEFAULT '[]'::jsonb,        -- Array<EvidencePhoto>
  findings TEXT,
  conclusions TEXT,
  signatures JSONB,                          -- Same as HVACReport

  UNIQUE(tenant_id, folio)
);

CREATE INDEX idx_orders_tenant ON service_orders(tenant_id);
CREATE INDEX idx_orders_folio ON service_orders(folio);
CREATE INDEX idx_orders_date ON service_orders(order_date DESC);
CREATE INDEX idx_orders_rating ON service_orders(diagnostic_rating);
CREATE INDEX idx_orders_tenant_date ON service_orders(tenant_id, order_date DESC);
CREATE INDEX idx_orders_type ON service_orders(service_type);
CREATE INDEX idx_orders_evidence_gin ON service_orders USING GIN(evidence);

-- ============================================================================
-- 7. ADMIN_SETTINGS (Tenant configuration - singleton per tenant)
-- ============================================================================
CREATE TABLE admin_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  company_name VARCHAR(255),
  company_address TEXT,
  logo TEXT,                                  -- Base64 encoded image
  brands JSONB DEFAULT '[]'::jsonb,           -- Array<string>
  refrigerants JSONB DEFAULT '[]'::jsonb,    -- Array<string>
  equipment_types JSONB DEFAULT '[]'::jsonb, -- Array<string>
  techs JSONB DEFAULT '[]'::jsonb,            -- Array<string> (technician names)
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 8. AUDIT_LOG (Track all changes for compliance)
-- ============================================================================
CREATE TABLE audit_log (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  user_name VARCHAR(255),
  action VARCHAR(100) NOT NULL,              -- create, update, delete, view, export
  entity_type VARCHAR(100) NOT NULL,         -- hvac_report, service_order, client, etc.
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_user ON audit_log(tenant_id, user_id);
CREATE INDEX idx_audit_entity ON audit_log(tenant_id, entity_type, entity_id);
CREATE INDEX idx_audit_date ON audit_log(created_at DESC);

-- ============================================================================
-- TRIGGERS — Automatic updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_clients_timestamp ON clients;
CREATE TRIGGER update_clients_timestamp
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS update_subs_timestamp ON sub_branches;
CREATE TRIGGER update_subs_timestamp
  BEFORE UPDATE ON sub_branches
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS update_hvac_reports_timestamp ON hvac_reports;
CREATE TRIGGER update_hvac_reports_timestamp
  BEFORE UPDATE ON hvac_reports
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS update_orders_timestamp ON service_orders;
CREATE TRIGGER update_orders_timestamp
  BEFORE UPDATE ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS update_settings_timestamp ON admin_settings;
CREATE TRIGGER update_settings_timestamp
  BEFORE UPDATE ON admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- VIEWS (Useful queries)
-- ============================================================================

-- Reports by status (per tenant)
CREATE OR REPLACE VIEW v_hvac_status_summary AS
SELECT
  tenant_id,
  overall_status,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE report_date >= CURRENT_DATE - INTERVAL '30 days') as last_30d
FROM hvac_reports
GROUP BY tenant_id, overall_status;

-- Clients with their sub branches count (per tenant)
CREATE OR REPLACE VIEW v_clients_with_subs AS
SELECT
  c.client_id,
  c.tenant_id,
  c.name,
  c.region,
  COUNT(s.sub_id) as sub_count
FROM clients c
LEFT JOIN sub_branches s ON s.client_id = c.client_id
GROUP BY c.client_id, c.tenant_id, c.name, c.region;

-- Recent reports by technician (per tenant)
CREATE OR REPLACE VIEW v_technician_reports AS
SELECT
  tenant_id,
  technician_name,
  COUNT(*) as total_reports,
  MAX(report_date) as last_report_date
FROM hvac_reports
GROUP BY tenant_id, technician_name
ORDER BY total_reports DESC;

-- ============================================================================
-- SECURITY POLICIES (Row-Level Security for Tenants)
-- ============================================================================

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE hvac_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see data from their own tenant
CREATE POLICY users_tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY clients_tenant_isolation ON clients
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY subs_tenant_isolation ON sub_branches
  USING (client_id IN (
    SELECT client_id FROM clients
    WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
  ));

CREATE POLICY reports_tenant_isolation ON hvac_reports
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY orders_tenant_isolation ON service_orders
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY settings_tenant_isolation ON admin_settings
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY audit_tenant_isolation ON audit_log
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ============================================================================
-- INITIALIZE DEFAULT DATA
-- ============================================================================

-- Insert first tenant (for testing)
INSERT INTO tenants (tenant_name) VALUES ('Demo Tenant') ON CONFLICT DO NOTHING;

-- Get tenant ID for seeding
-- (Run this separately after verifying tenant was created)
