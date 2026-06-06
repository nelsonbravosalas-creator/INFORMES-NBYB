# CMMS HVAC PRO — Auditoría Completa & Schema Neon (Multitenant)
**Fecha:** 2026-06-06 | **Motor:** Vercel + Neon PostgreSQL | **Versión objetivo:** 3.0

---

## 1. ESTADO ACTUAL — DOS VERSIONES COEXISTENTES

| Dimensión | IA STUDIO (versión A) | REPLIT (versión B) | Objetivo Unificado |
|---|---|---|---|
| **Datos** | Mock (hardcoded) | PostgreSQL + Drizzle ORM | Neon PostgreSQL |
| **Auth** | PIN localStorage | JWT + hash bcrypt | JWT + refresh token |
| **Offline** | ❌ No | ❌ No | ✅ IndexedDB + Service Worker |
| **Sucursales** | Texto libre | Texto libre | ✅ Tabla `cmms_sucursales` |
| **Tipo Equipo** | Texto libre | Texto libre | ✅ Tabla `cmms_tipos_equipo` |
| **ID_cliente** | String | String | ✅ UUID FK |
| **TAG** | `[ALMACEN].[TIPO].[###]` | `[ALMACEN].[TIPO].[###]` | ✅ Generado + validado por DB |
| **Páginas (desktop)** | 16 | 25 | **27 consolidadas** |
| **Páginas (mobile)** | 0 PWA | Parcial | ✅ 8 pantallas móvil optimizadas |
| **Multitenant** | Parcial | ✅ `clienteId` en todo | ✅ UUID + RLS |
| **Contratos** | ❌ No | ❌ No | ✅ A implementar |
| **Inventario** | ❌ No | ❌ No | ✅ A implementar |

---

## 2. INVENTARIO COMPLETO DE MÓDULOS

### 2.1 Páginas/Módulos Existentes (Versión A — IA STUDIO)

| Ruta | Módulo | Estado | Funcionalidad |
|------|--------|--------|---------------|
| `/` | Dashboard | ✅ Funcional | KPIs, gráficos, filtros por almacén |
| `/equipos` | Inventario Equipos | ✅ Funcional | Grid/Lista/Detalle, filtros, QR, CRUD |
| `/equipos/:tag` | Detalle Equipo | ✅ Funcional | Specs, historial, tickets, documentos |
| `/mantenimientos` | Registro Mantenimientos | ✅ Funcional | Tabla, calendario, nuevo registro |
| `/planificacion` | Planificación | ✅ Funcional | Calendario react-big-calendar, actividades |
| `/informes` | Informes HVAC | ✅ Funcional | Listado, editor, estados |
| `/informes/:id` | Editor Informe | ✅ Funcional | Checklist, mediciones, firmas, export PDF |
| `/tickets` | Tickets/OT | ✅ Funcional | CRUD, filtros, prioridad |
| `/reportes` | Reportes & Analytics | ✅ Funcional | KPIs, costos, Recharts |
| `/eficiencia` | EFI Energía | ✅ Funcional | Consumo kWh/KPI energéticos |
| `/scanner` | Scanner QR | ✅ Funcional | Cámara html5-qrcode, upload, manual |
| `/mapa` | Mapa Geográfico | ✅ Funcional | Leaflet + OpenStreetMap, markers |
| `/administracion` | Administración | ✅ Parcial | Usuarios, Clientes (solo vista) |
| `/consola` | Consola Eventos | ✅ Funcional | Log de operaciones |
| `/configuracion` | Configuración | ✅ Parcial | Solo moneda y reset |
| `/client-selector` | Selector Cliente | ✅ Funcional | Multi-tenant UI |
| `/login` | Login | ✅ Funcional | PIN auth |

### 2.2 Páginas/Módulos Existentes (Versión B — REPLIT)

Incluye todo lo anterior + adicionalmente:

| Ruta | Módulo | Estado | Funcionalidad |
|------|--------|--------|---------------|
| `/mi-dia` | Mi Día (Mobile) | ✅ Funcional | OTs asignadas al técnico, CTA rápido |
| `/ot` | Órdenes de Trabajo | ✅ Funcional | Flujo completo, SLA, transiciones |
| `/ot/:id` | Detalle OT | ✅ Funcional | Timeline, comentarios, eventos |
| `/sla-config` | Config SLA | ✅ Funcional | Tiempo respuesta/resolución por prioridad |
| `/pm-planes` | Planes de PM | ✅ Funcional | Frecuencia, equipos, técnico asignado |
| `/pm-plantillas` | Plantillas PM | ✅ Funcional | Tareas, tipos, categorías |
| `/checklist-admin` | Admin Checklist | ✅ Funcional | CRUD plantillas con items |
| `/kpis` | KPIs Avanzados | ✅ Funcional | MTBF, MTTR, Disponibilidad |
| `/calendario` | Calendario | ✅ Funcional | Vista mensual/semanal/día |

### 2.3 Módulos FALTANTES (Gap Analysis)

| Módulo | Prioridad | Impacto | Razón |
|--------|-----------|---------|-------|
| **Sucursales (CRUD)** | 🔴 CRÍTICO | ID_sucursal sin entidad propia | Solo texto libre |
| **Tipos de Equipo (Catálogo)** | 🔴 CRÍTICO | ID_tipo_equipo sin entidad propia | Solo texto libre |
| **Inventario / Repuestos** | 🔴 ALTA | No hay control de stock | Solo array de strings |
| **Contratos de Servicio** | 🟡 ALTA | Sin vínculo SLA → contrato | No existe |
| **Presupuestos / Cotizaciones** | 🟡 MEDIA | Sin flujo comercial | No existe |
| **Órdenes de Compra (OC)** | 🟡 MEDIA | Sin ciclo de compras | No existe |
| **Alertas Automáticas** | 🟡 ALTA | Sin notif de PM vencido | Parcial (push) |
| **Documentos / Archivos** | 🟠 MEDIA | Fotos solo base64 | Sin gestión documental |
| **Historial de Cambios (Audit)** | 🟠 MEDIA | Solo en mantenimientos | No hay tabla central |
| **Queue de Sincronización** | 🔴 CRÍTICO | Offline-first no funcional | No implementado |
| **Exportación Masiva** | 🟠 BAJA | Solo por registro | No batch |
| **Panel Técnico Mobile** | 🔴 ALTA | Sin PWA optimizada mobile | Parcial |
| **Reporte Ejecutivo Auto** | 🟠 BAJA | Sin generación periódica | No existe |

---

## 3. REGLAS DE NEGOCIO — ID Jerarquía

### Regla TAG de Equipo

```
TAG = [ID_SUCURSAL]-[ALMACEN].[ID_TIPO_EQUIPO].[CORRELATIVO]

Ejemplo actual:   21-STK.AC.001
Estructura:
  21-STK        → Código de sucursal/almacén (ID_sucursal)
  AC            → Código de tipo de equipo (ID_tipo_equipo)
  001           → Correlativo auto-incremental por (sucursal + tipo)
```

### Relación de Entidades (Jerarquía)

