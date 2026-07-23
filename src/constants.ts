import { InspectionChecklistItem, AdminSettings } from "./types";

export const DEFAULT_CHECKLIST_TEMPLATE: InspectionChecklistItem[] = [
  // General
  { id: "chk_visual_general", category: "General", label: "Inspección visual general", status: "cumple", images: [], notes: "" },
  { id: "chk_general_function", category: "General", label: "Funcionamiento general", status: "cumple", images: [], notes: "" },

  // Filtros y Limpieza
  { id: "chk_filters_cleaning", category: "Filtros y Limpieza", label: "Limpieza de filtros", status: "cumple", images: [], notes: "" },
  { id: "chk_disposable_filters", category: "Filtros y Limpieza", label: "Instalación filtros desechables", status: "cumple", images: [], notes: "" },
  { id: "chk_evap_coil", category: "Filtros y Limpieza", label: "Limpieza de evaporador", status: "cumple", images: [], notes: "" },
  { id: "chk_cond_coil", category: "Filtros y Limpieza", label: "Limpieza de condensador", status: "cumple", images: [], notes: "" },
  { id: "chk_drain_pan_cleaning", category: "Filtros y Limpieza", label: "Limpieza de bandejas", status: "cumple", images: [], notes: "" },

  // Condensados y Drenaje
  { id: "chk_condensate_pump", category: "Condensados y Drenaje", label: "Bomba de condensado", status: "cumple", images: [], notes: "" },
  { id: "chk_drain_verification", category: "Condensados y Drenaje", label: "Verificación de desagüe", status: "cumple", images: [], notes: "" },

  // Ventilación y Mecánico
  { id: "chk_evap_fans", category: "Ventilación y Mecánico", label: "Revisión de ventiladores de evaporador", status: "cumple", images: [], notes: "" },
  { id: "chk_cond_fans", category: "Ventilación y Mecánico", label: "Revisión de ventiladores de condensador", status: "cumple", images: [], notes: "" },
  { id: "chk_bearing_lubrication", category: "Ventilación y Mecánico", label: "Lubricación de rodamientos", status: "cumple", images: [], notes: "" },
  { id: "chk_compressor_condition", category: "Ventilación y Mecánico", label: "Revisión del estado de compresores", status: "cumple", images: [], notes: "" },

  // Mediciones Eléctricas
  { id: "chk_current_general", category: "Mediciones Eléctricas", label: "Medición de consumos general", status: "cumple", images: [], notes: "" },
  { id: "chk_current_compressor", category: "Mediciones Eléctricas", label: "Medición de consumos de compresor", status: "cumple", images: [], notes: "" },
  { id: "chk_current_heaters", category: "Mediciones Eléctricas", label: "Medición de consumos de calefactores", status: "cumple", images: [], notes: "" },
  { id: "chk_current_evap_fan", category: "Mediciones Eléctricas", label: "Medición de consumos de ventilador evaporador", status: "cumple", images: [], notes: "" },
  { id: "chk_current_cond_fan", category: "Mediciones Eléctricas", label: "Medición de consumos de ventilador condensador", status: "cumple", images: [], notes: "" },
  { id: "chk_supply_voltage", category: "Mediciones Eléctricas", label: "Tensiones de alimentación", status: "cumple", images: [], notes: "" },
  { id: "chk_relays_contactors", category: "Mediciones Eléctricas", label: "Relés y contactores", status: "cumple", images: [], notes: "" },

  // Refrigeración
  { id: "chk_pressure_switches", category: "Refrigeración", label: "Presostatos alta y baja", status: "cumple", images: [], notes: "" },
  { id: "chk_refrigerant_pressures", category: "Refrigeración", label: "Presiones de refrigerante", status: "cumple", images: [], notes: "" },
  { id: "chk_refrigerant_charge", category: "Refrigeración", label: "Recarga de refrigerante", status: "cumple", images: [], notes: "" },
  { id: "chk_work_temperatures", category: "Refrigeración", label: "Temperaturas de trabajo", status: "cumple", images: [], notes: "" },
  { id: "chk_expansion_valve", category: "Refrigeración", label: "Válvula de expansión", status: "cumple", images: [], notes: "" },
  { id: "chk_refrigerant_level", category: "Refrigeración", label: "Nivel de refrigerante", status: "cumple", images: [], notes: "" },
  { id: "chk_refrigerant_leaks", category: "Refrigeración", label: "Fugas de refrigerante", status: "cumple", images: [], notes: "" },

  // Control y Seguridad
  { id: "chk_controls_thermostats", category: "Control y Seguridad", label: "Controles y termostatos", status: "cumple", images: [], notes: "" },
  { id: "chk_alarms_protections", category: "Control y Seguridad", label: "Alarmas y protecciones", status: "cumple", images: [], notes: "" },

  // Pruebas
  { id: "chk_pressure_test", category: "Pruebas", label: "Prueba de presión", status: "cumple", images: [], notes: "" },
];

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  companyName: "ClimaTech Pro Servicios HVAC",
  companyAddress: "Av. Industrial #4520, Sector Metropolitano",
  clients: [
    "Plaza Central Mall",
    "Corporativo Torres Alfa",
    "Supermercados Del Ahorro",
    "Clínica Médica Metropolitana",
    "Almacenes Generales S.A."
  ],
  branches: {
    "Plaza Central Mall": ["Edificio Norte", "Área de Comidas", "Locales Ancla"],
    "Corporativo Torres Alfa": ["Torre A - Piso 4", "Torre B - Data Center", "Sótano Calderas"],
    "Supermercados Del Ahorro": ["Sucursal Centro", "Sucursal Poniente", "Centro de Distribución"],
    "Clínica Médica Metropolitana": ["Pabellón Quirófano", "Urgencias", "Consultorios"],
    "Almacenes Generales S.A.": ["Bodega Refrigerada 1", "Bodega Climatizada 2"]
  },
  equipmentTypes: [
    "Aire Acondicionado Split Wall",
    "Unidad Paquete (Rooftop)",
    "Chiller (Enfriador de Agua)",
    "Equipo Fancoil Integrado",
    "Sistema VRF (Flujo Var. Refrigerante)",
    "Manejadora de Aire (AHU)",
    "Torre de Enfriamiento"
  ],
  brands: [
    "Carrier",
    "Daikin",
    "Trane",
    "York",
    "LG Electronics",
    "Lennox",
    "Rheem",
    "Mitsubishi Electric",
    "Midea"
  ],
  refrigerants: [
    "R-410A",
    "R-22",
    "R-134a",
    "R-404A",
    "R-407C",
    "R-32",
    "R-454B"
  ],
  techs: [
    "Ing. Carlos Mendoza",
    "Téc. Nelson Bravo",
    "Téc. Alejandro Ruiz",
    "Téc. Sofía Espinoza"
  ],
  logo: "",
  clientRecords: [],
};
