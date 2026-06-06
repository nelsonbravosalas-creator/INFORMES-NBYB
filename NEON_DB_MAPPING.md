# Mapeo de Datos: INFORMES-NBYB → Neon PostgreSQL (Multitenant)

## 🏗️ Arquitectura Multitenant

Cada organización (tenant) tiene su propio conjunto de datos completamente aislado.

---

## 📊 Tabla de Mapeo Completa

### **1. TENANTS (Organización/Empresa)**

| Campo TypeScript | Columna PostgreSQL | Tipo | Notas |
|---|---|---|---|
| (no existe) | `tenant_id` | UUID PK | Identificador único de tenant |
| (no existe) | `tenant_name` | VARCHAR(255) | Nombre de la empresa/organización |
| (no existe) | `created_at` | TIMESTAMPTZ | Fecha de creación del tenant |
| (no existe) | `is_active` | BOOLEAN | Estado activo/inactivo |

**Tabla SQL:**
```sql
CREATE TABLE tenants (
  tenant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);
```

---

### **2. USERS (Técnicos / Administradores)**

| Campo TypeScript | Columna PostgreSQL | Tipo | Notas |
|---|---|---|---|
| (no existe) | `user_id` | UUID PK | Identificador único |
| `technicianName` | `name` | VARCHAR(255) | Nombre del técnico |
| (no existe) | `email` | VARCHAR(255) UNIQUE | Email para login |
| (no existe) | `password_hash` | VARCHAR(255) | Bcrypt hash |
| (no existe) | `role` | ENUM | admin, technician, viewer |
| (no existe) | `tenant_id` | UUID FK | Referencia a tenant |
| (no existe) | `created_at` | TIMESTAMPTZ | Fecha registro |

**Tabla SQL:**
```sql
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) CHECK (role IN ('admin', 'technician', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, email)
);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
```

---

### **3. CLIENTS (Clientes/Empresas)**

| Campo TypeScript | Columna PostgreSQL | Tipo | Notas |
|---|---|---|---|
| `ClientRecord.id` | `client_id` | UUID PK | |
| `ClientRecord.name` | `name` | VARCHAR(255) | Razón social |
| `ClientRecord.address` | `address` | TEXT | Dirección matriz |
| `ClientRecord.region` | `region` | VARCHAR(100) | Región (Chile) |
| `ClientRecord.contactPerson` | `contact_person` | VARCHAR(255) | Persona contacto |
| `ClientRecord.contactRole` | `contact_role` | VARCHAR(100) | Rol/Cargo |
| `ClientRecord.contactEmail` | `contact_email` | VARCHAR(255) | Email contacto |
| `ClientRecord.noSubs` | `no_subs` | BOOLEAN | Sin sucursales |
| (no existe) | `tenant_id` | UUID FK | **Aislamiento multitenant** |
| (no existe) | `created_at` | TIMESTAMPTZ | |

**Tabla SQL:**
```sql
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
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);
CREATE INDEX idx_clients_tenant ON clients(tenant_id);
```

---

### **4. SUB_BRANCHES (Sucursales/Locaciones)**

| Campo TypeScript | Columna PostgreSQL | Tipo | Notas |
|---|---|---|---|
| `SubBranch.id` | `sub_id` | UUID PK | |
| `SubBranch.type` | `type` | VARCHAR(50) | TIENDA, BODEGA, etc. |
| `SubBranch.code` | `code` | VARCHAR(8) | Codificador único |
| `SubBranch.name` | `name` | VARCHAR(255) | Nombre sucursal |
| `SubBranch.address` | `address` | TEXT | Dirección |
| `SubBranch.region` | `region` | VARCHAR(100) | O 'HEREDAR' |
| `SubBranch.sameContact` | `same_contact` | BOOLEAN | Contacto igual a cliente |
| `SubBranch.contactPerson` | `contact_person` | VARCHAR(255) | Opcional |
| `SubBranch.contactRole` | `contact_role` | VARCHAR(100) | Opcional |
| `SubBranch.contactEmail` | `contact_email` | VARCHAR(255) | Opcional |
| (FK) | `client_id` | UUID FK | Referencia a cliente |