```
tenant (organización de servicio / empresa mantenedora)
  └── cliente (empresa contratante)
       └── sucursal (ubicación física)
            └── equipo (activo físico) ← ID_cliente + ID_sucursal + ID_tipo_equipo
                 └── mantenimiento (OT ejecutada)
                 └── ot (Orden de Trabajo)
                 └── informe (informe técnico HVAC)
                 └── checklist (resultado de inspección)
```

### Cardinalidades

```
tenant         1 ─── N   clientes
cliente        1 ─── N   sucursales
cliente        1 ─── N   usuarios_clientes (M:N via pivot)
sucursal       1 ─── N   equipos
tipo_equipo    1 ─── N   equipos
equipo         1 ─── N   mantenimientos
equipo         1 ─── N   ordenes_trabajo
mantenimiento  1 ─── 1   informe_mantenimiento (opcional)
ot             N ─── 1   mantenimiento (un MNT puede originar una OT)
equipo         1 ─── N   repuestos_compatibles (M:N via pivot)
cliente        1 ─── N   sla_config (por prioridad × tipo)
```

---

## 4. SCHEMA NEON POSTGRESQL — MULTITENANT COMPLETO

### 4.1 Tabla: `cmms_tenants` (Empresas Mantenedoras)

```sql
CREATE TABLE cmms_tenants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       VARCHAR(255) NOT NULL UNIQUE,
  rut          VARCHAR(20)  NOT NULL DEFAULT '',
  logo_url     TEXT         NOT NULL DEFAULT '',
  plan         VARCHAR(50)  NOT NULL DEFAULT 'profesional'
               CHECK (plan IN ('basico','profesional','enterprise')),
  activo       BOOLEAN      NOT NULL DEFAULT true,
  config       JSONB        NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- Config JSONB ejemplo: { "moneda": "CLP", "timezone": "America/Santiago", "idioma": "es" }
```

### 4.2 Tabla: `cmms_clientes` (Empresas Contratantes) ← **ID_cliente**

```sql
CREATE TABLE cmms_clientes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES cmms_tenants(id) ON DELETE CASCADE,
  codigo       VARCHAR(20) NOT NULL,                    -- Código corto, ej: EECOL
  nombre       VARCHAR(255) NOT NULL,
  rut          VARCHAR(20)  NOT NULL DEFAULT '',
  logo_url     TEXT         NOT NULL DEFAULT '',
  plan         VARCHAR(50)  NOT NULL DEFAULT 'profesional'
               CHECK (plan IN ('basico','profesional','enterprise')),
  activo       BOOLEAN      NOT NULL DEFAULT true,
  contacto_nombre VARCHAR(255) NOT NULL DEFAULT '',
  contacto_email  VARCHAR(255) NOT NULL DEFAULT '',
  contacto_fono   VARCHAR(50)  NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, codigo)
);

CREATE INDEX idx_clientes_tenant  ON cmms_clientes(tenant_id);
CREATE INDEX idx_clientes_activo  ON cmms_clientes(tenant_id, activo);
```

### 4.3 Tabla: `cmms_sucursales` ← **ID_sucursal** (FALTANTE CRÍTICO)

```sql
CREATE TABLE cmms_sucursales (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES cmms_tenants(id)  ON DELETE CASCADE,
  cliente_id   UUID        NOT NULL REFERENCES cmms_clientes(id) ON DELETE CASCADE,
  codigo       VARCHAR(20) NOT NULL,                    -- ej: 21-STK, 11-STK
  nombre       VARCHAR(255) NOT NULL,                   -- ej: Santiago 14 de la Fama
  tipo         VARCHAR(50) NOT NULL DEFAULT 'SUCURSAL'
               CHECK (tipo IN (
                 'TIENDA','BODEGA','OFICINA','PLANTA','SUCURSAL',
                 'LABORATORIO','DATA CENTER','HOSPITAL','HOTEL','MALL','OTRO'
               )),
  direccion    TEXT         NOT NULL DEFAULT '',
  region       VARCHAR(100) NOT NULL DEFAULT '',
  ciudad       VARCHAR(100) NOT NULL DEFAULT '',
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  contacto_nombre VARCHAR(255) NOT NULL DEFAULT '',
  contacto_email  VARCHAR(255) NOT NULL DEFAULT '',
  contacto_fono   VARCHAR(50)  NOT NULL DEFAULT '',
  activo       BOOLEAN      NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, codigo)
);

CREATE INDEX idx_sucursales_cliente ON cmms_sucursales(cliente_id);
CREATE INDEX idx_sucursales_tenant  ON cmms_sucursales(tenant_id);
CREATE INDEX idx_sucursales_region  ON cmms_sucursales(tenant_id, region);
```

### 4.4 Tabla: `cmms_tipos_equipo` ← **ID_tipo_equipo** (FALTANTE CRÍTICO)

```sql
CREATE TABLE cmms_tipos_equipo (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES cmms_tenants(id) ON DELETE CASCADE,
  codigo       VARCHAR(10) NOT NULL,                    -- ej: AC, VH, GE, EB, GO
  nombre       VARCHAR(100) NOT NULL,                   -- ej: Aire Acondicionado
  categoria    VARCHAR(50) NOT NULL DEFAULT 'HVAC'
               CHECK (categoria IN (
                 'HVAC','ELECTRICO','MECANICO','CIVIL','IT','VEHICULO','OTRO'
               )),
  vida_util_default INT     NOT NULL DEFAULT 10,        -- años
  frecuencia_pm_meses INT  NOT NULL DEFAULT 6,          -- meses entre PM
  activo       BOOLEAN      NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, codigo)
);

CREATE INDEX idx_tipos_equipo_tenant ON cmms_tipos_equipo(tenant_id);

-- Seed datos iniciales por tenant
-- AC: Aire Acondicionado | VH: Vehículo | GE: Grupo Electrógeno
-- EB: Equipo de Bodega   | GO: Grúa Horquilla | XX: Otros
```

### 4.5 Tabla: `cmms_users` (Usuarios del Sistema)

```sql
CREATE TABLE cmms_users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES cmms_tenants(id) ON DELETE CASCADE,
  email           VARCHAR(255) NOT NULL,
  pin_hash        VARCHAR(255) NOT NULL,                -- bcrypt
  nombre          VARCHAR(255) NOT NULL,
  perfil          VARCHAR(50)  NOT NULL DEFAULT 'tecnico'
                  CHECK (perfil IN (
                    'programador','administrador','supervisor',
                    'tecnico','contratista','cliente','visita'
                  )),
  activo          BOOLEAN      NOT NULL DEFAULT true,
  puede_editar_mantenimientos BOOLEAN NOT NULL DEFAULT false,
  must_change_pin BOOLEAN      NOT NULL DEFAULT true,
  pin_changed_at  TIMESTAMPTZ,
  ultimo_login    TIMESTAMPTZ,
  push_subscriptions JSONB     NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_tenant ON cmms_users(tenant_id);
CREATE INDEX idx_users_email  ON cmms_users(email);
```

### 4.6 Tabla: `cmms_usuarios_clientes` (Pivot User ↔ Cliente)

