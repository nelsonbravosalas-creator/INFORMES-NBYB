import { InspectionChecklistItem, AdminSettings } from "./types";

export const DEFAULT_CHECKLIST_TEMPLATE: InspectionChecklistItem[] = [
  // Categoría: Filtros y Limpieza
  {
    id: "chk_filters",
    category: "Filtros y Limpieza",
    label: "Limpieza o reemplazo de filtros de aire",
    status: "cumple",
    images: [],
    notes: ""
  },
  {
    id: "chk_evap_coil",
    category: "Filtros y Limpieza",
    label: "Lavado y desinfección de serpentín evaporador",
    status: "cumple",
    images: [],
    notes: ""
  },
  {
    id: "chk_cond_coil",
    category: "Filtros y Limpieza",
    label: "Lavado a presión de serpentín condensador",
    status: "cumple",
    images: [],
    notes: ""
  },
  {
    id: "chk_drain_pan",
    category: "Filtros y Limpieza",
    label: "Limpieza y desobstrucción de bandeja y línea de condensados",
    status: "cumple",
    images: [],
    notes: ""
  },
  
  // Categoría: Sistema Eléctrico
  {
    id: "chk_elec_conn",
    category: "Sistema Eléctrico",
    label: "Reajuste de bornes y terminales de fuerza/control",
    status: "cumple",
    images: [],
    notes: ""
  },
  {
    id: "chk_contactors",
    category: "Sistema Eléctrico",
    label: "Estado físico de platinos y contactores principales",
    status: "cumple",
    images: [],
    notes: ""
  },
  {
    id: "chk_sensors",
    category: "Sistema Eléctrico",
    label: "Calibración y lectura de sensores de temperatura",
    status: "cumple",
    images: [],
    notes: ""
  },

  // Categoría: Sistema Mecánico y Refrigeración
  {
    id: "chk_refrig_fuga",
    category: "Mecánico y Refrigeración",
    label: "Inspección de fugas de gas refrigerante",
    status: "cumple",
    images: [],
    notes: ""
  },
  {
    id: "chk_insulation",
    category: "Mecánico y Refrigeración",
    label: "Estado de aislamiento térmico en tuberías de succión",
    status: "cumple",
    images: [],
    notes: ""
  },
  {
    id: "chk_fan_motors",
    category: "Mecánico y Refrigeración",
    label: "Alineación de poleas, bandas y lubricación de motores",
    status: "cumple",
    images: [],
    notes: ""
  },
  {
    id: "chk_vibration",
    category: "Mecánico y Refrigeración",
    label: "Ausencia de ruidos extraños o vibración excesiva",
    status: "cumple",
    images: [],
    notes: ""
  }
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