**Tabla SQL:**
```sql
CREATE TABLE sub_branches (
  sub_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(client_id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  code VARCHAR(8) NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  region VARCHAR(100),
  same_contact BOOLEAN DEFAULT true,
  contact_person VARCHAR(255),
  contact_role VARCHAR(100),
  contact_email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, code)
);
CREATE INDEX idx_subs_client ON sub_branches(client_id);
```

---

### **5. HVAC_REPORTS (Informes de Mantenimiento)**

| Campo TypeScript | Columna PostgreSQL | Tipo | Notas |
|---|---|---|---|
| `HVACReport.id` | `report_id` | UUID PK | |
| `HVACReport.folio` | `folio` | VARCHAR(100) UNIQUE | Número informe |
| `HVACReport.date` | `report_date` | DATE | |
| `HVACReport.timestamp` | `created_at` | TIMESTAMPTZ | |
| `HVACReport.technicianName` | `technician_name` | VARCHAR(255) | |
| `HVACReport.clientName` | `client_name` | VARCHAR(255) | |
| `HVACReport.clientEmail` | `client_email` | VARCHAR(255) | |
| `HVACReport.branchLocation` | `branch_name` | VARCHAR(255) | |
| `HVACReport.clientContactName` | `contact_person` | VARCHAR(255) | |
| `HVACReport.clientContactRole` | `contact_role` | VARCHAR(100) | |
| `HVACReport.clientLocationAddress` | `location_address` | TEXT | |
| `HVACReport.clientRegion` | `region` | VARCHAR(100) | |
| `HVACReport.brand` | `brand` | VARCHAR(100) | |
| `HVACReport.model` | `model` | VARCHAR(100) | |
| `HVACReport.serialNumber` | `serial_number` | VARCHAR(100) | |
| `HVACReport.refrigerantType` | `refrigerant_type` | VARCHAR(50) | |
| `HVACReport.capacity` | `capacity` | VARCHAR(50) | |
| `HVACReport.voltage` | `voltage` | VARCHAR(50) | |
| `HVACReport.amperage` | `amperage` | VARCHAR(50) | |
| `HVACReport.equipmentType` | `equipment_type` | VARCHAR(100) | |
| `HVACReport.criticality` | `criticality` | VARCHAR(50) | |
| `HVACReport.ambientTemp` | `ambient_temp` | VARCHAR(50) | |
| `HVACReport.returnTemp` | `return_temp` | VARCHAR(50) | |
| `HVACReport.supplyTemp` | `supply_temp` | VARCHAR(50) | |
| `HVACReport.fanAmperage` | `fan_amperage` | VARCHAR(50) | |
| `HVACReport.setPoint` | `set_point` | VARCHAR(50) | |
| `HVACReport.circuits` | `circuits` | JSONB | Array de Circuit |
| `HVACReport.checklist` | `checklist` | JSONB | Array de ChecklistItem |
| `HVACReport.electricSchemeNote` | `electric_scheme_note` | TEXT | |
| `HVACReport.customDrawingSvg` | `custom_drawing_svg` | TEXT | |
| `HVACReport.signatures` | `signatures` | JSONB | { technicianName, clientName, ... } |
| `HVACReport.generalComments` | `general_comments` | TEXT | |
| `HVACReport.overallStatus` | `overall_status` | VARCHAR(50) | excellent, normal, ... |
| (no existe) | `tenant_id` | UUID FK | **Aislamiento multitenant** |