```sql
CREATE TABLE cmms_usuarios_clientes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES cmms_users(id)    ON DELETE CASCADE,
  cliente_id   UUID        NOT NULL REFERENCES cmms_clientes(id) ON DELETE CASCADE,
  tenant_id    UUID        NOT NULL REFERENCES cmms_tenants(id)  ON DELETE CASCADE,
  activo       BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, cliente_id)
);

CREATE INDEX idx_uc_user    ON cmms_usuarios_clientes(user_id);
CREATE INDEX idx_uc_cliente ON cmms_usuarios_clientes(cliente_id);
```

### 4.7 Tabla: `cmms_equipos` (Activos / Equipos HVAC)

```sql
CREATE TABLE cmms_equipos (
  -- Identificación
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tag           VARCHAR(50)  NOT NULL,                  -- ej: 21-STK.AC.001
  nombre        VARCHAR(255) NOT NULL DEFAULT '',

  -- Llaves de negocio (trío ID)
  tenant_id     UUID         NOT NULL REFERENCES cmms_tenants(id)       ON DELETE CASCADE,
  cliente_id    UUID         NOT NULL REFERENCES cmms_clientes(id)      ON DELETE CASCADE,
  sucursal_id   UUID         NOT NULL REFERENCES cmms_sucursales(id)    ON DELETE CASCADE,
  tipo_equipo_id UUID        NOT NULL REFERENCES cmms_tipos_equipo(id)  ON DELETE RESTRICT,

  -- Especificaciones técnicas
  marca         VARCHAR(100) NOT NULL DEFAULT '',
  modelo        VARCHAR(100) NOT NULL DEFAULT '',
  serie         VARCHAR(100) NOT NULL DEFAULT '',
  capacidad     VARCHAR(50)  NOT NULL DEFAULT '',       -- BTU, TR, kW, HP
  voltaje       VARCHAR(20)  NOT NULL DEFAULT '',
  corriente     VARCHAR(20)  NOT NULL DEFAULT '',
  refrigerante  VARCHAR(20)  NOT NULL DEFAULT '',
  pot_elec      DOUBLE PRECISION,                      -- kW calculado

  -- Ubicación dentro de la sucursal
  ubicacion     TEXT         NOT NULL DEFAULT '',       -- Piso, Sala, Área
  area          VARCHAR(100) NOT NULL DEFAULT '',

  -- Vida útil y programación
  fecha_instalacion DATE,
  vida_util     INT          NOT NULL DEFAULT 10,       -- años
  horas_operacion INT        NOT NULL DEFAULT 0,
  ultimo_mantenimiento  DATE,
  proximo_mantenimiento DATE,

  -- Estado operacional
  estado        VARCHAR(30)  NOT NULL DEFAULT 'operativo'
                CHECK (estado IN ('operativo','mantenimiento','falla','standby','retirado')),
  criticidad    VARCHAR(20)  NOT NULL DEFAULT 'no_critico'
                CHECK (criticidad IN ('altamente_critico','critico','no_critico')),

  -- Geolocalización (hereda de sucursal si es null)
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,

  -- Metadata
  notas         TEXT         NOT NULL DEFAULT '',
  fotos         JSONB        NOT NULL DEFAULT '[]',     -- URLs o base64
  documentos    JSONB        NOT NULL DEFAULT '[]',     -- { nombre, url, tipo }
  source        VARCHAR(20)  NOT NULL DEFAULT 'user',  -- user | seed | import
  tecnicos_ids  JSONB        NOT NULL DEFAULT '[]',    -- UUID[] de cmms_users
  created_by    UUID         REFERENCES cmms_users(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  version       INT          NOT NULL DEFAULT 1,

  -- Sync offline
  sync_status   VARCHAR(20)  NOT NULL DEFAULT 'synced'
                CHECK (sync_status IN ('synced','pending','conflict')),
  local_id      VARCHAR(100),                           -- ID temporal offline

  UNIQUE (cliente_id, tag)                              -- TAG único por cliente
);

CREATE INDEX idx_equipos_tenant        ON cmms_equipos(tenant_id);
CREATE INDEX idx_equipos_cliente       ON cmms_equipos(cliente_id);
CREATE INDEX idx_equipos_sucursal      ON cmms_equipos(sucursal_id);
CREATE INDEX idx_equipos_tipo          ON cmms_equipos(tipo_equipo_id);
CREATE INDEX idx_equipos_estado        ON cmms_equipos(estado);
CREATE INDEX idx_equipos_proximo_mant  ON cmms_equipos(proximo_mantenimiento);
CREATE INDEX idx_equipos_tag           ON cmms_equipos(cliente_id, tag);
```

### 4.8 Tabla: `cmms_ordenes_trabajo` (OT — antes `cmms_tickets`)

```sql
CREATE TABLE cmms_ordenes_trabajo (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo         VARCHAR(20)  NOT NULL,                 -- OT-2026-0001
  tenant_id      UUID         NOT NULL REFERENCES cmms_tenants(id)    ON DELETE CASCADE,
  cliente_id     UUID         NOT NULL REFERENCES cmms_clientes(id)   ON DELETE CASCADE,
  sucursal_id    UUID         REFERENCES cmms_sucursales(id)          ON DELETE SET NULL,
  equipo_id      UUID         REFERENCES cmms_equipos(id)             ON DELETE SET NULL,
  tag            VARCHAR(50)  NOT NULL DEFAULT '',      -- desnormalizado para búsqueda

  -- Clasificación
  tipo           VARCHAR(30)  NOT NULL DEFAULT 'Correctivo'
                 CHECK (tipo IN ('Correctivo','Preventivo','Inspección','Emergencia','Instalación')),
  prioridad      VARCHAR(20)  NOT NULL DEFAULT 'media'
                 CHECK (prioridad IN ('critica','alta','media','baja')),
  titulo         VARCHAR(255) NOT NULL,
  descripcion    TEXT         NOT NULL DEFAULT '',

  -- Estado y flujo
  estado         VARCHAR(20)  NOT NULL DEFAULT 'borrador'
                 CHECK (estado IN (
                   'borrador','abierta','asignada','en-progreso',
                   'en-pausa','resuelta','cerrada','cancelada','rechazada'
                 )),

  -- Asignación
  solicitante_id UUID         REFERENCES cmms_users(id) ON DELETE SET NULL,
  asignado_id    UUID         REFERENCES cmms_users(id) ON DELETE SET NULL,
  supervisor_id  UUID         REFERENCES cmms_users(id) ON DELETE SET NULL,
  asignado_nombre VARCHAR(255) NOT NULL DEFAULT '',     -- desnormalizado

  -- SLA
  sla_response_due_at    TIMESTAMPTZ,
  sla_resolution_due_at  TIMESTAMPTZ,
  sla_paused_at          TIMESTAMPTZ,
  sla_paused_accum_ms    INT          NOT NULL DEFAULT 0,

  -- Evidencia
  imagenes       JSONB        NOT NULL DEFAULT '[]',
  notas          TEXT         NOT NULL DEFAULT '',

  -- Vinculación con mantenimiento ejecutado
  mantenimiento_id UUID       REFERENCES cmms_mantenimientos(id) ON DELETE SET NULL,

  -- Timestamps de transición
  abierta_at     TIMESTAMPTZ,
  asignada_at    TIMESTAMPTZ,
  en_progreso_at TIMESTAMPTZ,
  resuelta_at    TIMESTAMPTZ,
  cerrada_at     TIMESTAMPTZ,

  -- Metadata
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  version        INT          NOT NULL DEFAULT 1,
  sync_status    VARCHAR(20)  NOT NULL DEFAULT 'synced',

  UNIQUE (cliente_id, codigo)
);

CREATE INDEX idx_ot_tenant    ON cmms_ordenes_trabajo(tenant_id);
CREATE INDEX idx_ot_cliente   ON cmms_ordenes_trabajo(cliente_id);
CREATE INDEX idx_ot_sucursal  ON cmms_ordenes_trabajo(sucursal_id);
CREATE INDEX idx_ot_equipo    ON cmms_ordenes_trabajo(equipo_id);
CREATE INDEX idx_ot_asignado  ON cmms_ordenes_trabajo(asignado_id);
CREATE INDEX idx_ot_estado    ON cmms_ordenes_trabajo(estado);
CREATE INDEX idx_ot_fecha     ON cmms_ordenes_trabajo(created_at DESC);
```

