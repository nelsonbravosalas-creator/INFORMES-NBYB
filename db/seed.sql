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

-- Admin user inicial (cambiar password tras primer login)
-- Hash de "Cambiar123!" con bcrypt rounds=10
INSERT INTO users (email, name, role, password_hash)
VALUES (
  'admin@nbyb.cl',
  'Administrador Principal',
  'admin',
  '$2b$10$rJZK0Q2QzKp3p5p5p5p5pe1QzKp3p5p5p5p5p5p5p5p5p5p5p5p5'  -- placeholder, regenerar
)
ON CONFLICT (email) DO NOTHING;
