-- ============================================================================
-- MIGRACION 004: Persistencia completa del editor de informes HVAC
-- ============================================================================
-- Guarda una copia JSONB completa del contrato del formulario para evitar que
-- campos nuevos o no indexables se pierdan al sincronizar desde Neon.

ALTER TABLE hvac_reports
  ADD COLUMN IF NOT EXISTS report_payload JSONB NOT NULL DEFAULT '{}'::jsonb;
