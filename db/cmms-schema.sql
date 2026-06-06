-- ============================================================================
-- CMMS HVAC PRO — Schema PostgreSQL para Neon
-- Motor: Vercel + Neon Serverless PostgreSQL
-- Multitenant: tenant → cliente → sucursal → equipo
-- ============================================================================
-- INSTRUCCIONES: Pegar TODO en el SQL Editor de Neon y ejecutar.
-- ============================================================================

-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TENANTS — Empresa de mantenimiento (NBYB SPA, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cmms_tenants (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      VARCHAR(255) NOT NULL UNIQUE,
  rut         VARCHAR(20)  NOT NULL DEFAULT '',
  logo_url    TEXT         NOT NULL DEFAULT '',
  plan        VARCHAR(30)  NOT NULL DEFAULT 'profesional'
              CHECK (plan IN ('basico','profesional','enterprise')),
  activo      BOOLEAN      NOT NULL DEFAULT true,
  config      JSONB        NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. CLIENTES — Empresas contratantes (EECOL, etc.)  ← ID_cliente
-- ============================================================================
CREATE TABLE IF NOT EXISTS cmms_clientes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES cmms_tenants(id) ON DELETE CASCADE,
  codigo            VARCHAR(20) NOT NULL,          -- Código corto, ej: EECOL
  nombre            VARCHAR(255) NOT NULL,
  rut               VARCHAR(20)  NOT NULL DEFAULT '',
  logo_url          TEXT         NOT NULL DEFAULT '',
  plan              VARCHAR(30)  NOT NULL DEFAULT 'profesional'
                    CHECK (plan IN ('basico','profesional','enterprise')),
  activo            BOOLEAN      NOT NULL DEFAULT true,
  contacto_nombre   VARCHAR(255) NOT NULL DEFAULT '',
  contacto_email    VARCHAR(255) NOT NULL DEFAULT '',
  contacto_fono     VARCHAR(50)  NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_clientes_tenant ON cmms_clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON cmms_clientes(tenant_id, activo);

-- ============================================================================
-- 3. TIPOS DE EQUIPO — Catálogo  ← ID_tipo_equipo
-- ============================================================================
CREATE TABLE IF NOT EXISTS cmms_tipos_equipo (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        NOT NULL REFERENCES cmms_tenants(id) ON DELETE CASCADE,
  codigo                VARCHAR(10) NOT NULL,      -- AC, VH, GE, EB, GO, XX
  nombre                VARCHAR(100) NOT NULL,     -- Aire Acondicionado, etc.
  categoria             VARCHAR(30)  NOT NULL DEFAULT 'HVAC'
                        CHECK (categoria IN ('HVAC','ELECTRICO','MECANICO','CIVIL','IT','VEHICULO','OTRO')),
  vida_util_default     INT          NOT NULL DEFAULT 10,   -- años
  frecuencia_pm_meses   INT          NOT NULL DEFAULT 6,    -- meses entre PM
  activo                BOOLEAN      NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_tipos_tenant ON cmms_tipos_equipo(tenant_id);

-- ============================================================================
-- 4. USERS — Técnicos, supervisores, administradores
-- ============================================================================
CREATE TABLE IF NOT EXISTS cmms_users (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID        NOT NULL REFERENCES cmms_tenants(id) ON DELETE CASCADE,
  email                       VARCHAR(255) NOT NULL,
  pin_hash                    VARCHAR(255) NOT NULL,    -- bcrypt del PIN de 4 dígitos
  nombre                      VARCHAR(255) NOT NULL,
  perfil                      VARCHAR(30)  NOT NULL DEFAULT 'tecnico'
                              CHECK (perfil IN (
                                'programador','administrador','supervisor',
                                'tecnico','contratista','cliente','visita'
                              )),
  activo                      BOOLEAN      NOT NULL DEFAULT true,
  puede_editar_mantenimientos BOOLEAN      NOT NULL DEFAULT false,
  must_change_pin             BOOLEAN      NOT NULL DEFAULT true,
  pin_changed_at              TIMESTAMPTZ,
  ultimo_login                TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON cmms_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email  ON cmms_users(email);

-- ============================================================================
-- 5. SUCURSALES — Ubicaciones físicas del cliente  ← ID_sucursal
-- ============================================================================
CREATE TABLE IF NOT EXISTS cmms_sucursales (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES cmms_tenants(id)    ON DELETE CASCADE,
  cliente_id      UUID        NOT NULL REFERENCES cmms_clientes(id)   ON DELETE CASCADE,
  codigo          VARCHAR(20) NOT NULL,            -- ej: 21-STK, 11-STK, Planta-STK
  nombre          VARCHAR(255) NOT NULL,           -- ej: Santiago 14 de la Fama
  tipo            VARCHAR(30)  NOT NULL DEFAULT 'SUCURSAL'
                  CHECK (tipo IN (
                    'TIENDA','BODEGA','OFICINA','PLANTA','SUCURSAL',
                    'LABORATORIO','DATA CENTER','HOSPITAL','HOTEL','MALL','OTRO'
                  )),
  direccion       TEXT         NOT NULL DEFAULT '',
  region          VARCHAR(100) NOT NULL DEFAULT '',
  ciudad          VARCHAR(100) NOT NULL DEFAULT '',
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  contacto_nombre VARCHAR(255) NOT NULL DEFAULT '',
  contacto_email  VARCHAR(255) NOT NULL DEFAULT '',
  contacto_fono   VARCHAR(50)  NOT NULL DEFAULT '',
  activo          BOOLEAN      NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_sucursales_cliente ON cmms_sucursales(cliente_id);
CREATE INDEX IF NOT EXISTS idx_sucursales_tenant  ON cmms_sucursales(tenant_id);

-- ============================================================================
-- 6. USUARIOS_CLIENTES — Pivot N:N usuario ↔ cliente
-- ============================================================================
CREATE TABLE IF NOT EXISTS cmms_usuarios_clientes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES cmms_users(id)    ON DELETE CASCADE,
  cliente_id  UUID        NOT NULL REFERENCES cmms_clientes(id) ON DELETE CASCADE,
  tenant_id   UUID        NOT NULL REFERENCES cmms_tenants(id)  ON DELETE CASCADE,
  activo      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, cliente_id)
);

CREATE INDEX IF NOT EXISTS idx_uc_user    ON cmms_usuarios_clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_uc_cliente ON cmms_usuarios_clientes(cliente_id);

-- ============================================================================
-- 7. EQUIPOS — Activos físicos HVAC
--    TAG = [CODIGO_SUCURSAL].[CODIGO_TIPO].[CORRELATIVO]
--    Ej:   21-STK.AC.001
-- ============================================================================
CREATE TABLE IF NOT EXISTS cmms_equipos (
  -- Identificación
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tag             VARCHAR(50)  NOT NULL,
  nombre          VARCHAR(255) NOT NULL DEFAULT '',

  -- Trío de IDs de negocio
  tenant_id       UUID         NOT NULL REFERENCES cmms_tenants(id)      ON DELETE CASCADE,
  cliente_id      UUID         NOT NULL REFERENCES cmms_clientes(id)      ON DELETE CASCADE,
  sucursal_id     UUID         NOT NULL REFERENCES cmms_sucursales(id)    ON DELETE CASCADE,
  tipo_equipo_id  UUID         NOT NULL REFERENCES cmms_tipos_equipo(id)  ON DELETE RESTRICT,

  -- Especificaciones técnicas
  marca           VARCHAR(100) NOT NULL DEFAULT '',
  modelo          VARCHAR(100) NOT NULL DEFAULT '',
  serie           VARCHAR(100) NOT NULL DEFAULT '',
  capacidad       VARCHAR(50)  NOT NULL DEFAULT '',    -- BTU / TR / kW / HP
  voltaje         VARCHAR(20)  NOT NULL DEFAULT '',
  corriente       VARCHAR(20)  NOT NULL DEFAULT '',
  refrigerante    VARCHAR(20)  NOT NULL DEFAULT '',
  pot_elec        DOUBLE PRECISION,                   -- kW

  -- Ubicación dentro de la sucursal
  ubicacion       TEXT         NOT NULL DEFAULT '',
  area            VARCHAR(100) NOT NULL DEFAULT '',

  -- Ciclo de vida
  fecha_instalacion DATE,
  vida_util        INT          NOT NULL DEFAULT 10,
  horas_operacion  INT          NOT NULL DEFAULT 0,
  ultimo_mantenimiento  DATE,
  proximo_mantenimiento DATE,

  -- Estado
  estado          VARCHAR(20)  NOT NULL DEFAULT 'operativo'
                  CHECK (estado IN ('operativo','mantenimiento','falla','standby','retirado')),
  criticidad      VARCHAR(20)  NOT NULL DEFAULT 'no_critico'
                  CHECK (criticidad IN ('altamente_critico','critico','no_critico')),

  -- Geolocalización (hereda lat/lng de sucursal si es NULL)
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,

  -- Metadata
  notas           TEXT         NOT NULL DEFAULT '',
  fotos           JSONB        NOT NULL DEFAULT '[]',
  documentos      JSONB        NOT NULL DEFAULT '[]',
  tecnicos_ids    JSONB        NOT NULL DEFAULT '[]',  -- UUID[] de cmms_users
  source          VARCHAR(20)  NOT NULL DEFAULT 'user',
  created_by      UUID         REFERENCES cmms_users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  version         INT          NOT NULL DEFAULT 1,
  sync_status     VARCHAR(20)  NOT NULL DEFAULT 'synced'
                  CHECK (sync_status IN ('synced','pending','conflict')),
  local_id        VARCHAR(100),

  UNIQUE (cliente_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_equipos_tenant    ON cmms_equipos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_equipos_cliente   ON cmms_equipos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_equipos_sucursal  ON cmms_equipos(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_equipos_tipo      ON cmms_equipos(tipo_equipo_id);
CREATE INDEX IF NOT EXISTS idx_equipos_estado    ON cmms_equipos(estado);
CREATE INDEX IF NOT EXISTS idx_equipos_prox_mnt  ON cmms_equipos(proximo_mantenimiento);

-- ============================================================================
-- 8. CHECKLIST_PLANTILLAS — Plantillas de inspección por tipo de equipo
-- ============================================================================
CREATE TABLE IF NOT EXISTS cmms_checklist_plantillas (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES cmms_tenants(id)      ON DELETE CASCADE,
  cliente_id          UUID        NOT NULL REFERENCES cmms_clientes(id)      ON DELETE CASCADE,
  nombre              VARCHAR(255) NOT NULL,
  tipo_mantenimiento  VARCHAR(30)  NOT NULL DEFAULT '',
  tipo_equipo_id      UUID         REFERENCES cmms_tipos_equipo(id)          ON DELETE SET NULL,
  items               JSONB        NOT NULL DEFAULT '[]',
  activo              BOOLEAN      NOT NULL DEFAULT true,
  created_by          UUID         REFERENCES cmms_users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  version             INT          NOT NULL DEFAULT 1
);

-- ============================================================================
-- 9. SLA_CONFIG — Tiempos de respuesta/resolución por prioridad × tipo
-- ============================================================================
CREATE TABLE IF NOT EXISTS cmms_sla_config (
  cliente_id          UUID        NOT NULL REFERENCES cmms_clientes(id)  ON DELETE CASCADE,
  prioridad           VARCHAR(20) NOT NULL,
  tipo                VARCHAR(30) NOT NULL,
  response_minutos    INT         NOT NULL DEFAULT 60,
  resolution_minutos  INT         NOT NULL DEFAULT 480,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by          UUID        REFERENCES cmms_users(id) ON DELETE SET NULL,
  PRIMARY KEY (cliente_id, prioridad, tipo)
);

-- ============================================================================
-- 10. ORDENES_TRABAJO — OT con máquina de estados y SLA
-- ============================================================================
CREATE TABLE IF NOT EXISTS cmms_ordenes_trabajo (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo          VARCHAR(20) NOT NULL,            -- OT-2026-0001
  tenant_id       UUID        NOT NULL REFERENCES cmms_tenants(id)   ON DELETE CASCADE,
  cliente_id      UUID        NOT NULL REFERENCES cmms_clientes(id)  ON DELETE CASCADE,
  sucursal_id     UUID        REFERENCES cmms_sucursales(id)         ON DELETE SET NULL,
  equipo_id       UUID        REFERENCES cmms_equipos(id)            ON DELETE SET NULL,
  tag             VARCHAR(50) NOT NULL DEFAULT '',

  -- Clasificación
  tipo            VARCHAR(30) NOT NULL DEFAULT 'Correctivo'
                  CHECK (tipo IN ('Correctivo','Preventivo','Inspección','Emergencia','Instalación')),
  prioridad       VARCHAR(20) NOT NULL DEFAULT 'media'
                  CHECK (prioridad IN ('critica','alta','media','baja')),
  titulo          VARCHAR(255) NOT NULL,
  descripcion     TEXT         NOT NULL DEFAULT '',

  -- Estado (máquina de 9 estados)
  estado          VARCHAR(20) NOT NULL DEFAULT 'borrador'
                  CHECK (estado IN (
                    'borrador','abierta','asignada','en-progreso',
                    'en-pausa','resuelta','cerrada','cancelada','rechazada'
                  )),

  -- Personas
  solicitante_id  UUID        REFERENCES cmms_users(id) ON DELETE SET NULL,
  asignado_id     UUID        REFERENCES cmms_users(id) ON DELETE SET NULL,
  supervisor_id   UUID        REFERENCES cmms_users(id) ON DELETE SET NULL,
  asignado_nombre VARCHAR(255) NOT NULL DEFAULT '',

  -- SLA tracking
  sla_response_due_at   TIMESTAMPTZ,
  sla_resolution_due_at TIMESTAMPTZ,
  sla_paused_at         TIMESTAMPTZ,
  sla_paused_accum_ms   INT         NOT NULL DEFAULT 0,

  -- Evidencia
  imagenes        JSONB       NOT NULL DEFAULT '[]',
  notas           TEXT        NOT NULL DEFAULT '',

  -- Timestamps de transición
  abierta_at      TIMESTAMPTZ,
  asignada_at     TIMESTAMPTZ,
  en_progreso_at  TIMESTAMPTZ,
  resuelta_at     TIMESTAMPTZ,
  cerrada_at      TIMESTAMPTZ,

  -- Vinculación (se llena al resolver)
  mantenimiento_id UUID,                          -- FK añadida después (evita circular)

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  version         INT         NOT NULL DEFAULT 1,
  sync_status     VARCHAR(20) NOT NULL DEFAULT 'synced',

  UNIQUE (cliente_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_ot_tenant   ON cmms_ordenes_trabajo(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ot_cliente  ON cmms_ordenes_trabajo(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ot_sucursal ON cmms_ordenes_trabajo(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_ot_equipo   ON cmms_ordenes_trabajo(equipo_id);
CREATE INDEX IF NOT EXISTS idx_ot_asignado ON cmms_ordenes_trabajo(asignado_id);
CREATE INDEX IF NOT EXISTS idx_ot_estado   ON cmms_ordenes_trabajo(estado);
CREATE INDEX IF NOT EXISTS idx_ot_fecha    ON cmms_ordenes_trabajo(created_at DESC);

-- ============================================================================
-- 11. MANTENIMIENTOS — Registro de ejecución
-- ============================================================================
CREATE TABLE IF NOT EXISTS cmms_mantenimientos (
  id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID         NOT NULL REFERENCES cmms_tenants(id)         ON DELETE CASCADE,
  cliente_id              UUID         NOT NULL REFERENCES cmms_clientes(id)         ON DELETE CASCADE,
  sucursal_id             UUID         REFERENCES cmms_sucursales(id)               ON DELETE SET NULL,
  equipo_id               UUID         NOT NULL REFERENCES cmms_equipos(id)         ON DELETE CASCADE,
  tag                     VARCHAR(50)  NOT NULL DEFAULT '',
  ot_id                   UUID         REFERENCES cmms_ordenes_trabajo(id)          ON DELETE SET NULL,

  tipo                    VARCHAR(30)  NOT NULL
                          CHECK (tipo IN ('Preventivo','Correctivo','Predictivo','Inspección','Instalación')),
  descripcion             TEXT         NOT NULL DEFAULT '',
  fecha                   DATE         NOT NULL,
  fecha_fin               DATE,
  duracion                INT          NOT NULL DEFAULT 0,   -- minutos
  costo                   NUMERIC(12,2) NOT NULL DEFAULT 0,

  estado                  VARCHAR(20)  NOT NULL DEFAULT 'pendiente'
                          CHECK (estado IN ('pendiente','en-progreso','completado','cancelado')),
  prioridad               VARCHAR(20)  NOT NULL DEFAULT 'media'
                          CHECK (prioridad IN ('critica','alta','media','baja')),

  tecnico_id              UUID         REFERENCES cmms_users(id) ON DELETE SET NULL,
  tecnico_nombre          VARCHAR(255) NOT NULL DEFAULT '',

  hallazgos               TEXT         NOT NULL DEFAULT '',
  acciones                TEXT         NOT NULL DEFAULT '',
  proxima_fecha           DATE,
  repuestos               JSONB        NOT NULL DEFAULT '[]',
  fotos                   JSONB        NOT NULL DEFAULT '[]',

  checklist_plantilla_id  UUID         REFERENCES cmms_checklist_plantillas(id) ON DELETE SET NULL,
  checklist_respuestas    JSONB        NOT NULL DEFAULT '[]',

  created_by              UUID         REFERENCES cmms_users(id) ON DELETE SET NULL,
  edited_by               UUID         REFERENCES cmms_users(id) ON DELETE SET NULL,
  change_history          JSONB        NOT NULL DEFAULT '[]',
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  version                 INT          NOT NULL DEFAULT 1,
  sync_status             VARCHAR(20)  NOT NULL DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_mnt_tenant   ON cmms_mantenimientos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mnt_cliente  ON cmms_mantenimientos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_mnt_equipo   ON cmms_mantenimientos(equipo_id);
CREATE INDEX IF NOT EXISTS idx_mnt_tecnico  ON cmms_mantenimientos(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_mnt_estado   ON cmms_mantenimientos(estado);
CREATE INDEX IF NOT EXISTS idx_mnt_fecha    ON cmms_mantenimientos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_mnt_ot       ON cmms_mantenimientos(ot_id);

-- FK circular resuelta con ALTER TABLE después de crear ambas tablas
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_ot_mantenimiento'
  ) THEN
    ALTER TABLE cmms_ordenes_trabajo
      ADD CONSTRAINT fk_ot_mantenimiento
      FOREIGN KEY (mantenimiento_id) REFERENCES cmms_mantenimientos(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 12. INFORMES_MANTENIMIENTO — Informe técnico HVAC con firmas digitales
-- ============================================================================
CREATE TABLE IF NOT EXISTS cmms_informes_mantenimiento (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  folio                 VARCHAR(30)  NOT NULL,         -- INF-2026-0001
  tenant_id             UUID         NOT NULL REFERENCES cmms_tenants(id)       ON DELETE CASCADE,
  cliente_id            UUID         NOT NULL REFERENCES cmms_clientes(id)      ON DELETE CASCADE,
  sucursal_id           UUID         REFERENCES cmms_sucursales(id)             ON DELETE SET NULL,
  equipo_id             UUID         NOT NULL REFERENCES cmms_equipos(id)       ON DELETE CASCADE,
  mantenimiento_id      UUID         REFERENCES cmms_mantenimientos(id)         ON DELETE SET NULL,
  tag                   VARCHAR(50)  NOT NULL DEFAULT '',

  -- Datos del servicio
  fecha                 DATE         NOT NULL,
  tipo_servicio         VARCHAR(50)  NOT NULL DEFAULT 'Preventivo',
  tecnico_id            UUID         REFERENCES cmms_users(id) ON DELETE SET NULL,
  tecnico               VARCHAR(255) NOT NULL DEFAULT '',

  -- Contacto en sitio
  contacto_nombre       VARCHAR(255) NOT NULL DEFAULT '',
  contacto_email        VARCHAR(255) NOT NULL DEFAULT '',
  contacto_telefono     VARCHAR(50)  NOT NULL DEFAULT '',

  -- Mediciones (JSONB)
  num_circuitos         INT          NOT NULL DEFAULT 1,
  unidad_presion        VARCHAR(10)  NOT NULL DEFAULT 'PSI',
  voltaje_red           VARCHAR(20)  NOT NULL DEFAULT '220V',
  mediciones_electricas JSONB        NOT NULL DEFAULT '[]',
  -- [{ fase:"R"|"S"|"T", voltaje:220, amperaje:5.1 }]
  mediciones_presion    JSONB        NOT NULL DEFAULT '[]',
  -- [{ circuito:1, alta:280, baja:80, unidad:"PSI", refrigerante:"R-410A",
  --    sobrecalentamiento:8, subenfriamiento:6 }]

  -- Checklist 24 ítems
  checklist             JSONB        NOT NULL DEFAULT '[]',
  -- [{ id, texto, estado:"ok"|"alerta"|"falla"|"na", observacion, fotos:[] }]

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

  -- Firmas digitales (base64)
  firma_tecnico         TEXT         NOT NULL DEFAULT '',
  firma_cliente         TEXT         NOT NULL DEFAULT '',
  firmado_por_nombre    VARCHAR(255) NOT NULL DEFAULT '',
  firmado_por_email     VARCHAR(255) NOT NULL DEFAULT '',
  firmado_por_user_id   UUID         REFERENCES cmms_users(id) ON DELETE SET NULL,
  firmado_ip            VARCHAR(50)  NOT NULL DEFAULT '',
  firmado_en            TIMESTAMPTZ,
  clave_firma_hash      VARCHAR(255) NOT NULL DEFAULT '',  -- SHA-256
  hash_firma            VARCHAR(255) NOT NULL DEFAULT '',

  -- Estado del documento
  estado                VARCHAR(20)  NOT NULL DEFAULT 'borrador'
                        CHECK (estado IN ('borrador','enviado','firmado','bloqueado')),

  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  sync_status           VARCHAR(20)  NOT NULL DEFAULT 'synced',

  UNIQUE (cliente_id, folio)
);

CREATE INDEX IF NOT EXISTS idx_inf_tenant  ON cmms_informes_mantenimiento(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inf_cliente ON cmms_informes_mantenimiento(cliente_id);
CREATE INDEX IF NOT EXISTS idx_inf_equipo  ON cmms_informes_mantenimiento(equipo_id);
CREATE INDEX IF NOT EXISTS idx_inf_tecnico ON cmms_informes_mantenimiento(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_inf_estado  ON cmms_informes_mantenimiento(estado);
CREATE INDEX IF NOT EXISTS idx_inf_fecha   ON cmms_informes_mantenimiento(fecha DESC);

-- ============================================================================
-- 13. PM_PLANES — Planes de mantenimiento preventivo automático
-- ============================================================================
CREATE TABLE IF NOT EXISTS cmms_pm_planes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES cmms_tenants(id)             ON DELETE CASCADE,
  cliente_id       UUID        NOT NULL REFERENCES cmms_clientes(id)            ON DELETE CASCADE,
  sucursal_id      UUID        REFERENCES cmms_sucursales(id)                   ON DELETE SET NULL,
  equipo_id        UUID        NOT NULL REFERENCES cmms_equipos(id)             ON DELETE CASCADE,
  plantilla_id     UUID        REFERENCES cmms_checklist_plantillas(id)         ON DELETE SET NULL,
  tecnico_id       UUID        REFERENCES cmms_users(id)                        ON DELETE SET NULL,

  frecuencia_tipo  VARCHAR(20) NOT NULL DEFAULT 'meses'
                   CHECK (frecuencia_tipo IN ('dias','semanas','meses','horas_op')),
  frecuencia_valor INT         NOT NULL DEFAULT 6,
  fecha_inicio     DATE,
  proxima_fecha    DATE,
  ultima_generacion DATE,

  activo           BOOLEAN     NOT NULL DEFAULT true,
  created_by       UUID        REFERENCES cmms_users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_equipo ON cmms_pm_planes(equipo_id);
CREATE INDEX IF NOT EXISTS idx_pm_fecha  ON cmms_pm_planes(proxima_fecha);

-- ============================================================================
-- 14. OT_EVENTOS — Timeline de eventos de la OT (append-only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cmms_ot_eventos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ot_id         UUID        NOT NULL REFERENCES cmms_ordenes_trabajo(id) ON DELETE CASCADE,
  tenant_id     UUID        NOT NULL REFERENCES cmms_tenants(id)         ON DELETE CASCADE,
  tipo          VARCHAR(50) NOT NULL,
  actor_user_id UUID        REFERENCES cmms_users(id) ON DELETE SET NULL,
  actor_nombre  VARCHAR(255) NOT NULL DEFAULT '',
  payload       JSONB        NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ot_ev_ot ON cmms_ot_eventos(ot_id, created_at DESC);

-- ============================================================================
-- 15. OT_COMENTARIOS — Comentarios de técnicos en la OT
-- ============================================================================
CREATE TABLE IF NOT EXISTS cmms_ot_comentarios (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ot_id         UUID        NOT NULL REFERENCES cmms_ordenes_trabajo(id) ON DELETE CASCADE,
  tenant_id     UUID        NOT NULL REFERENCES cmms_tenants(id)         ON DELETE CASCADE,
  autor_user_id UUID        REFERENCES cmms_users(id) ON DELETE SET NULL,
  autor_nombre  VARCHAR(255) NOT NULL DEFAULT '',
  texto         TEXT         NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ot_com_ot ON cmms_ot_comentarios(ot_id, created_at DESC);

-- ============================================================================
-- 16. INVENTARIO_REPUESTOS — Stock de piezas y materiales
-- ============================================================================
CREATE TABLE IF NOT EXISTS cmms_inventario_repuestos (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL REFERENCES cmms_tenants(id)   ON DELETE CASCADE,
  cliente_id      UUID         NOT NULL REFERENCES cmms_clientes(id)  ON DELETE CASCADE,
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

-- Pivot: repuestos compatibles con tipos de equipo
CREATE TABLE IF NOT EXISTS cmms_repuestos_tipos_equipo (
  repuesto_id    UUID NOT NULL REFERENCES cmms_inventario_repuestos(id) ON DELETE CASCADE,
  tipo_equipo_id UUID NOT NULL REFERENCES cmms_tipos_equipo(id)         ON DELETE CASCADE,
  PRIMARY KEY (repuesto_id, tipo_equipo_id)
);

-- Movimientos de stock
CREATE TABLE IF NOT EXISTS cmms_movimientos_inventario (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  repuesto_id      UUID         NOT NULL REFERENCES cmms_inventario_repuestos(id) ON DELETE CASCADE,
  mantenimiento_id UUID         REFERENCES cmms_mantenimientos(id) ON DELETE SET NULL,
  ot_id            UUID         REFERENCES cmms_ordenes_trabajo(id) ON DELETE SET NULL,
  tipo             VARCHAR(20)  NOT NULL
                   CHECK (tipo IN ('entrada','salida','ajuste','devolucion')),
  cantidad         NUMERIC(10,2) NOT NULL,
  stock_resultante NUMERIC(10,2) NOT NULL,
  notas            TEXT         NOT NULL DEFAULT '',
  usuario_id       UUID         REFERENCES cmms_users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================================================
-- 17. CONTRATOS — Contratos de servicio
-- ============================================================================
CREATE TABLE IF NOT EXISTS cmms_contratos (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL REFERENCES cmms_tenants(id)   ON DELETE CASCADE,
  cliente_id      UUID         NOT NULL REFERENCES cmms_clientes(id)  ON DELETE CASCADE,
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
  equipos_ids     JSONB        NOT NULL DEFAULT '[]',
  sucursales_ids  JSONB        NOT NULL DEFAULT '[]',
  condiciones     TEXT         NOT NULL DEFAULT '',
  archivo_url     TEXT         NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, codigo)
);

-- ============================================================================
-- 18. SYNC_QUEUE — Cola de sincronización offline-first
-- ============================================================================
CREATE TABLE IF NOT EXISTS cmms_sync_queue (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES cmms_tenants(id)   ON DELETE CASCADE,
  cliente_id      UUID        NOT NULL REFERENCES cmms_clientes(id)  ON DELETE CASCADE,
  user_id         UUID        REFERENCES cmms_users(id)              ON DELETE SET NULL,
  entidad         VARCHAR(50) NOT NULL,
  entidad_id      TEXT        NOT NULL,
  operacion       VARCHAR(20) NOT NULL CHECK (operacion IN ('create','update','delete')),
  payload         JSONB       NOT NULL DEFAULT '{}',
  estado          VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','procesando','completado','error')),
  intentos        INT         NOT NULL DEFAULT 0,
  error_mensaje   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_pendiente ON cmms_sync_queue(tenant_id, estado, created_at);

-- ============================================================================
-- 19. AUDIT_LOG — Trazabilidad centralizada de todas las acciones
-- ============================================================================
CREATE TABLE IF NOT EXISTS cmms_audit_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES cmms_tenants(id)  ON DELETE CASCADE,
  cliente_id      UUID        REFERENCES cmms_clientes(id)          ON DELETE SET NULL,
  user_id         UUID        REFERENCES cmms_users(id)             ON DELETE SET NULL,
  user_nombre     VARCHAR(255) NOT NULL DEFAULT '',
  accion          VARCHAR(50) NOT NULL,
  entidad         VARCHAR(50) NOT NULL,
  entidad_id      TEXT,
  valores_antes   JSONB,
  valores_despues JSONB,
  ip              VARCHAR(50) NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant  ON cmms_audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user    ON cmms_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entidad ON cmms_audit_log(entidad, entidad_id);

-- ============================================================================
-- 20. PUSH_SUBSCRIPTIONS — Web Push Notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS cmms_push_subscriptions (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID    NOT NULL REFERENCES cmms_users(id) ON DELETE CASCADE,
  endpoint      TEXT    NOT NULL UNIQUE,
  keys_auth     TEXT    NOT NULL,
  keys_p256dh   TEXT    NOT NULL,
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TRIGGERS — updated_at automático
-- ============================================================================
CREATE OR REPLACE FUNCTION cmms_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  CREATE TRIGGER trg_tenants_upd
    BEFORE UPDATE ON cmms_tenants
    FOR EACH ROW EXECUTE FUNCTION cmms_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_clientes_upd
    BEFORE UPDATE ON cmms_clientes
    FOR EACH ROW EXECUTE FUNCTION cmms_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_sucursales_upd
    BEFORE UPDATE ON cmms_sucursales
    FOR EACH ROW EXECUTE FUNCTION cmms_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_users_upd
    BEFORE UPDATE ON cmms_users
    FOR EACH ROW EXECUTE FUNCTION cmms_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_equipos_upd
    BEFORE UPDATE ON cmms_equipos
    FOR EACH ROW EXECUTE FUNCTION cmms_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_ot_upd
    BEFORE UPDATE ON cmms_ordenes_trabajo
    FOR EACH ROW EXECUTE FUNCTION cmms_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_mnt_upd
    BEFORE UPDATE ON cmms_mantenimientos
    FOR EACH ROW EXECUTE FUNCTION cmms_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_inf_upd
    BEFORE UPDATE ON cmms_informes_mantenimiento
    FOR EACH ROW EXECUTE FUNCTION cmms_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER trg_rep_upd
    BEFORE UPDATE ON cmms_inventario_repuestos
    FOR EACH ROW EXECUTE FUNCTION cmms_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- FUNCIÓN: Auto-generar correlativo del TAG
-- Uso: SELECT cmms_next_tag_correlativo(sucursal_id, tipo_equipo_id);
-- ============================================================================
CREATE OR REPLACE FUNCTION cmms_next_tag_correlativo(
  p_cliente_id UUID,
  p_sucursal_codigo VARCHAR,
  p_tipo_codigo VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
  v_count INT;
  v_next  VARCHAR;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM cmms_equipos e
  JOIN cmms_sucursales s ON s.id = e.sucursal_id
  JOIN cmms_tipos_equipo t ON t.id = e.tipo_equipo_id
  WHERE e.cliente_id = p_cliente_id
    AND s.codigo     = p_sucursal_codigo
    AND t.codigo     = p_tipo_codigo;

  v_next := LPAD((v_count + 1)::TEXT, 3, '0');
  RETURN p_sucursal_codigo || '.' || p_tipo_codigo || '.' || v_next;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED — Datos iniciales
-- ============================================================================

-- Tenant NBYB SPA
INSERT INTO cmms_tenants (id, nombre, rut, plan)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'NBYB SPA', '77.000.000-0', 'enterprise'
) ON CONFLICT DO NOTHING;

-- Tipos de equipo (seed básico)
INSERT INTO cmms_tipos_equipo (tenant_id, codigo, nombre, categoria, vida_util_default, frecuencia_pm_meses)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'AC', 'Aire Acondicionado',    'HVAC',     10, 6),
  ('00000000-0000-0000-0000-000000000001', 'VH', 'Vehículo',              'VEHICULO', 5,  12),
  ('00000000-0000-0000-0000-000000000001', 'GE', 'Grupo Electrógeno',     'ELECTRICO',15, 3),
  ('00000000-0000-0000-0000-000000000001', 'EB', 'Equipo de Bodega',      'MECANICO', 8,  12),
  ('00000000-0000-0000-0000-000000000001', 'GO', 'Grúa Horquilla',        'MECANICO', 10, 6),
  ('00000000-0000-0000-0000-000000000001', 'CH', 'Chiller Industrial',    'HVAC',     20, 3),
  ('00000000-0000-0000-0000-000000000001', 'FC', 'Fan Coil',              'HVAC',     10, 6),
  ('00000000-0000-0000-0000-000000000001', 'CT', 'Torre de Enfriamiento', 'HVAC',     15, 3),
  ('00000000-0000-0000-0000-000000000001', 'XX', 'Otros Activos',         'OTRO',     10, 12)
ON CONFLICT DO NOTHING;

-- Cliente EECOL (demo)
INSERT INTO cmms_clientes (id, tenant_id, codigo, nombre, rut, plan)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'EECOL', 'EECOL Chile S.A.', '96.541.220-3', 'enterprise'
) ON CONFLICT DO NOTHING;

-- Sucursales de EECOL
INSERT INTO cmms_sucursales (tenant_id, cliente_id, codigo, nombre, tipo, region, ciudad)
VALUES
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','11-STK','Iquique',              'OFICINA', 'Tarapacá',         'Iquique'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','12-STK','Antofagasta',          'OFICINA', 'Antofagasta',       'Antofagasta'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','13-STK','Copiapó',              'OFICINA', 'Atacama',           'Copiapó'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','21-STK','Santiago 14 de la Fama','OFICINA','Metropolitana',     'Santiago'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','23-STK','Viña del Mar',         'OFICINA', 'Valparaíso',        'Viña del Mar'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','24-STK','Rancagua',             'OFICINA', 'O''Higgins',        'Rancagua'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','31-STK','Concepción',           'OFICINA', 'Biobío',            'Concepción'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','32-STK','Puerto Montt',         'OFICINA', 'Los Lagos',         'Puerto Montt'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','Planta-STK','Planta Industrial','PLANTA',  'Metropolitana',     'Santiago')
ON CONFLICT DO NOTHING;

-- Usuario admin NBYB
INSERT INTO cmms_users (id, tenant_id, email, pin_hash, nombre, perfil, puede_editar_mantenimientos, must_change_pin)
VALUES (
  '00000000-0000-0000-0000-000000000100',
  '00000000-0000-0000-0000-000000000001',
  'nbravo.nbyb@gmail.com',
  '$2b$10$PLACEHOLDER_HASH',           -- reemplazar con bcrypt real de PIN 3517
  'Nelson Bravo',
  'programador',
  true, false
) ON CONFLICT DO NOTHING;

-- Asignar usuario al cliente
INSERT INTO cmms_usuarios_clientes (user_id, cliente_id, tenant_id)
VALUES (
  '00000000-0000-0000-0000-000000000100',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT DO NOTHING;

-- SLA por defecto para EECOL
INSERT INTO cmms_sla_config (cliente_id, prioridad, tipo, response_minutos, resolution_minutos)
VALUES
  ('00000000-0000-0000-0000-000000000010', 'critica',  'Correctivo',  30,   120),
  ('00000000-0000-0000-0000-000000000010', 'alta',     'Correctivo',  60,   480),
  ('00000000-0000-0000-0000-000000000010', 'media',    'Correctivo',  240,  1440),
  ('00000000-0000-0000-0000-000000000010', 'baja',     'Correctivo',  480,  2880),
  ('00000000-0000-0000-0000-000000000010', 'media',    'Preventivo',  1440, 4320),
  ('00000000-0000-0000-0000-000000000010', 'alta',     'Emergencia',  15,   60)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE 'cmms_%'
ORDER BY tablename;