### 4.9 Tabla: `cmms_mantenimientos` (Registro de Ejecución)

```sql
CREATE TABLE cmms_mantenimientos (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL REFERENCES cmms_tenants(id)    ON DELETE CASCADE,
  cliente_id      UUID         NOT NULL REFERENCES cmms_clientes(id)   ON DELETE CASCADE,
  sucursal_id     UUID         REFERENCES cmms_sucursales(id)          ON DELETE SET NULL,
  equipo_id       UUID         NOT NULL REFERENCES cmms_equipos(id)    ON DELETE CASCADE,
  tag             VARCHAR(50)  NOT NULL DEFAULT '',
  ot_id           UUID         REFERENCES cmms_ordenes_trabajo(id)     ON DELETE SET NULL,

  -- Clasificación
  tipo            VARCHAR(30)  NOT NULL
                  CHECK (tipo IN ('Preventivo','Correctivo','Predictivo','Inspección','Instalación')),
  descripcion     TEXT         NOT NULL DEFAULT '',
  fecha           DATE         NOT NULL,
  fecha_fin       DATE,
  duracion        INT          NOT NULL DEFAULT 0,      -- minutos
  costo           NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Estado
  estado          VARCHAR(30)  NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','en-progreso','completado','cancelado')),
  prioridad       VARCHAR(20)  NOT NULL DEFAULT 'media'
                  CHECK (prioridad IN ('critica','alta','media','baja')),

  -- Técnico
  tecnico_id      UUID         REFERENCES cmms_users(id)               ON DELETE SET NULL,
  tecnico_nombre  VARCHAR(255) NOT NULL DEFAULT '',

  -- Resultados
  hallazgos       TEXT         NOT NULL DEFAULT '',
  acciones        TEXT         NOT NULL DEFAULT '',
  proxima_fecha   DATE,
  repuestos       JSONB        NOT NULL DEFAULT '[]',   -- { nombre, cantidad, codigo, costo }
  fotos           JSONB        NOT NULL DEFAULT '[]',

  -- Checklist
  checklist_plantilla_id UUID   REFERENCES cmms_checklist_plantillas(id) ON DELETE SET NULL,
  checklist_respuestas   JSONB  NOT NULL DEFAULT '[]',

  -- Auditoría
  created_by      UUID         REFERENCES cmms_users(id)               ON DELETE SET NULL,
  change_history  JSONB        NOT NULL DEFAULT '[]',
  edited_by       UUID         REFERENCES cmms_users(id)               ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  version         INT          NOT NULL DEFAULT 1,
  sync_status     VARCHAR(20)  NOT NULL DEFAULT 'synced'
);

CREATE INDEX idx_mnt_tenant    ON cmms_mantenimientos(tenant_id);
CREATE INDEX idx_mnt_cliente   ON cmms_mantenimientos(cliente_id);
CREATE INDEX idx_mnt_equipo    ON cmms_mantenimientos(equipo_id);
CREATE INDEX idx_mnt_tecnico   ON cmms_mantenimientos(tecnico_id);
CREATE INDEX idx_mnt_estado    ON cmms_mantenimientos(estado);
CREATE INDEX idx_mnt_fecha     ON cmms_mantenimientos(fecha DESC);
CREATE INDEX idx_mnt_ot        ON cmms_mantenimientos(ot_id);
```

### 4.10 Tabla: `cmms_informes_mantenimiento` (Informe Técnico HVAC)

```sql
CREATE TABLE cmms_informes_mantenimiento (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  folio                 VARCHAR(30)  NOT NULL,            -- INF-2026-0001
  tenant_id             UUID         NOT NULL REFERENCES cmms_tenants(id)       ON DELETE CASCADE,
  cliente_id            UUID         NOT NULL REFERENCES cmms_clientes(id)      ON DELETE CASCADE,
  sucursal_id           UUID         REFERENCES cmms_sucursales(id)             ON DELETE SET NULL,
  equipo_id             UUID         NOT NULL REFERENCES cmms_equipos(id)       ON DELETE CASCADE,
  mantenimiento_id      UUID         REFERENCES cmms_mantenimientos(id)         ON DELETE SET NULL,
  tag                   VARCHAR(50)  NOT NULL DEFAULT '',

  -- Datos del servicio
  fecha                 DATE         NOT NULL,
  tipo_servicio         VARCHAR(50)  NOT NULL DEFAULT 'Preventivo',
  tecnico_id            UUID         REFERENCES cmms_users(id)                  ON DELETE SET NULL,
  tecnico               VARCHAR(255) NOT NULL DEFAULT '',

  -- Datos de contacto en sitio
  contacto_nombre       VARCHAR(255) NOT NULL DEFAULT '',
  contacto_email        VARCHAR(255) NOT NULL DEFAULT '',
  contacto_telefono     VARCHAR(50)  NOT NULL DEFAULT '',

  -- Mediciones eléctricas y de presión (JSONB)
  num_circuitos         INT          NOT NULL DEFAULT 1,
  unidad_presion        VARCHAR(10)  NOT NULL DEFAULT 'PSI',
  voltaje_red           VARCHAR(20)  NOT NULL DEFAULT '220V',
  mediciones_electricas JSONB        NOT NULL DEFAULT '[]',
  -- [{ fase: "R"|"S"|"T", voltaje: 220, amperaje: 5.1 }]
  mediciones_presion    JSONB        NOT NULL DEFAULT '[]',
  -- [{ circuito: 1, alta: 280, baja: 80, unidad: "PSI", refrigerante: "R-410A",
  --    sobrecalentamiento: 8, subenfriamiento: 6 }]

  -- Checklist (24 ítems)
  checklist             JSONB        NOT NULL DEFAULT '[]',
  -- [{ id, texto, estado: "ok"|"alerta"|"falla"|"na", observacion, fotos: [] }]

  -- Resultados
  hallazgos             TEXT         NOT NULL DEFAULT '',
  conclusiones          TEXT         NOT NULL DEFAULT '',
  recomendaciones       TEXT         NOT NULL DEFAULT '',
  repuestos             JSONB        NOT NULL DEFAULT '[]',
  fotos                 JSONB        NOT NULL DEFAULT '[]',
  costo_total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  duracion              INT          NOT NULL DEFAULT 0,  -- minutos

  -- Snapshot del equipo al momento del informe
  equipo_snapshot       JSONB,

  -- Firmas
  firma_tecnico         TEXT         NOT NULL DEFAULT '',  -- base64 SVG/PNG
  firma_cliente         TEXT         NOT NULL DEFAULT '',
  firmado_por_nombre    VARCHAR(255) NOT NULL DEFAULT '',
  firmado_por_email     VARCHAR(255) NOT NULL DEFAULT '',
  firmado_por_user_id   UUID         REFERENCES cmms_users(id)                  ON DELETE SET NULL,
  firmado_ip            VARCHAR(50)  NOT NULL DEFAULT '',
  firmado_en            TIMESTAMPTZ,
  clave_firma_hash      VARCHAR(255) NOT NULL DEFAULT '',  -- SHA-256
  hash_firma            VARCHAR(255) NOT NULL DEFAULT '',  -- hash canónico final

  -- Estado del documento
  estado                VARCHAR(20)  NOT NULL DEFAULT 'borrador'
                        CHECK (estado IN ('borrador','enviado','firmado','bloqueado')),

  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  sync_status           VARCHAR(20)  NOT NULL DEFAULT 'synced',

  UNIQUE (cliente_id, folio)
);

CREATE INDEX idx_inf_tenant   ON cmms_informes_mantenimiento(tenant_id);
CREATE INDEX idx_inf_cliente  ON cmms_informes_mantenimiento(cliente_id);
CREATE INDEX idx_inf_equipo   ON cmms_informes_mantenimiento(equipo_id);
CREATE INDEX idx_inf_tecnico  ON cmms_informes_mantenimiento(tecnico_id);
CREATE INDEX idx_inf_estado   ON cmms_informes_mantenimiento(estado);
CREATE INDEX idx_inf_fecha    ON cmms_informes_mantenimiento(fecha DESC);
```

