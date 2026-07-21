-- ============================================================================
-- INFORMES-NBYB - Migracion 002: estructura multi-tenant equipo/correlativo
-- ============================================================================
-- Agrega:
--   ID_Cliente     -> clients.id / hvac_reports.client_id
--   ID_Sitio       -> sub_branches.id / hvac_reports.branch_id
--   ID_Equipo      -> equipment.id / hvac_reports.equipment_id
--   ID_Correlativo -> hvac_reports.correlative, validado 0000..9999
--
-- Es idempotente y no elimina datos existentes.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de equipos por cliente/sitio
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

-- 2. Columnas relacionales en informes
ALTER TABLE hvac_reports ADD COLUMN IF NOT EXISTS equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL;
ALTER TABLE hvac_reports ADD COLUMN IF NOT EXISTS correlative SMALLINT;

ALTER TABLE hvac_reports DROP CONSTRAINT IF EXISTS hvac_reports_correlative_check;
ALTER TABLE hvac_reports ADD CONSTRAINT hvac_reports_correlative_check
  CHECK (correlative BETWEEN 0 AND 9999);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'hvac_reports'
      AND column_name = 'correlative_label'
  ) THEN
    ALTER TABLE hvac_reports
      ADD COLUMN correlative_label TEXT
      GENERATED ALWAYS AS (lpad(correlative::TEXT, 4, '0')) STORED;
  END IF;
END $$;

-- 3. Correlativo transaccional por equipo
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

-- 4. Backfill de relaciones desde nombres existentes
UPDATE hvac_reports r
SET client_id = c.id
FROM clients c
WHERE r.client_id IS NULL
  AND lower(c.name) = lower(r.client_name);

UPDATE hvac_reports r
SET branch_id = s.id
FROM sub_branches s
WHERE r.branch_id IS NULL
  AND r.client_id = s.client_id
  AND lower(s.name) = lower(r.branch_name);

-- 5. Backfill de equipos desde ficha tecnica embebida
INSERT INTO equipment (
  client_id, site_id, equipment_type, brand, model, serial_number,
  refrigerant_type, capacity, voltage, amperage, criticality
)
SELECT DISTINCT
  r.client_id, r.branch_id, r.equipment_type, r.brand, r.model, r.serial_number,
  r.refrigerant_type, r.capacity, r.voltage, r.amperage, r.criticality
FROM hvac_reports r
WHERE r.client_id IS NOT NULL
  AND r.branch_id IS NOT NULL
  AND NULLIF(trim(r.serial_number), '') IS NOT NULL
ON CONFLICT (client_id, site_id, serial_number) DO UPDATE SET
  equipment_type = COALESCE(EXCLUDED.equipment_type, equipment.equipment_type),
  brand = COALESCE(EXCLUDED.brand, equipment.brand),
  model = COALESCE(EXCLUDED.model, equipment.model),
  refrigerant_type = COALESCE(EXCLUDED.refrigerant_type, equipment.refrigerant_type),
  capacity = COALESCE(EXCLUDED.capacity, equipment.capacity),
  voltage = COALESCE(EXCLUDED.voltage, equipment.voltage),
  amperage = COALESCE(EXCLUDED.amperage, equipment.amperage),
  criticality = COALESCE(EXCLUDED.criticality, equipment.criticality),
  updated_at = now();

UPDATE hvac_reports r
SET equipment_id = e.id
FROM equipment e
WHERE r.equipment_id IS NULL
  AND r.client_id = e.client_id
  AND r.branch_id = e.site_id
  AND r.serial_number = e.serial_number;

-- 6. Asignar correlativos existentes por equipo, ordenados por fecha/creacion
WITH numbered AS (
  SELECT
    id,
    (row_number() OVER (
      PARTITION BY equipment_id
      ORDER BY report_date, created_at, id
    ) - 1)::SMALLINT AS next_value
  FROM hvac_reports
  WHERE equipment_id IS NOT NULL
    AND correlative IS NULL
)
UPDATE hvac_reports r
SET correlative = n.next_value
FROM numbered n
WHERE r.id = n.id
  AND n.next_value BETWEEN 0 AND 9999;

INSERT INTO equipment_report_counters (equipment_id, last_correlative)
SELECT equipment_id, max(correlative)::SMALLINT
FROM hvac_reports
WHERE equipment_id IS NOT NULL
  AND correlative IS NOT NULL
GROUP BY equipment_id
ON CONFLICT (equipment_id) DO UPDATE SET
  last_correlative = GREATEST(equipment_report_counters.last_correlative, EXCLUDED.last_correlative),
  updated_at = now();

-- 7. Indices y triggers
CREATE INDEX IF NOT EXISTS idx_reports_client_branch_equipment ON hvac_reports(client_id, branch_id, equipment_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_reports_equipment_correlative
  ON hvac_reports(client_id, branch_id, equipment_id, correlative)
  WHERE equipment_id IS NOT NULL AND correlative IS NOT NULL;

DROP TRIGGER IF EXISTS set_updated_at_equipment ON equipment;
CREATE TRIGGER set_updated_at_equipment
  BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