**Tabla SQL:**
```sql
CREATE TABLE hvac_reports (
  report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  folio VARCHAR(100) NOT NULL,
  report_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  technician_name VARCHAR(255),
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  branch_name VARCHAR(255),
  contact_person VARCHAR(255),
  contact_role VARCHAR(100),
  location_address TEXT,
  region VARCHAR(100),
  brand VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  refrigerant_type VARCHAR(50),
  capacity VARCHAR(50),
  voltage VARCHAR(50),
  amperage VARCHAR(50),
  equipment_type VARCHAR(100),
  criticality VARCHAR(50),
  ambient_temp VARCHAR(50),
  return_temp VARCHAR(50),
  supply_temp VARCHAR(50),
  fan_amperage VARCHAR(50),
  set_point VARCHAR(50),
  circuits JSONB DEFAULT '[]'::jsonb,
  checklist JSONB DEFAULT '[]'::jsonb,
  electric_scheme_note TEXT,
  custom_drawing_svg TEXT,
  signatures JSONB,
  general_comments TEXT,
  overall_status VARCHAR(50),
  UNIQUE(tenant_id, folio)
);
CREATE INDEX idx_reports_tenant ON hvac_reports(tenant_id);
CREATE INDEX idx_reports_folio ON hvac_reports(folio);
CREATE INDEX idx_reports_date ON hvac_reports(report_date DESC);
CREATE INDEX idx_reports_status ON hvac_reports(overall_status);
CREATE INDEX idx_reports_circuits_gin ON hvac_reports USING GIN(circuits);
```

---

### **6. SERVICE_ORDERS (Órdenes de Servicio)**

| Campo TypeScript | Columna PostgreSQL | Tipo | Notas |
|---|---|---|---|
| `ServiceOrderReport.id` | `order_id` | UUID PK | |
| `ServiceOrderReport.folio` | `folio` | VARCHAR(100) UNIQUE | |
| `ServiceOrderReport.date` | `order_date` | DATE | |
| `ServiceOrderReport.timestamp` | `created_at` | TIMESTAMPTZ | |
| `ServiceOrderReport.technicianName` | `technician_name` | VARCHAR(255) | |
| `ServiceOrderReport.serviceType` | `service_type` | VARCHAR(50) | preventivo, correctivo, ... |
| `ServiceOrderReport.orderNumber` | `order_number` | VARCHAR(100) | |
| `ServiceOrderReport.clientName` | `client_name` | VARCHAR(255) | |
| `ServiceOrderReport.branchLocation` | `branch_location` | VARCHAR(255) | |
| `ServiceOrderReport.clientContactName` | `contact_person` | VARCHAR(255) | |
| `ServiceOrderReport.clientContactRole` | `contact_role` | VARCHAR(100) | |
| `ServiceOrderReport.clientLocationAddress` | `location_address` | TEXT | |
| `ServiceOrderReport.diagnosticRating` | `diagnostic_rating` | VARCHAR(50) | excellent, normal, ... |
| `ServiceOrderReport.evidence` | `evidence` | JSONB | Array de EvidencePhoto |
| `ServiceOrderReport.findings` | `findings` | TEXT | |
| `ServiceOrderReport.conclusions` | `conclusions` | TEXT | |
| `ServiceOrderReport.signatures` | `signatures` | JSONB | |
| (no existe) | `tenant_id` | UUID FK | **Aislamiento multitenant** |

**Tabla SQL:**
```sql
CREATE TABLE service_orders (
  order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  folio VARCHAR(100) NOT NULL,
  order_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  technician_name VARCHAR(255),
  service_type VARCHAR(50),
  order_number VARCHAR(100),
  client_name VARCHAR(255),
  branch_location VARCHAR(255),
  contact_person VARCHAR(255),
  contact_role VARCHAR(100),
  location_address TEXT,
  diagnostic_rating VARCHAR(50),
  evidence JSONB DEFAULT '[]'::jsonb,
  findings TEXT,
  conclusions TEXT,
  signatures JSONB,
  UNIQUE(tenant_id, folio)
);
CREATE INDEX idx_orders_tenant ON service_orders(tenant_id);
CREATE INDEX idx_orders_folio ON service_orders(folio);
CREATE INDEX idx_orders_date ON service_orders(order_date DESC);
CREATE INDEX idx_orders_rating ON service_orders(diagnostic_rating);
```

---

### **7. ADMIN_SETTINGS (Configuración Administrativa)**