### 4.11 Tabla: `cmms_checklist_plantillas`

```sql
CREATE TABLE cmms_checklist_plantillas (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES cmms_tenants(id)       ON DELETE CASCADE,
  cliente_id          UUID        NOT NULL REFERENCES cmms_clientes(id)      ON DELETE CASCADE,
  nombre              VARCHAR(255) NOT NULL,
  tipo_mantenimiento  VARCHAR(30)  NOT NULL DEFAULT '',
  tipo_equipo_id      UUID         REFERENCES cmms_tipos_equipo(id)          ON DELETE SET NULL,
  items               JSONB        NOT NULL DEFAULT '[]',
  -- [{ id, orden, etiqueta, tipo: "ok-no-ok"|"numerico"|"texto"|"foto",
  --    unidad, obligatorio, requiere_foto }]
  activo              BOOLEAN      NOT NULL DEFAULT true,
  created_by          UUID         REFERENCES cmms_users(id)                 ON DELETE SET NULL,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  version             INT          NOT NULL DEFAULT 1
);
```

### 4.12 Tabla: `cmms_pm_planes` (Planes de Mantenimiento Preventivo)

```sql
CREATE TABLE cmms_pm_planes (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES cmms_tenants(id)       ON DELETE CASCADE,
  cliente_id          UUID        NOT NULL REFERENCES cmms_clientes(id)      ON DELETE CASCADE,
  sucursal_id         UUID        REFERENCES cmms_sucursales(id)             ON DELETE SET NULL,
  equipo_id           UUID        NOT NULL REFERENCES cmms_equipos(id)       ON DELETE CASCADE,
  plantilla_id        UUID        REFERENCES cmms_checklist_plantillas(id)   ON DELETE SET NULL,
  tecnico_id          UUID        REFERENCES cmms_users(id)                  ON DELETE SET NULL,

  frecuencia_tipo     VARCHAR(20) NOT NULL DEFAULT 'meses'
                      CHECK (frecuencia_tipo IN ('dias','semanas','meses','horas_op')),
  frecuencia_valor    INT         NOT NULL DEFAULT 6,
  fecha_inicio        DATE,
  proxima_fecha       DATE,
  ultima_generacion   DATE,

  activo              BOOLEAN     NOT NULL DEFAULT true,
  created_by          UUID        REFERENCES cmms_users(id)                  ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pm_equipo    ON cmms_pm_planes(equipo_id);
CREATE INDEX idx_pm_fecha     ON cmms_pm_planes(proxima_fecha);
CREATE INDEX idx_pm_tecnico   ON cmms_pm_planes(tecnico_id);
```

### 4.13 Tabla: `cmms_inventario_repuestos` ← **NUEVO (FALTANTE)**

