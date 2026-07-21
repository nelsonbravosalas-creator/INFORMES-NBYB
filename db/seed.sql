-- ============================================================================
-- INFORMES-NBYB — Datos iniciales (seed)
-- ============================================================================
-- Ejecutar DESPUÉS de schema.sql para poblar catálogos básicos
-- ============================================================================

-- Catálogos en admin_settings
UPDATE admin_settings SET
  brands = '["Carrier","Daikin","Trane","York","LG Electronics","Lennox","Rheem","Mitsubishi Electric","Midea"]'::jsonb,
  refrigerants = '["R-410A","R-22","R-134a","R-404A","R-407C","R-32","R-454B"]'::jsonb,
  equipment_types = '["Aire Acondicionado Split Wall","Unidad Paquete (Rooftop)","Chiller (Enfriador de Agua)","Equipo Fancoil Integrado","Sistema VRF (Flujo Var. Refrigerante)","Manejadora de Aire (AHU)","Torre de Enfriamiento"]'::jsonb,
  techs = '["Ing. Carlos Mendoza","Téc. Nelson Bravo","Téc. Alejandro Ruiz","Téc. Sofía Espinoza"]'::jsonb
WHERE id = 1;

-- Los usuarios de acceso (admin@nbyb.cl / tecnico@nbyb.cl) se siembran en
-- schema.sql junto con la tabla `users`, con PIN hasheado vía pgcrypto.