| Campo TypeScript | Columna PostgreSQL | Tipo | Notas |
|---|---|---|---|
| `AdminSettings.companyName` | `company_name` | VARCHAR(255) | |
| `AdminSettings.companyAddress` | `company_address` | TEXT | |
| `AdminSettings.logo` | `logo` | TEXT | Base64 |
| `AdminSettings.brands` | `brands` | JSONB | Array de strings |
| `AdminSettings.refrigerants` | `refrigerants` | JSONB | Array de strings |
| `AdminSettings.equipmentTypes` | `equipment_types` | JSONB | Array de strings |
| `AdminSettings.techs` | `techs` | JSONB | Array de nombres |
| (no existe) | `tenant_id` | UUID FK PK | **Uno por tenant** |
| (no existe) | `updated_at` | TIMESTAMPTZ | |

**Tabla SQL:**
```sql
CREATE TABLE admin_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  company_name VARCHAR(255),
  company_address TEXT,
  logo TEXT,
  brands JSONB DEFAULT '[]'::jsonb,
  refrigerants JSONB DEFAULT '[]'::jsonb,
  equipment_types JSONB DEFAULT '[]'::jsonb,
  techs JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🔑 Relaciones y Restricciones

```
TENANTS (raíz)
├── USERS (tenant_id FK)
├── CLIENTS (tenant_id FK)
│   └── SUB_BRANCHES (client_id FK)
├── HVAC_REPORTS (tenant_id FK)
├── SERVICE_ORDERS (tenant_id FK)
└── ADMIN_SETTINGS (tenant_id PK)
```

### Restricciones de Multitenancy

```sql
-- Trigger para asegurar que los usuarios solo accedan a datos de su tenant
CREATE FUNCTION check_tenant_access() RETURNS TRIGGER AS $$
BEGIN
  -- Validar que user_id pertenece al mismo tenant
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE user_id = current_setting('app.current_user_id')::uuid
    AND tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized tenant access';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 📈 Índices para Rendimiento

```sql
-- Índices principales para queries comunes
CREATE INDEX idx_hvac_reports_tenant_date ON hvac_reports(tenant_id, report_date DESC);
CREATE INDEX idx_service_orders_tenant_date ON service_orders(tenant_id, order_date DESC);
CREATE INDEX idx_clients_tenant_name ON clients(tenant_id, name);
CREATE INDEX idx_subs_client_type ON sub_branches(client_id, type);

-- Índices para búsquedas de texto
CREATE INDEX idx_hvac_reports_folio_tenant ON hvac_reports(tenant_id, folio);
CREATE INDEX idx_orders_folio_tenant ON service_orders(tenant_id, folio);
```

---

## 🔒 Seguridad Multitenant

| Nivel | Implementación |
|-------|----------------|
| **Row-Level Security** | Trigger en INSERT/UPDATE para validar tenant_id |
| **Query Filter** | Agregar `WHERE tenant_id = $1` a TODAS las queries |
| **Session Variable** | `SET app.current_user_id = '<user_id>'` al conectar |
| **Backup Isolation** | Respaldar por tenant usando `COPY ... WHERE tenant_id = ...` |
| **Audit Log** | Tabla separada `audit_logs(tenant_id, user_id, action, timestamp)` |

---

## 📝 Notas de Implementación

1. **JSONB para campos anidados:** Circuits, checklist, evidence, signatures se almacenan como JSONB para flexibilidad sin muchas tablas.

2. **Unique constraints con tenant_id:** Folios, códigos, emails son únicos dentro de un tenant, no globalmente.

3. **Foreign Keys en cascada:** Al eliminar tenant, todos los datos se eliminan automáticamente.

4. **Timestamps:** Todos los registros tienen `created_at` y muchos `updated_at` para auditoría.

5. **Base64 images:** Se almacenan como TEXT directamente en JSONB (evidence photos, signatures).

6. **Region como string:** Lista de 16 regiones chilenas, opción "HEREDAR" soportada como string.

---

## 🚀 Migración desde LocalForage

```typescript
// Pseudocódigo de migración
async function migrateToNeon(tenantId: string) {
  const clients = await localforage.getItem('clients');
  const reports = await localforage.getItem('hvac_reports');
  const orders = await localforage.getItem('hvac_service_orders');
  
  // INSERT INTO clients (tenant_id, ...) VALUES
  // INSERT INTO hvac_reports (tenant_id, ...) VALUES
  // INSERT INTO service_orders (tenant_id, ...) VALUES
}
```