```sql
CREATE TABLE cmms_inventario_repuestos (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL REFERENCES cmms_tenants(id)    ON DELETE CASCADE,
  cliente_id      UUID         NOT NULL REFERENCES cmms_clientes(id)   ON DELETE CASCADE,
  codigo          VARCHAR(50)  NOT NULL,
  nombre          VARCHAR(255) NOT NULL,
  descripcion     TEXT         NOT NULL DEFAULT '',
  categoria       VARCHAR(50)  NOT NULL DEFAULT 'general',
  unidad          VARCHAR(20)  NOT NULL DEFAULT 'UN',
  stock_actual    NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_minimo    NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_maximo    NUMERIC(10,2) NOT NULL DEFAULT 0,
  ubicacion_bodega VARCHAR(100) NOT NULL DEFAULT '',
  costo_unitario  NUMERIC(12,2) NOT NULL DEFAULT 0,
  proveedor       VARCHAR(255) NOT NULL DEFAULT '',
  activo          BOOLEAN      NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, codigo)
);

-- Pivot: repuestos compatibles por tipo de equipo
CREATE TABLE cmms_repuestos_tipos_equipo (
  repuesto_id    UUID NOT NULL REFERENCES cmms_inventario_repuestos(id) ON DELETE CASCADE,
  tipo_equipo_id UUID NOT NULL REFERENCES cmms_tipos_equipo(id)         ON DELETE CASCADE,
  PRIMARY KEY (repuesto_id, tipo_equipo_id)
);

-- Movimientos de inventario
CREATE TABLE cmms_movimientos_inventario (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  repuesto_id     UUID         NOT NULL REFERENCES cmms_inventario_repuestos(id) ON DELETE CASCADE,
  mantenimiento_id UUID        REFERENCES cmms_mantenimientos(id)       ON DELETE SET NULL,
  ot_id           UUID         REFERENCES cmms_ordenes_trabajo(id)      ON DELETE SET NULL,
  tipo            VARCHAR(20)  NOT NULL
                  CHECK (tipo IN ('entrada','salida','ajuste','devolucion')),
  cantidad        NUMERIC(10,2) NOT NULL,
  stock_resultante NUMERIC(10,2) NOT NULL,
  notas           TEXT         NOT NULL DEFAULT '',
  usuario_id      UUID         REFERENCES cmms_users(id)                ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

### 4.14 Tabla: `cmms_sla_config`

```sql
CREATE TABLE cmms_sla_config (
  cliente_id          UUID        NOT NULL REFERENCES cmms_clientes(id) ON DELETE CASCADE,
  prioridad           VARCHAR(20) NOT NULL,
  tipo                VARCHAR(30) NOT NULL,
  response_minutos    INT         NOT NULL DEFAULT 60,
  resolution_minutos  INT         NOT NULL DEFAULT 480,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by          UUID        REFERENCES cmms_users(id)             ON DELETE SET NULL,
  PRIMARY KEY (cliente_id, prioridad, tipo)
);
```

### 4.15 Tabla: `cmms_contratos` ← **NUEVO (FALTANTE)**

```sql
CREATE TABLE cmms_contratos (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL REFERENCES cmms_tenants(id)    ON DELETE CASCADE,
  cliente_id      UUID         NOT NULL REFERENCES cmms_clientes(id)   ON DELETE CASCADE,
  codigo          VARCHAR(30)  NOT NULL,
  nombre          VARCHAR(255) NOT NULL,
  tipo            VARCHAR(30)  NOT NULL DEFAULT 'PM'
                  CHECK (tipo IN ('PM','Correctivo','Full','Parcial','Garantia')),
  fecha_inicio    DATE         NOT NULL,
  fecha_fin       DATE,
  monto_anual     NUMERIC(14,2) NOT NULL DEFAULT 0,
  moneda          VARCHAR(5)   NOT NULL DEFAULT 'CLP',
  estado          VARCHAR(20)  NOT NULL DEFAULT 'activo'
                  CHECK (estado IN ('borrador','activo','vencido','cancelado')),
  equipos_ids     JSONB        NOT NULL DEFAULT '[]',  -- UUID[]
  sucursales_ids  JSONB        NOT NULL DEFAULT '[]',  -- UUID[]
  condiciones     TEXT         NOT NULL DEFAULT '',
  archivo_url     TEXT         NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, codigo)
);
```

### 4.16 Tabla: `cmms_ot_eventos` (Timeline de OT)

```sql
CREATE TABLE cmms_ot_eventos (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  ot_id           UUID         NOT NULL REFERENCES cmms_ordenes_trabajo(id) ON DELETE CASCADE,
  tenant_id       UUID         NOT NULL REFERENCES cmms_tenants(id)         ON DELETE CASCADE,
  tipo            VARCHAR(50)  NOT NULL,
  -- Tipos: creado|abierta|asignada|en-progreso|en-pausa|resuelta|cerrada|
  --        cancelada|rechazada|comentario|foto_adjunta|repuesto_agregado
  actor_user_id   UUID         REFERENCES cmms_users(id)                    ON DELETE SET NULL,
  actor_nombre    VARCHAR(255) NOT NULL DEFAULT '',
  payload         JSONB        NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_ot_eventos_ot ON cmms_ot_eventos(ot_id, created_at DESC);
```

### 4.17 Tabla: `cmms_ot_comentarios`

```sql
CREATE TABLE cmms_ot_comentarios (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  ot_id           UUID         NOT NULL REFERENCES cmms_ordenes_trabajo(id) ON DELETE CASCADE,
  tenant_id       UUID         NOT NULL REFERENCES cmms_tenants(id)         ON DELETE CASCADE,
  autor_user_id   UUID         REFERENCES cmms_users(id)                    ON DELETE SET NULL,
  autor_nombre    VARCHAR(255) NOT NULL DEFAULT '',
  texto           TEXT         NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

### 4.18 Tabla: `cmms_sync_queue` ← **NUEVO CRÍTICO (Offline-First)**

```sql
CREATE TABLE cmms_sync_queue (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL REFERENCES cmms_tenants(id)   ON DELETE CASCADE,
  cliente_id      UUID         NOT NULL REFERENCES cmms_clientes(id)  ON DELETE CASCADE,
  user_id         UUID         REFERENCES cmms_users(id)              ON DELETE SET NULL,
  entidad         VARCHAR(50)  NOT NULL,
  -- Tipos: equipo|ot|mantenimiento|informe|checklist|repuesto
  entidad_id      TEXT         NOT NULL,                              -- UUID o local_id
  operacion       VARCHAR(20)  NOT NULL
                  CHECK (operacion IN ('create','update','delete')),
  payload         JSONB        NOT NULL DEFAULT '{}',
  estado          VARCHAR(20)  NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','procesando','completado','error')),
  intentos        INT          NOT NULL DEFAULT 0,
  error_mensaje   TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  processed_at    TIMESTAMPTZ
);

CREATE INDEX idx_sync_pendiente ON cmms_sync_queue(tenant_id, estado, created_at);
```

### 4.19 Tabla: `cmms_audit_log` ← **NUEVO (Trazabilidad)**

```sql
CREATE TABLE cmms_audit_log (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL REFERENCES cmms_tenants(id)   ON DELETE CASCADE,
  cliente_id      UUID         REFERENCES cmms_clientes(id)           ON DELETE SET NULL,
  user_id         UUID         REFERENCES cmms_users(id)              ON DELETE SET NULL,
  user_nombre     VARCHAR(255) NOT NULL DEFAULT '',
  accion          VARCHAR(50)  NOT NULL,
  -- create|update|delete|login|logout|export|sign|send
  entidad         VARCHAR(50)  NOT NULL,
  entidad_id      TEXT,
  valores_antes   JSONB,
  valores_despues JSONB,
  ip              VARCHAR(50)  NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_tenant  ON cmms_audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_user    ON cmms_audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_entidad ON cmms_audit_log(entidad, entidad_id);
```

### 4.20 Tabla: `cmms_push_subscriptions`

```sql
CREATE TABLE cmms_push_subscriptions (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES cmms_users(id)     ON DELETE CASCADE,
  endpoint        TEXT         NOT NULL UNIQUE,
  keys_auth       TEXT         NOT NULL,
  keys_p256dh     TEXT         NOT NULL,
  activo          BOOLEAN      NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

---

## 5. DIAGRAMA DE RELACIONES COMPLETO

```
cmms_tenants (1)
  │
  ├── cmms_clientes (N)          ← ID_cliente (UUID)
  │     │
  │     ├── cmms_sucursales (N)  ← ID_sucursal (UUID)
  │     │     │
  │     │     └── cmms_equipos (N) ─── cmms_tipos_equipo ← ID_tipo_equipo
  │     │           │
  │     │           ├── cmms_ordenes_trabajo (N)
  │     │           │     ├── cmms_ot_eventos (N)
  │     │           │     └── cmms_ot_comentarios (N)
  │     │           │
  │     │           ├── cmms_mantenimientos (N)
  │     │           │     └── cmms_informes_mantenimiento (1)
  │     │           │
  │     │           └── cmms_pm_planes (N)
  │     │
  │     ├── cmms_usuarios_clientes (N) ← pivot
  │     ├── cmms_sla_config (N)
  │     ├── cmms_contratos (N)
  │     └── cmms_inventario_repuestos (N)
  │           └── cmms_movimientos_inventario (N)
  │
  └── cmms_users (N)
        ├── cmms_push_subscriptions (N)
        └── cmms_audit_log (N)

Tablas transversales:
  cmms_checklist_plantillas ─── cmms_mantenimientos (via plantilla_id)
  cmms_pm_planes ─── cmms_equipos + cmms_checklist_plantillas
  cmms_sync_queue ─── (entidad genérica para offline)
  cmms_repuestos_tipos_equipo ─── M:N pivot
```

---

## 6. REGLAS DE NEGOCIO — CODIFICACIÓN TAG

### Generación Automática del TAG

```
Formato:  [CODIGO_SUCURSAL].[CODIGO_TIPO].[CORRELATIVO_3DIGITS]

Ejemplo:  21-STK.AC.001
          ┌─────────┐ │  └───────────── Auto-incremental por (sucursal + tipo)
          │  │      │ └──────────────── cmms_tipos_equipo.codigo
          │  └──────┼─────────────────  Prefijo del almacén (parte del código sucursal)
          └─────────────────────────── cmms_sucursales.codigo

Función SQL para auto-generar correlativo:
SELECT LPAD(
  (COUNT(*) + 1)::text, 3, '0'
) FROM cmms_equipos
WHERE cliente_id = $cliente_id
  AND sucursal_id = $sucursal_id
  AND tipo_equipo_id = $tipo_equipo_id;
```

### Flujo de Creación de Equipo

```
1. Seleccionar cliente      → ID_cliente   (cmms_clientes.id)
2. Seleccionar sucursal     → ID_sucursal  (cmms_sucursales.id)
3. Seleccionar tipo equipo  → ID_tipo      (cmms_tipos_equipo.id)
4. Sistema auto-genera TAG  = sucursal.codigo + "." + tipo.codigo + "." + correlativo
5. Técnico completa specs   (marca, modelo, serie, capacidad, etc.)
6. Guardar → validar UNIQUE (cliente_id, tag)
```

---

## 7. FLUJOS POR PLATAFORMA

### 7.1 Flujo Desktop (PC — Administrador / Supervisor)

```
Login
  └── Selector de Cliente (si múltiples clientes)
       └── Dashboard Principal
             ├── KPIs: Disponibilidad, MTBF, MTTR, Fallas
             ├── Alertas: PM vencidos, OTs críticas, stock mínimo
             └── Accesos rápidos
                  │
                  ├── ACTIVOS
                  │    ├── Inventario de Equipos (grid/lista/mapa)
                  │    │    ├── Crear equipo (modal, genera TAG)
                  │    │    ├── Importar masivo (CSV/Excel)
                  │    │    └── Detalle equipo → specs, historial, OTs, KPIs
                  │    ├── Sucursales (CRUD)
                  │    └── Tipos de Equipo (catálogo)
                  │
                  ├── MANTENIMIENTO
                  │    ├── Órdenes de Trabajo (listado, filtros, SLA badges)
                  │    │    ├── Crear OT → asignar equipo + técnico + prioridad
                  │    │    ├── Detalle OT → timeline, comentarios, resolución
                  │    │    └── SLA Config (por prioridad × tipo)
                  │    ├── Registro Mantenimientos (historial ejecución)
                  │    ├── Planificación (Calendario big-calendar)
                  │    └── Planes PM (frecuencia automática por equipo)
                  │
                  ├── INFORMES
                  │    ├── Listado Informes (folio, estado, firma)
                  │    ├── Editor Informe (checklist 24 ítems, mediciones, firma)
                  │    └── Exportar PDF / HTML / JSON
                  │
                  ├── REPORTES & ANALYTICS
                  │    ├── KPIs Generales (MTBF, MTTR, Disponibilidad)
                  │    ├── Costos por equipo / sucursal / técnico
                  │    ├── Energía (EFI — kWh, COP, eficiencia)
                  │    └── Exportar Excel consolidado
                  │
                  ├── INVENTARIO
                  │    ├── Repuestos (stock, alertas mínimos)
                  │    ├── Movimientos (entradas/salidas por OT)
                  │    └── Órdenes de Compra (futuro)
                  │
                  └── ADMINISTRACIÓN
                       ├── Usuarios (CRUD, perfiles, PINs)
                       ├── Clientes (solo PROGRAMADOR)
                       ├── Sucursales
                       ├── Contratos
                       ├── Checklist Plantillas
                       ├── Consola de Eventos
                       └── Configuración Sistema
```

### 7.2 Flujo Mobile PWA (Técnico en Terreno)

```
Pantalla Lock → Login con PIN (4 dígitos)
  └── Sync automático al login (LocalForage → servidor)
       └── MI DÍA (pantalla home mobile)
             ├── OTs asignadas hoy (lista compacta, CTA rápido)
             ├── Alertas urgentes (badge rojo)
             └── Acceso rápido
                  │
                  ├── SCANNER QR
                  │    └── Escanea TAG del equipo
                  │         └── Ficha equipo compacta
                  │              ├── Iniciar Mantenimiento
                  │              ├── Crear OT / Ticket
                  │              └── Ver historial
                  │
                  ├── MIS OTs (lista filtrada por técnico)
                  │    └── Detalle OT
                  │         ├── Iniciar → En progreso
                  │         ├── Agregar fotos (cámara con watermark)
                  │         ├── Checklist interactivo (requiere foto si obligatorio)
                  │         ├── Notas / Comentarios
                  │         └── Resolver → genera Mantenimiento
                  │
                  ├── NUEVO INFORME (campo)
                  │    ├── Seleccionar equipo (QR o búsqueda)
                  │    ├── Rellenar checklist offline
                  │    ├── Mediciones (eléctricas + presiones)
                  │    ├── Fotos evidencia (cámara)
                  │    ├── Firmas (técnico + cliente)
                  │    └── Guardar local → sync al conectar
                  │
                  └── HISTORIAL
                       └── Mis últimos informes / OTs ejecutadas
```

---

## 8. MAPA COMPLETO — MÓDULOS VS ESTADO

| # | Módulo | IA Studio | REPLIT | Estado | Prioridad |
|---|--------|-----------|--------|--------|-----------|
| 1 | Login PIN | ✅ | ✅ | Funcional | — |
| 2 | Selector Cliente | ✅ | ✅ | Funcional | — |
| 3 | Dashboard KPIs | ✅ | ✅ | Funcional | — |
| 4 | Inventario Equipos | ✅ | ✅ | Funcional | — |
| 5 | Crear Equipo (TAG auto) | ✅ | ✅ | Parcial (sin DB) | 🔴 |
| 6 | Detalle Equipo | ✅ | ✅ | Funcional | — |
| 7 | Scanner QR | ✅ | ✅ | Funcional | — |
| 8 | Mapa Geográfico | ✅ | ✅ | Funcional | — |
| 9 | Mantenimientos | ✅ | ✅ | Funcional (mock) | 🟡 |
| 10 | OT / Tickets | ✅ | ✅ | REPLIT completo | — |
| 11 | Detalle OT | ❌ | ✅ | Solo REPLIT | — |
| 12 | SLA Config | ❌ | ✅ | Solo REPLIT | — |
| 13 | Informes HVAC | ✅ | ✅ | Funcional | — |
| 14 | Editor Informe | ✅ | ✅ | Funcional | — |
| 15 | Planificación | ✅ | ✅ | Funcional | — |
| 16 | PM Planes | ❌ | ✅ | Solo REPLIT | — |
| 17 | PM Plantillas | ❌ | ✅ | Solo REPLIT | — |
| 18 | Checklist Admin | ❌ | ✅ | Solo REPLIT | — |
| 19 | Mi Día (mobile) | ❌ | ✅ | Solo REPLIT | — |
| 20 | Reportes & KPIs | ✅ | ✅ | Funcional | — |
| 21 | EFI Energía | ✅ | ❌ | Solo IA Studio | 🟡 |
| 22 | Administración | ✅ | ✅ | Parcial | 🟡 |
| 23 | Consola Eventos | ✅ | ✅ | Funcional | — |
| 24 | Configuración | ✅ | ✅ | Parcial | 🟡 |
| 25 | **Sucursales CRUD** | ❌ | ❌ | **FALTA** | 🔴 |
| 26 | **Tipos Equipo CRUD** | ❌ | ❌ | **FALTA** | 🔴 |
| 27 | **Inventario Repuestos** | ❌ | ❌ | **FALTA** | 🔴 |
| 28 | **Contratos** | ❌ | ❌ | **FALTA** | 🟡 |
| 29 | **Offline Sync** | ❌ | ❌ | **FALTA** | 🔴 |
| 30 | **PWA Install** | ❌ | ❌ | **FALTA** | 🔴 |
| 31 | **Audit Log** | ❌ | Parcial | **FALTA** | 🟡 |
| 32 | **Presupuestos/OC** | ❌ | ❌ | **FALTA** | 🟠 |

---

## 9. ELEMENTOS QUE FALTAN PARA SER COMPLETAMENTE FUNCIONAL

### 🔴 CRÍTICO (Bloquean el uso en producción)

1. **`cmms_sucursales` como tabla propia**
   - Problema actual: `sucursal` es solo un `text` en equipos
   - Impacto: No puedes filtrar equipos por sucursal, no hay contacto, no hay coords
   - Solución: Tabla + CRUD + dropdown en CreateEquipo

2. **`cmms_tipos_equipo` como catálogo**
   - Problema actual: `tipo` es `text` libre
   - Impacto: TAGs inconsistentes, sin vida útil por defecto, sin frecuencia PM
   - Solución: Tabla + seed inicial AC/VH/GE/EB/GO + uso en generador de TAG

3. **Conexión real a Neon DB**
   - Problema actual: IA STUDIO usa datos mock; REPLIT usa Drizzle local
   - Impacto: Datos no persisten entre sesiones
   - Solución: Migrar API routes a Vercel Functions + `@neondatabase/serverless`

4. **Offline-First con Service Worker + Sync Queue**
   - Problema actual: Sin PWA, sin cache, sin sync
   - Impacto: No funcional en terreno sin internet
   - Solución: SW + `cmms_sync_queue` + IndexedDB local

5. **Auth JWT real (no solo PIN + localStorage)**
   - Problema actual: Cualquiera puede cambiar `is_authenticated=true`
   - Impacto: Sin seguridad real
   - Solución: POST `/api/auth/login` → JWT signed + refresh token

### 🟡 ALTA (Degradan calidad del sistema)

6. **Inventario de Repuestos**
   - Actualmente `repuestos` es solo `string[]` en mantenimientos
   - Necesita: Stock real, alertas de mínimo, movimientos por OT

7. **Contratos de Servicio**
   - No existe relación cliente ↔ equipo ↔ contrato
   - Necesita: CRUD + vinculación con SLA

8. **Módulo Sucursales en UI (CRUD)**
   - No existe pantalla para crear/editar sucursales
   - Necesita: `/sucursales` con mapa de ubicación

9. **Audit Log centralizado**
   - Actualmente `change_history` solo en mantenimientos (JSONB)
   - Necesita: Tabla `cmms_audit_log` con todas las acciones

10. **Exportación masiva de equipos/informes**
    - Solo se exporta registro por registro
    - Necesita: Batch export con filtros → Excel / ZIP de PDFs

### 🟠 MEDIO (Mejoran competitividad)

11. Presupuestos / Cotizaciones automáticas
12. Integración email (envío de informes firmados)
13. Reportes automáticos periódicos (PDF ejecutivo mensual)
14. QR Labels con impresión en lote

---

## 10. PLAN DE IMPLEMENTACIÓN SUGERIDO

### Sprint 1 — Fundaciones (2 semanas)
- [ ] Crear schema Neon completo (todas las tablas)
- [ ] Auth JWT real (login + refresh)
- [ ] Migrar a Vercel Functions (api/*)
- [ ] Tabla `cmms_sucursales` + CRUD básico
- [ ] Tabla `cmms_tipos_equipo` + seed

### Sprint 2 — Equipos con ID reales (1 semana)
- [ ] Actualizar `cmms_equipos` con FK a sucursal + tipo_equipo
- [ ] Generador de TAG automático
- [ ] Validación UNIQUE por cliente
- [ ] Importación masiva CSV

### Sprint 3 — OT y Mantenimiento con DB real (2 semanas)
- [ ] Migrar OTs a Neon
- [ ] Migrar mantenimientos a Neon
- [ ] Informes con firma digital a Neon
- [ ] SLA config funcional

### Sprint 4 — Offline-First PWA (2 semanas)
- [ ] Service Worker + manifest.json
- [ ] IndexedDB con LocalForage
- [ ] `cmms_sync_queue` + sync bidireccional
- [ ] Mi Día optimizado mobile
- [ ] PWA install button

### Sprint 5 — Módulos faltantes (3 semanas)
- [ ] Inventario repuestos (CRUD + movimientos)
- [ ] Contratos de servicio
- [ ] Audit log centralizado
- [ ] Exportación masiva

### Sprint 6 — Pulido & Producción (1 semana)
- [ ] Row Level Security en Neon
- [ ] Pruebas end-to-end
- [ ] Documentación API
- [ ] Deploy Vercel + dominio custom

---

## 11. VARIABLES DE ENTORNO REQUERIDAS

```env
# Neon PostgreSQL
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Auth
JWT_SECRET=random-256-bit-string
JWT_REFRESH_SECRET=another-random-string
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google AI (OCR)
GEMINI_API_KEY=...

# Web Push
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@nbyb.cl

# App
NODE_ENV=production
APP_URL=https://cmms.nbyb.cl
TENANT_DEFAULT_ID=uuid-del-tenant-principal
```

---

## 12. RESUMEN EJECUTIVO

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Tablas DB | 12 (REPLIT) | **20** (schema completo) |
| Páginas Desktop | 16-25 | **27** consolidadas |
| Páginas Mobile | 0 | **8** optimizadas |
| Entidades normalizadas | 0 de 3 | **3/3** (cliente/sucursal/tipo) |
| Offline capability | ❌ | ✅ Service Worker + IndexedDB |
| Auth seguridad | PIN localStorage | **JWT + refresh** |
| Multitenant | Parcial (text) | **UUID FK + RLS** |
| Inventario | ❌ | ✅ Stock + movimientos |
| Contratos | ❌ | ✅ CRUD completo |
| Audit log | Parcial | ✅ Centralizado |
| Sync offline | ❌ | ✅ Queue + bidireccional |

---

**Versión:** 1.0 | **Fecha:** 2026-06-06 | **Autor:** NBYB SPA
